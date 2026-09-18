type SignalingLike = {
  send: (obj: Record<string, unknown>) => void
  disconnectFromSensor: (sensorId: string | number) => void
}

export type WebRTCHandlers = {
  onDataChannelOpen?: () => void
  onDataChannelClosed?: () => void
  onDataChannelMessage?: (data: ArrayBuffer | Blob | string) => void
  onError?: (err: unknown) => void
  onAudioStream?: (stream: MediaStream) => void
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:coturn.specscape.org' },
    {
      urls: 'turn:coturn.specscape.org',
      username: 'esense',
      credential: 'esense',
    },
  ],
}

/** Minimal gateway keep-alive (Angular uses binary encodeCmd; text JSON works for status). */
function keepAlivePayload() {
  return JSON.stringify({
    target: 'gateway',
    gain: 0,
    decoder: -1,
    decoder_settings: null,
    fs: 0,
    fc: 0,
  })
}

/**
 * WebRTC peer + Janus data channel (ported from Angular streaming/webrtc.js).
 */
export class WebRTCConnection {
  private signaling: SignalingLike
  private handlers: WebRTCHandlers
  private pc: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private sensorId: string | number | null = null
  private answerHasBeenSent = false
  private iceCandidates: (RTCIceCandidate | null)[] = []
  private keepAliveTimer: number | null = null
  private dataChannelTimeout: number | null = null
  private audioEl: HTMLAudioElement | null = null

  constructor(signaling: SignalingLike, handlers: WebRTCHandlers = {}) {
    this.signaling = signaling
    this.handlers = handlers
  }

  setAudioPlayer(el: HTMLAudioElement | null) {
    this.audioEl = el
  }

  connectToSensor(sensorId: string | number) {
    this.sensorId = sensorId
    this.answerHasBeenSent = false
    this.iceCandidates = []
    this.signaling.send({ fn: 'requestOffer', sensorId })
  }

  handleConnectionOffer(msg: {
    offer?: string
    sensorId?: string | number
  }) {
    void this.createConnectionAnswer(msg)
  }

  handleIceCandidate(msg: { candidate?: RTCIceCandidateInit }) {
    if (!this.pc || !msg.candidate?.sdpMid) return
    void this.pc.addIceCandidate(msg.candidate)
  }

  private async createConnectionAnswer(msg: {
    offer?: string
    sensorId?: string | number
  }) {
    if (!msg.offer) {
      this.handlers.onError?.('Missing SDP offer')
      return
    }

    this.closePeerOnly()
    this.pc = new RTCPeerConnection(ICE_CONFIG)
    this.pc.onicecandidate = (event) => this.onIceCandidate(event)
    this.pc.ontrack = (event) => {
      const stream = event.streams[0]
      if (this.audioEl) {
        this.audioEl.srcObject = stream
        void this.audioEl.play().catch(() => undefined)
      }
      this.handlers.onAudioStream?.(stream)
    }

    this.connectDataChannel()

    try {
      await this.pc.setRemoteDescription({ type: 'offer', sdp: msg.offer })
      const answer = await this.pc.createAnswer()
      await this.pc.setLocalDescription(answer)
      this.signaling.send({
        fn: 'connectionAnswer',
        sensorId: msg.sensorId ?? this.sensorId,
        answer: answer.sdp,
      })
      this.answerHasBeenSent = true
      this.flushIceCandidates()
    } catch (err) {
      this.handlers.onError?.(err)
    }
  }

  private onIceCandidate(event: RTCPeerConnectionIceEvent) {
    this.iceCandidates.push(event.candidate)
    if (!this.answerHasBeenSent) return
    this.flushIceCandidates()
  }

  private flushIceCandidates() {
    for (const candidate of this.iceCandidates) {
      this.signaling.send({
        fn: 'iceCandidateForSensor',
        sensorId: this.sensorId,
        candidate,
      })
    }
    this.iceCandidates = []
  }

  private connectDataChannel() {
    if (!this.pc) return
    if (this.dataChannelTimeout != null) {
      window.clearTimeout(this.dataChannelTimeout)
    }
    this.dataChannelTimeout = window.setTimeout(() => {
      this.handlers.onError?.('timeout waiting for data channel')
      this.closeDataChannel()
    }, 10_000)

    this.dataChannel = this.pc.createDataChannel('JanusDataChannel', {
      ordered: true,
    })
    this.dataChannel.onmessage = (message) => {
      const data = message.data as ArrayBuffer | Blob | string
      this.handlers.onDataChannelMessage?.(data)
    }
    this.dataChannel.onopen = () => {
      if (this.dataChannelTimeout != null) {
        window.clearTimeout(this.dataChannelTimeout)
        this.dataChannelTimeout = null
      }
      if (this.keepAliveTimer != null) window.clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = window.setInterval(() => {
        this.send(keepAlivePayload())
      }, 1000)
      this.handlers.onDataChannelOpen?.()
    }
    this.dataChannel.onclose = () => {
      if (this.keepAliveTimer != null) {
        window.clearInterval(this.keepAliveTimer)
        this.keepAliveTimer = null
      }
      this.handlers.onDataChannelClosed?.()
    }
    this.dataChannel.onerror = (err) => {
      this.handlers.onError?.(err)
      this.closeDataChannel()
    }
  }

  send(msg: string) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return
    this.dataChannel.send(msg)
  }

  closeDataChannel() {
    if (this.sensorId != null) {
      this.signaling.disconnectFromSensor(this.sensorId)
    }
    if (this.dataChannel) {
      try {
        this.dataChannel.close()
      } catch {
        /* ignore */
      }
      this.dataChannel = null
    }
    if (this.audioEl?.srcObject instanceof MediaStream) {
      this.audioEl.srcObject.getTracks().forEach((t) => t.stop())
      this.audioEl.srcObject = null
    }
    this.closePeerOnly()
  }

  private closePeerOnly() {
    if (this.keepAliveTimer != null) {
      window.clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = null
    }
    if (this.dataChannelTimeout != null) {
      window.clearTimeout(this.dataChannelTimeout)
      this.dataChannelTimeout = null
    }
    if (this.pc) {
      this.pc.close()
      this.pc = null
    }
  }

  dispose() {
    this.closeDataChannel()
  }
}
