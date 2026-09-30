export type SignalingSensor = {
  id?: string | number
  serial?: string | number
  name?: string
  [key: string]: unknown
}

/** Sensor id -> rtc status string (e.g. "offline"/"ready"/"clientConnected"/"campaignRunning"). */
export type SensorStatusMap = Record<string, string>

type SignalingHandlers = {
  onConnected?: () => void
  onDisconnected?: () => void
  /** `sensors` message payload: { [sensorId]: status }, not a list. */
  onSensors?: (sensors: SensorStatusMap) => void
  onSensorStatus?: (msg: { sensorId?: string | number; status?: string }) => void
  onCoinsReport?: (coins: number) => void
  onAuthenticationFailed?: () => void
  onConnectionOffer?: (msg: { offer?: string; sensorId?: string | number }) => void
  onIceCandidateForClient?: (msg: { candidate?: RTCIceCandidateInit | null }) => void
  onConnectionClose?: (sensorId: unknown) => void
  onConnectionDeclined?: (msg: unknown) => void
}

/**
 * WebSocket signaling client (ported from Angular streaming/signaling.js).
 */
export class Signaling {
  private ws: WebSocket | null = null
  private timerId: number | null = null
  private token: string
  private handlers: SignalingHandlers

  /** Sensor id -> rtc status, as last received from the `sensors` message. */
  sensors: SensorStatusMap = {}

  constructor(token: string, handlers: SignalingHandlers = {}) {
    this.token = token
    this.handlers = handlers
  }

  async connect(wssUri: string) {
    this.close()
    let ws: WebSocket
    try {
      ws = new WebSocket(wssUri)
    } catch (err) {
      this.handlers.onDisconnected?.()
      throw err
    }
    this.ws = ws
    // events from a socket we already replaced (e.g. after Retry) are ignored
    ws.addEventListener('open', () => {
      if (this.ws !== ws) return
      this.authenticate(this.token)
      this.handlers.onConnected?.()
      this.timerId = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('')
      }, 20_000)
    })
    ws.addEventListener('message', (event) => {
      if (this.ws === ws) this.onmessage(event)
    })
    ws.addEventListener('close', () => {
      if (this.ws !== ws) return
      if (this.timerId != null) window.clearInterval(this.timerId)
      this.timerId = null
      this.ws = null
      this.handlers.onDisconnected?.()
    })
  }

  private onmessage(event: MessageEvent) {
    if (!event.data) return
    let msg: { fn?: string; [key: string]: unknown }
    try {
      msg = JSON.parse(String(event.data))
    } catch {
      return
    }

    switch (msg.fn) {
      case 'sensors':
        this.sensors = (msg.sensors as SensorStatusMap) ?? {}
        this.handlers.onSensors?.(this.sensors)
        break
      case 'connectionOffer':
        this.handlers.onConnectionOffer?.(msg as { offer?: string; sensorId?: string | number })
        break
      case 'iceCandidateForClient':
        this.handlers.onIceCandidateForClient?.(msg as { candidate?: RTCIceCandidateInit | null })
        break
      case 'sensorStatus':
        this.handlers.onSensorStatus?.(
          msg as { sensorId?: string | number; status?: string },
        )
        break
      case 'authResponse':
        if (msg.status === 'ok') {
          this.requestNumberOfCoins()
        } else {
          this.handlers.onAuthenticationFailed?.()
        }
        break
      case 'coinsReport':
        this.handlers.onCoinsReport?.(Number(msg.coins) || 0)
        break
      case 'connectionClose':
        this.handlers.onConnectionClose?.(msg.sensorId)
        break
      case 'connectionDeclined':
        this.handlers.onConnectionDeclined?.(msg)
        break
      default:
        break
    }
  }

  send(obj: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj))
  }

  authenticate(token: string) {
    this.send({ fn: 'authenticate', token })
  }

  requestNumberOfCoins() {
    this.send({ fn: 'coinsRequest' })
  }

  disconnectFromSensor(sensorId: string | number) {
    this.send({ fn: 'connectionClose', sensorId })
  }

  close() {
    if (this.timerId != null) {
      window.clearInterval(this.timerId)
      this.timerId = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
