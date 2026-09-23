import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Sensor } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import LeafletMap, { type MapMarker } from '../components/LeafletMap'
import { LiveWaterfall } from '../components/LiveWaterfall'
import { decodeData, encodeCmd } from '../streaming/deser'
import { Signaling, type SensorStatusMap } from '../streaming/Signaling'
import { WebRTCConnection } from '../streaming/WebRTCConnection'

/** Sensor annotated with its live rtc status, mirroring joinSensorInfo()'s joinedSensorInfo. */
type JoinedSensor = Sensor & { rtcStatus?: string }

const TABS = ['FM Radio', 'AM Radio', 'ADS-B', 'AIS', 'ACARS', 'LTE', 'IoT', 'LoRa', 'WiFi'] as const
type Tab = (typeof TABS)[number]

const MODE_TO_DECODER: Record<Tab, number> = {
  'FM Radio': 1,
  'AM Radio': 2,
  'ADS-B': 3,
  AIS: 4,
  ACARS: 5,
  LTE: 6,
  IoT: 7,
  LoRa: 8,
  WiFi: 9,
}

function resolveWssUri(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const obj = payload as Record<string, unknown>
  const uri = obj.wssUri ?? obj.uri ?? obj.url
  return typeof uri === 'string' && uri.length > 0 ? uri : null
}

function sensorCoords(s: Sensor): { lat: number; lon: number } | null {
  const lat = Number(s.position?.latitude ?? s.latitude)
  const lon = Number(s.position?.longitude ?? s.longitude)
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon }
  return null
}

