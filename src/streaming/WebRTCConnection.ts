import { encodeCmd } from './deser'

type SignalingLike = {
  send: (obj: Record<string, unknown>) => void
  disconnectFromSensor: (sensorId: string | number) => void
}

export type WebRTCHandlers = {
  onDataChannelOpen?: () => void
  onDataChannelClosed?: () => void
  /** Frame as base64 text (Blob frames are resolved to their text first). */
  onDataChannelMessage?: (data: string) => void
  onError?: (err: unknown) => void
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:coturn.specscape.org' },
    { urls: 'turn:coturn.specscape.org', username: 'esense', credential: 'esense' },
  ],
}

/** WebRTC peer + Janus data channel (port of streaming/webrtc.js). */
export class WebRTCConnection {
  sensorId: string | null = null
  private signaling: SignalingLike
  private handlers: WebRTCHandlers
  private pc: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private answerHasBeenSent = false
  private iceCandidates: (RTCIceCandidate | null)[] = []
  private keepAliveTimer: number | null = null
  private dataChannelTimeout: number | null = null
  private audioPlayer: HTMLAudioElement | null = null

  constructor(signaling: SignalingLike, handlers: WebRTCHandlers = {}) {
    this.signaling = signaling
    this.handlers = handlers
  }

  setAudioPlayer(el: HTMLAudioElement | null) {
    this.audioPlayer = el
  }

  get isOpen() {
    return this.dataChannel?.readyState === 'open'
  }

  connectToSensor(sensorId: string) {
    this.sensorId = sensorId
    this.answerHasBeenSent = false
    this.iceCandidates = []
    this.signaling.send({ fn: 'requestOffer', sensorId })
  }

  /** Signaling `connectionOffer` → build the peer and answer it. */
  createConnectionAnswer(msg: { offer?: string; sensorId?: string | number }) {
    this.pc = new RTCPeerConnection(ICE_CONFIG)
    const pc = this.pc
    pc.onicecandidate = (event) => this.onicecandidate(event)
    pc.ontrack = (event) => {
      if (this.audioPlayer) this.audioPlayer.srcObject = event.streams[0]
    }

    this.connectDataChannel()

    pc.setRemoteDescription({ type: 'offer', sdp: msg.offer })
      .then(() => pc.createAnswer())
      .then((answer) => {
        void pc.setLocalDescription(answer)
        this.signaling.send({ fn: 'connectionAnswer', sensorId: msg.sensorId, answer: answer.sdp })
        this.answerHasBeenSent = true
        // send the ICE candidates queued while the answer was pending
        this.onicecandidate(null)
      })
      .catch((err) => this.handlers.onError?.(err))
  }

  /** Signaling `iceCandidateForClient`. */
  addIceCandidate(msg: { candidate?: RTCIceCandidateInit | null }) {
    if (msg.candidate?.sdpMid && this.pc) void this.pc.addIceCandidate(msg.candidate)
  }

  private onicecandidate(event: RTCPeerConnectionIceEvent | null) {
    if (event != null) this.iceCandidates.push(event.candidate)
    if (!this.answerHasBeenSent) return
    for (const candidate of this.iceCandidates) {
      this.signaling.send({ fn: 'iceCandidateForSensor', sensorId: this.sensorId, candidate })
    }
    this.iceCandidates = []
  }

  private connectDataChannel() {
    if (!this.pc) return
    this.dataChannelTimeout = window.setTimeout(
      () => this.onDataChannelError('timeout waiting for data channel'),
      10000,
    )
    // Janus expects this label.
    const dc = this.pc.createDataChannel('JanusDataChannel', { ordered: true })
    this.dataChannel = dc
    dc.onmessage = (message) => {
      const data = message.data as unknown
      if (data instanceof Blob) {
        void data.text().then((text) => this.handlers.onDataChannelMessage?.(text))
      } else if (typeof data === 'string') {
        this.handlers.onDataChannelMessage?.(data)
      } else if (data instanceof ArrayBuffer) {
        this.handlers.onDataChannelMessage?.(new TextDecoder('utf8').decode(data))
      }
    }
    dc.onopen = () => {
      if (this.dataChannelTimeout != null) window.clearTimeout(this.dataChannelTimeout)
      if (this.keepAliveTimer != null) window.clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = window.setInterval(() => {
        this.send(encodeCmd({ target: 'gateway', gain: 0, decoder: -1, decoder_settings: null, fs: 0, fc: 0 }))
      }, 1000)
      this.handlers.onDataChannelOpen?.()
    }
    dc.onclose = () => this.onDataChannelClose()
    dc.onerror = (err) => this.onDataChannelError(err)
  }

  private onDataChannelClose() {
    if (this.keepAliveTimer != null) {
      window.clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = null
    }
    this.handlers.onDataChannelClosed?.()
  }

  private onDataChannelError(err: unknown) {
    this.closeDataChannel()
    this.handlers.onError?.(err)
  }

  send(msg: string) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return
    this.dataChannel.send(msg)
  }

  closeDataChannel() {
    if (this.dataChannelTimeout != null) {
      window.clearTimeout(this.dataChannelTimeout)
      this.dataChannelTimeout = null
    }
    if (this.sensorId != null) this.signaling.disconnectFromSensor(this.sensorId)
    if (this.dataChannel) {
      this.send(
        encodeCmd({
          target: 'es_sensor',
          gain: 0,
          decoder: -1,
          decoder_settings: null,
          fn: 'connectionClose',
          fs: 0,
          fc: 0,
        }),
      )
      const dc = this.dataChannel
      dc.onclose = null
      dc.close()
      this.dataChannel = null
      // the legacy code fires onclose manually
      this.onDataChannelClose()
    }
    const src = this.audioPlayer?.srcObject
    if (src instanceof MediaStream) src.getTracks().forEach((t) => t.stop())
    this.pc?.close()
    this.pc = null
  }
}
