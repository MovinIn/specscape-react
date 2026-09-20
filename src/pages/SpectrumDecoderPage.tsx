import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { LiveWaterfall } from '../components/LiveWaterfall'
import PageHeader from '../components/PageHeader'
import { sensorOptions } from '../lib/spectrum'
import { decodeData, encodeCmd } from '../streaming/deser'
import { Signaling, type SignalingSensor } from '../streaming/Signaling'
import { WebRTCConnection } from '../streaming/WebRTCConnection'

const MODES = ['FM', 'AM', 'ADS-B', 'AIS'] as const

const MODE_TO_DECODER: Record<(typeof MODES)[number], number> = {
  FM: 1,
  AM: 2,
  'ADS-B': 3,
  AIS: 4,
}

function resolveWssUri(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const obj = payload as Record<string, unknown>
  const uri = obj.wssUri ?? obj.uri ?? obj.url
  return typeof uri === 'string' && uri.length > 0 ? uri : null
}

export default function SpectrumDecoderPage() {
  const { jwt } = useAuth()
  const signalingRef = useRef<Signaling | null>(null)
  const webrtcRef = useRef<WebRTCConnection | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [wssUri, setWssUri] = useState<string | null>(null)
  const [mode, setMode] = useState<(typeof MODES)[number]>('FM')
  const [freqMhz, setFreqMhz] = useState('101.0')
  const [connected, setConnected] = useState(false)
  const [webrtcStatus, setWebrtcStatus] = useState('disconnected')
  const [authOk, setAuthOk] = useState<boolean | null>(null)
  const [coins, setCoins] = useState<number | null>(null)
  const [sensors, setSensors] = useState<SignalingSensor[]>([])
  const [selectedSensor, setSelectedSensor] = useState('')
  const [status, setStatus] = useState('Idle')
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [psdLine, setPsdLine] = useState<number[] | null>(null)
  const [psdBand, setPsdBand] = useState<{ min: number; max: number }>({
    min: 99.8e6,
    max: 102.2e6,
  })
  const [decoderMsgs, setDecoderMsgs] = useState<
    { id: number; at: number; summary: string }[]
  >([])

  function pushLog(line: string) {
    setLog((prev) => [line, ...prev].slice(0, 40))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.getSignalingWssUri()
        if (!cancelled) setWssUri(resolveWssUri(res))
      } catch {
        if (!cancelled) {
          setError(
            'Could not resolve signaling URI (API may be offline — connect when WSS is available).',
          )
        }
      }
    })()
    return () => {
      cancelled = true
      webrtcRef.current?.dispose()
      webrtcRef.current = null
      signalingRef.current?.close()
      signalingRef.current = null
    }
  }, [])

  function attachWebrtc(signaling: Signaling) {
    const rtc = new WebRTCConnection(signaling, {
      onDataChannelOpen: () => {
        setWebrtcStatus('connected')
        pushLog('Data channel open')
        retune(rtc)
      },
      onDataChannelClosed: () => {
        setWebrtcStatus('disconnected')
        pushLog('Data channel closed')
      },
      onDataChannelMessage: (data) => {
        void decodeData(data).then((msg) => {
          if (!msg) return
          if (msg.id === 1 && msg.payload && typeof msg.payload === 'object') {
            const p = msg.payload as {
              data: number[]
              minFreq: number
              maxFreq: number
            }
            setPsdLine(p.data)
            setPsdBand({ min: p.minFreq, max: p.maxFreq })
          } else if (msg.id >= 2 && msg.id <= 5) {
            const summary =
              typeof msg.payload === 'string'
                ? msg.payload
                : JSON.stringify(msg.payload)
            setDecoderMsgs((prev) =>
              [{ id: msg.id, at: Date.now(), summary: summary.slice(0, 240) }, ...prev].slice(
                0,
                50,
              ),
            )
          } else {
            pushLog(`RX id=${msg.id} ${JSON.stringify(msg.payload).slice(0, 100)}`)
          }
        })
      },
      onError: (err) => {
        setError(String(err))
        setWebrtcStatus('error')
      },
      onAudioStream: () => {
        pushLog('Audio track received')
      },
    })
    rtc.setAudioPlayer(audioRef.current)
    webrtcRef.current = rtc
    return rtc
  }

  function retune(rtc: WebRTCConnection = webrtcRef.current!) {
    if (!rtc) return
    const fc = Math.round(Number(freqMhz) * 1_000_000)
    if (!Number.isFinite(fc)) return
    rtc.send(
      encodeCmd({
        target: 'es_sensor',
        gain: 8000,
        decoder: MODE_TO_DECODER[mode],
        decoder_settings: { gain: 8000 },
        fs: 2_400_000,
        fc,
      }),
    )
    pushLog(`Retune ${freqMhz} MHz · ${mode}`)
  }

  function connect() {
    setError(null)
    if (!wssUri) {
      setError('Signaling URI is not available.')
      return
    }
    if (!jwt) {
      setError('Missing auth token. Sign in again to refresh your JWT.')
      return
    }

    signalingRef.current?.close()
    webrtcRef.current?.dispose()

    const signaling = new Signaling(jwt, {
      onConnected: () => {
        setConnected(true)
        setStatus('Connected — authenticating…')
      },
      onDisconnected: () => {
        setConnected(false)
        setAuthOk(null)
        setWebrtcStatus('disconnected')
        setStatus('Disconnected')
      },
      onSensors: (list) => {
        setAuthOk(true)
        setSensors(list)
        setStatus(`Connected — ${list.length} sensor(s) available`)
      },
      onCoinsReport: (c) => {
        setAuthOk(true)
        setCoins(c)
      },
      onAuthenticationFailed: () => {
        setAuthOk(false)
        setError('Signaling authentication failed.')
        setStatus('Auth failed')
      },
      onConnectionOffer: (msg) => {
        webrtcRef.current?.handleConnectionOffer(
          msg as { offer?: string; sensorId?: string | number },
        )
        setWebrtcStatus('answering')
        pushLog('Received connection offer')
      },
      onIceCandidateForClient: (msg) => {
        webrtcRef.current?.handleIceCandidate(
          msg as { candidate?: RTCIceCandidateInit },
        )
      },
      onConnectionDeclined: (msg) => {
        setError(`Connection declined: ${JSON.stringify(msg)}`)
        setWebrtcStatus('declined')
      },
      onConnectionClose: () => {
        setWebrtcStatus('disconnected')
        pushLog('Sensor connection closed')
      },
    })

    signalingRef.current = signaling
    attachWebrtc(signaling)
    setStatus('Connecting…')
    setAuthOk(null)
    void signaling.connect(wssUri)
  }

  function disconnect() {
    webrtcRef.current?.dispose()
    webrtcRef.current = null
    signalingRef.current?.close()
    signalingRef.current = null
    setConnected(false)
    setSensors([])
    setCoins(null)
    setAuthOk(null)
    setWebrtcStatus('disconnected')
    setStatus('Disconnected')
  }

  function startStream() {
    setError(null)
    if (!signalingRef.current || !webrtcRef.current) {
      setError('Connect signaling first.')
      return
    }
    if (!selectedSensor) {
      setError('Select a sensor.')
      return
    }
    setWebrtcStatus('requesting')
    pushLog(`Requesting offer from sensor ${selectedSensor}`)
    webrtcRef.current.setAudioPlayer(audioRef.current)
    webrtcRef.current.connectToSensor(selectedSensor)
  }

  function stopStream() {
    webrtcRef.current?.closeDataChannel()
    setWebrtcStatus('disconnected')
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="Live spectrum decoder"
        lead="WebRTC + signaling for FM, AM, ADS-B, and AIS streams."
      />

      <div className="prose panel stack">
        <p className="muted">
          Endpoint: {wssUri ? <code>{wssUri}</code> : <span>unavailable</span>}
        </p>
        <p className="muted">
          Signaling: {status}
          {coins !== null ? ` · coins: ${coins}` : ''}
          {authOk === true ? ' · authenticated' : ''}
        </p>
        <p className="muted">WebRTC: {webrtcStatus}</p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="stack form-grid">
        <div className="field">
          <label className="label" htmlFor="decode-mode">
            Mode
          </label>
          <select
            id="decode-mode"
            className="input"
            value={mode}
            onChange={(e) => setMode(e.target.value as (typeof MODES)[number])}
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="label" htmlFor="decode-freq">
            Frequency (MHz)
          </label>
          <input
            id="decode-freq"
            className="input"
            value={freqMhz}
            onChange={(e) => setFreqMhz(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="decode-sensor">
            Available sensors
          </label>
          <select
            id="decode-sensor"
            className="input"
            value={selectedSensor}
            onChange={(e) => setSelectedSensor(e.target.value)}
            disabled={!sensors.length}
          >
            <option value="">
              {sensors.length ? 'Select sensor…' : 'Connect to load sensors'}
            </option>
            {sensorOptions(sensors).map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="stack" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {!connected ? (
            <button type="button" className="btn btn-primary" onClick={connect}>
              Connect signaling
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={disconnect}>
              Disconnect
            </button>
          )}
          {webrtcStatus === 'connected' || webrtcStatus === 'answering' || webrtcStatus === 'requesting' ? (
            <button type="button" className="btn btn-danger" onClick={stopStream}>
              Stop stream
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={startStream}
              disabled={!connected}
            >
              Start {mode} stream
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => retune()}
            disabled={webrtcStatus !== 'connected'}
          >
            Retune
          </button>
        </div>
      </div>

      <div className="panel stack">
        <p className="muted">Live PSD waterfall</p>
        <LiveWaterfall
          line={psdLine}
          minFreq={psdBand.min}
          maxFreq={psdBand.max}
        />
        {!psdLine ? (
          <p className="muted">Waiting for PSD frames (id=1) on the data channel…</p>
        ) : null}
      </div>

      {(mode === 'ADS-B' || mode === 'AIS') && (
        <div className="panel">
          <p className="muted">Decoder messages ({mode})</p>
          {decoderMsgs.length === 0 ? (
            <p className="muted">No frames yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Id</th>
                    <th>Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {decoderMsgs.map((m, i) => (
                    <tr key={`${m.at}-${i}`}>
                      <td className="muted">
                        {new Date(m.at).toLocaleTimeString()}
                      </td>
                      <td>{m.id}</td>
                      <td>
                        <code style={{ wordBreak: 'break-all' }}>{m.summary}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="panel stack">
        <p className="muted">Audio sink</p>
        <audio ref={audioRef} controls autoPlay playsInline />
      </div>

      <div className="panel">
        <p className="muted">Event log</p>
        <pre
          className="prose"
          style={{ maxHeight: 200, overflow: 'auto', textAlign: 'left', fontSize: '0.85rem' }}
        >
          {log.length ? log.join('\n') : '—'}
        </pre>
      </div>
    </div>
  )
}