/** Visual chrome ported from streaming.html; WebRTC/signaling logic unchanged. */
export default function SpectrumDecoderPage() {
  const { jwt } = useAuth()
  const signalingRef = useRef<Signaling | null>(null)
  const webrtcRef = useRef<WebRTCConnection | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** Bumped on every (re)connect/teardown so stale async callbacks (e.g. from
   * StrictMode's mount-cleanup-remount in dev) can't clobber state after a
   * newer connection attempt has superseded them. */
  const generationRef = useRef(0)

  const [wssUri, setWssUri] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('FM Radio')
  const [freqMhz, setFreqMhz] = useState('101.0')
  const [antennaGain, setAntennaGain] = useState(0)

  /** Mirrors $ctrl.signalingStatus: gates the whole page behind an overlay until connected. */
  const [signalingStatus, setSignalingStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting')
  const [webrtcStatus, setWebrtcStatus] = useState<
    'disconnected' | 'connecting' | 'answering' | 'requesting' | 'connected' | 'declined' | 'error'
  >('disconnected')
  /** Full sensor catalog (name/position/etc.) fetched once via api.getSensors(), keyed by serial. */
  const [sensorInfo, setSensorInfo] = useState<Record<string, Sensor>>({})
  /** Sensor id -> rtc status, as last received from the signaling `sensors` message. */
  const [sensorStatus, setSensorStatus] = useState<SensorStatusMap>({})
  const [selectedSensor, setSelectedSensor] = useState<string | number | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [psdLine, setPsdLine] = useState<number[] | null>(null)
  const [psdBand, setPsdBand] = useState<{ min: number; max: number }>({
    min: 99.8e6,
    max: 102.2e6,
  })
  const [decoderMsgs, setDecoderMsgs] = useState<
    { id: number; at: number; summary: string }[]
  >([])

  // Auto-connect to signaling on mount, mirroring streaming.js's constructor:
  // this.esApiService.getSensors().then(sensors => { ...; this.initializeSignaling() }).
  // There is no manual "connect" step in the original.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.getSensors().catch(() => [] as Sensor[])
        if (cancelled) return
        const info: Record<string, Sensor> = {}
        for (const s of list ?? []) {
          if (s.serial != null) info[String(s.serial)] = s
        }
        setSensorInfo(info)

        const res = await api.getSignalingWssUri()
        const uri = resolveWssUri(res)
        if (cancelled) return
        setWssUri(uri)
        if (uri) connectSignaling(uri)
        else {
          setSignalingStatus('disconnected')
          setError('Signaling URI is not available.')
        }
      } catch {
        if (!cancelled) {
          setSignalingStatus('disconnected')
          setError('Could not resolve signaling URI (API may be offline).')
        }
      }
    })()
    return () => {
      cancelled = true
      generationRef.current++
      webrtcRef.current?.dispose()
      webrtcRef.current = null
      signalingRef.current?.close()
      signalingRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function attachWebrtc(signaling: Signaling, isCurrent: () => boolean) {
    const rtc = new WebRTCConnection(signaling, {
      onDataChannelOpen: () => {
        if (!isCurrent()) return
        setWebrtcStatus('connected')
        retune(rtc)
      },
      onDataChannelClosed: () => isCurrent() && setWebrtcStatus('disconnected'),
      onDataChannelMessage: (data) => {
        void decodeData(data).then((msg) => {
          if (!msg || !isCurrent()) return
          if (msg.id === 1 && msg.payload && typeof msg.payload === 'object') {
            const p = msg.payload as { data: number[]; minFreq: number; maxFreq: number }
            setPsdLine(p.data)
            setPsdBand({ min: p.minFreq, max: p.maxFreq })
          } else if (msg.id >= 2 && msg.id <= 5) {
            const summary =
              typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload)
            setDecoderMsgs((prev) =>
              [{ id: msg.id, at: Date.now(), summary: summary.slice(0, 240) }, ...prev].slice(0, 50),
            )
          }
        })
      },
      onError: (err) => {
        if (!isCurrent()) return
        setError(String(err))
        setWebrtcStatus('error')
      },
      onAudioStream: () => {},
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
        gain: antennaGain * 1000,
        decoder: MODE_TO_DECODER[tab],
        decoder_settings: { gain: antennaGain * 1000 },
        fs: 2_400_000,
        fc,
      }),
    )
  }

  function connectSignaling(uri: string) {
    setError(null)
    if (!jwt) {
      setSignalingStatus('disconnected')
      setError('Missing auth token. Sign in again to refresh your JWT.')
      return
    }

    signalingRef.current?.close()
    webrtcRef.current?.dispose()

    const myGeneration = ++generationRef.current
    const isCurrent = () => generationRef.current === myGeneration

    setSignalingStatus('connecting')

    const signaling = new Signaling(jwt, {
      onConnected: () => isCurrent() && setSignalingStatus('connected'),
      onDisconnected: () => {
        if (!isCurrent()) return
        setSignalingStatus('disconnected')
        setSensorStatus({})
        setWebrtcStatus('disconnected')
      },
      onSensors: (statusMap) => {
        if (!isCurrent()) return
        setSensorStatus(statusMap ?? {})
      },
      onSensorStatus: (msg) => {
        if (!isCurrent() || msg.sensorId == null) return
        setSensorStatus((prev) => ({
          ...prev,
          [String(msg.sensorId)]: msg.status ?? prev[String(msg.sensorId)],
        }))
      },
      onAuthenticationFailed: () => isCurrent() && setError('Signaling authentication failed.'),
      onConnectionOffer: (msg) => {
        if (!isCurrent()) return
        webrtcRef.current?.handleConnectionOffer(
          msg as { offer?: string; sensorId?: string | number },
        )
        setWebrtcStatus('answering')
      },
      onIceCandidateForClient: (msg) => {
        if (!isCurrent()) return
        webrtcRef.current?.handleIceCandidate(msg as { candidate?: RTCIceCandidateInit })
      },
      onConnectionDeclined: () => {
        if (!isCurrent()) return
        setWebrtcStatus('disconnected')
        setError('Could not connect to sensor')
      },
      onConnectionClose: () => {
        if (!isCurrent()) return
        setWebrtcStatus('disconnected')
        setError('Session has been closed by server')
      },
    })

    signalingRef.current = signaling
    attachWebrtc(signaling, isCurrent)
    signaling.connect(uri).catch((err) => {
      if (!isCurrent()) return
      setSignalingStatus('disconnected')
      setError(`Could not open signaling connection: ${String(err)}`)
    })
  }

  function connectToSensor(serial: string | number) {
    setError(null)
    setSelectedSensor(serial)
    setWebrtcStatus('connecting')
    webrtcRef.current?.setAudioPlayer(audioRef.current)
    webrtcRef.current?.connectToSensor(serial)
  }

  function retryConnectSignaling() {
    if (wssUri) connectSignaling(wssUri)
  }

  function disconnect() {
    if (!selectedSensor) return
    webrtcRef.current?.dispose()
    setSelectedSensor(null)
    setWebrtcStatus('disconnected')
  }

  /** Mirrors joinSensorInfo(): full sensor catalog annotated with live rtc status. */
  const joinedSensorInfo: JoinedSensor[] = useMemo(
    () =>
      Object.entries(sensorInfo).map(([serial, s]) => ({
        ...s,
        rtcStatus: sensorStatus[serial],
      })),
    [sensorInfo, sensorStatus],
  )

  const markers: MapMarker[] = useMemo(
    () =>
      joinedSensorInfo.reduce<MapMarker[]>((acc, s) => {
        const coords = sensorCoords(s)
        if (!coords) return acc
        acc.push({
          id: String(s.serial ?? ''),
          lat: coords.lat,
          lon: coords.lon,
          label: s.name ? String(s.name) : undefined,
        })
        return acc
      }, []),
    [joinedSensorInfo],
  )

  const filteredNames = useMemo(() => {
    if (!searchValue) return []
    const q = searchValue.toLowerCase()
    return joinedSensorInfo
      .filter(
        (s) =>
          typeof s.name === 'string' &&
          s.name.toLowerCase().includes(q) &&
          s.rtcStatus === 'ready',
      )
      .slice(0, 15)
  }, [searchValue, joinedSensorInfo])

  const selectedName =
    selectedSensor != null
      ? sensorInfo[String(selectedSensor)]?.name ?? `[${selectedSensor}]`
      : ''

  return (
    <>
      <div className="container-fluid">
      <h1>Spectrum Decoder</h1>

      <div id="sensor-status" className="panel panel-default">
        <div className="panel-heading">
          {webrtcStatus === 'connected' ? (
            <button className="btn btn-danger btn-xs" type="button" onClick={disconnect}>
              Disconnect
            </button>
          ) : null}

          {webrtcStatus === 'disconnected' ? <span>Select a sensor to connect to</span> : null}
          {webrtcStatus === 'connecting' || webrtcStatus === 'answering' || webrtcStatus === 'requesting' ? (
            <span>Connecting to {selectedName}...</span>
          ) : null}
          {webrtcStatus === 'connected' ? <span>Connected to {selectedName}</span> : null}
        </div>

        {webrtcStatus !== 'connected' ? (
          <div className="panel-body">
            {joinedSensorInfo.length > 0 ? (
              <form className="form-inline streaming-form" style={{ position: 'relative' }}>
                <label htmlFor="sensor-search">Search Sensor</label>
                <div className="form-group" style={{ marginLeft: 8, position: 'relative' }}>
                  <input
                    className="form-control input-sm"
                    id="sensor-search"
                    name="sensor-search"
                    type="search"
                    placeholder="Sensor name"
                    autoComplete="off"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                  {filteredNames.length > 0 ? (
                    <ul
                      className="dropdown-menu"
                      style={{ display: 'block', position: 'absolute', top: '100%', left: 0 }}
                    >
                      {filteredNames.map((s) => (
                        <li key={String(s.serial)}>
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              setSearchValue(String(s.name))
                              connectToSensor(s.serial ?? '')
                            }}
                          >
                            {String(s.name)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="form-group" style={{ marginLeft: 8 }}>
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={webrtcStatus === 'connecting'}
                    onClick={() => {
                      const match = joinedSensorInfo.find((s) => s.name === searchValue)
                      if (match?.serial != null) connectToSensor(match.serial)
                    }}
                  >
                    Connect
                  </button>
                </div>
              </form>
            ) : null}

            {error ? (
              <div className="alert alert-warning" role="alert">
                <p>{error}</p>
              </div>
            ) : null}

            {webrtcStatus === 'disconnected' ? (
              <LeafletMap
                markers={markers}
                height={420}
                onMarkerClick={(m) => connectToSensor(m.id)}
                fitToMarkers
              />
            ) : null}

            {webrtcStatus === 'connecting' ? (
              <div className="text-center" style={{ padding: '2em' }}>
                <h3>Connecting...</h3>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {webrtcStatus === 'connected' ? (
        <div id="decoding-controls" style={{ position: 'relative' }}>
          <LiveWaterfall line={psdLine} minFreq={psdBand.min} maxFreq={psdBand.max} />
          {!psdLine ? <p className="muted">Waiting for PSD frames on the data channel…</p> : null}

          <div className="row" style={{ marginTop: 25 }}>
            <div className="col-sm-2">Center Frequency:</div>
            <div className="col-sm-7">
              <input
                type="range"
                min={0}
                max={6000}
                value={Number(freqMhz) || 0}
                onChange={(e) => setFreqMhz(e.target.value)}
                onMouseUp={() => retune()}
                onTouchEnd={() => retune()}
                style={{ width: '100%' }}
              />
            </div>
            <div className="col-sm-3">
              <input
                type="number"
                className="form-control input-sm"
                value={freqMhz}
                onChange={(e) => setFreqMhz(e.target.value)}
                onBlur={() => retune()}
              />{' '}
              MHz
            </div>
          </div>

          <div className="row" style={{ marginTop: 15 }}>
            <div className="col-sm-2">Antenna Gain:</div>
            <div className="col-sm-7">
              <input
                type="range"
                min={0}
                max={49}
                value={antennaGain}
                onChange={(e) => setAntennaGain(Number(e.target.value))}
                onMouseUp={() => retune()}
                onTouchEnd={() => retune()}
                style={{ width: '100%' }}
              />
            </div>
            <div className="col-sm-3">
              {antennaGain === 0 ? <span>Auto</span> : <span>{antennaGain}dB</span>}
            </div>
          </div>

          <audio ref={audioRef} id="audio" autoPlay controls className="hidden" />

          <ul className="nav nav-tabs" style={{ marginTop: 20 }}>
            {TABS.map((t) => (
              <li key={t} role="presentation" className={tab === t ? 'active' : ''}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setTab(t)
                    retune()
                  }}
                >
                  {t}
                </a>
              </li>
            ))}
          </ul>

          <div className="tab-content" style={{ padding: '1em 0' }}>
            {tab === 'ADS-B' || tab === 'AIS' ? (
              <div>
                <p className="muted">Decoder messages ({tab})</p>
                {decoderMsgs.length === 0 ? (
                  <p className="muted">No frames yet.</p>
                ) : (
                  decoderMsgs.map((m, i) => (
                    <table
                      className="table table-condensed"
                      key={`${m.at}-${i}`}
                      style={{ border: '1px solid #ccc' }}
                    >
                      <tbody>
                        <tr className="text-muted">
                          <td colSpan={3}>
                            {new Date(m.at).toLocaleTimeString()} — id {m.id}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={3}>
                            <code style={{ wordBreak: 'break-all' }}>{m.summary}</code>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ))
                )}
              </div>
            ) : (
              <p className="muted">
                {tab} decoding runs on the connected sensor; live output for this mode is
                not modeled here yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
      </div>

      {signalingStatus !== 'connected' ? (
        <div
          className="text-center"
          style={{
            width: '100%',
            height: '100%',
            position: 'fixed',
            top: 0,
            left: 0,
            background: 'rgba(255,255,255,0.9)',
            zIndex: 1000,
            padding: '10%',
          }}
        >
          {signalingStatus === 'connecting' ? (
            <div style={{ width: '100%' }}>
              <h2 className="text-info">Connecting Backend...</h2>
            </div>
          ) : null}

          {signalingStatus === 'disconnected' ? (
            <div style={{ width: '100%' }}>
              <h2 className="text-danger">Disconnected</h2>
              <p>
                The control connection to the backend is unavailable. There might be an
                error on our side. You can retry, refresh the page or come back later.
              </p>
              <button className="btn btn-warning" type="button" onClick={retryConnectSignaling}>
                Retry
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
