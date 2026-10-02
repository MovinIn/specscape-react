import { PageHeader } from '../components/PageHeader'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { api } from '../api/client'
import type { Sensor } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { EsLeafletMap, type MapSensor } from '../components/EsLeafletMap'
import { RzSlider } from '../components/RzSlider'
import { EsSelFreq } from '../components/decoder/EsSelFreq'
import { Flightmap, type AircraftState, type FlightmapHandle } from '../components/decoder/Flightmap'
import { LivePowerLevels, type LivePowerLevelsHandle } from '../components/decoder/LivePowerLevels'
import { LiveWaterfall, type LiveWaterfallHandle } from '../components/decoder/LiveWaterfall'
import { printHzUnit } from '../lib/spectrum'
import { decodeData, encodeCmd, type PsdPayload } from '../streaming/deser'
import { Signaling, type SensorStatusMap } from '../streaming/Signaling'
import { WebRTCConnection } from '../streaming/WebRTCConnection'

// Most decoders use this sample rate; WiFi needs 20 MS/s.
const DEFAULT_SAMPLE_RATE = 2400000

type TabKey = 'fm' | 'am' | 'adsb' | 'ais' | 'acars' | 'lte' | 'iot' | 'lora' | 'wifi'

const TABS: { key: TabKey; heading: string }[] = [
  { key: 'fm', heading: 'FM Radio' },
  { key: 'am', heading: 'AM Radio' },
  { key: 'adsb', heading: 'ADS-B' },
  { key: 'ais', heading: 'AIS' },
  { key: 'acars', heading: 'ACARS' },
  { key: 'lte', heading: 'LTE' },
  { key: 'iot', heading: 'IoT' },
  { key: 'lora', heading: 'LoRa' },
  { key: 'wifi', heading: 'WiFi' },
]

/** streaming.js changeTab() settings per decoder tab. */
const TAB_SETTINGS: Record<
  TabKey,
  { controlsEnabled: boolean; decoder: number; defaultUnit: string; freq: number; fs: number; volume: boolean }
> = {
  fm: { controlsEnabled: true, decoder: 1, defaultUnit: '1000000', freq: 90500000, fs: DEFAULT_SAMPLE_RATE, volume: true },
  am: { controlsEnabled: true, decoder: 2, defaultUnit: '1000', freq: 970000, fs: DEFAULT_SAMPLE_RATE, volume: true },
  adsb: { controlsEnabled: false, decoder: 3, defaultUnit: '1000000', freq: 1090000000, fs: DEFAULT_SAMPLE_RATE, volume: false },
  ais: { controlsEnabled: false, decoder: 4, defaultUnit: '1000000', freq: 162000000, fs: DEFAULT_SAMPLE_RATE, volume: false },
  acars: { controlsEnabled: false, decoder: 5, defaultUnit: '1000000', freq: 131750000, fs: DEFAULT_SAMPLE_RATE, volume: false },
  lte: { controlsEnabled: true, decoder: 6, defaultUnit: '1000000', freq: 806000000, fs: DEFAULT_SAMPLE_RATE, volume: false },
  iot: { controlsEnabled: true, decoder: 7, defaultUnit: '1000000', freq: 433920000, fs: DEFAULT_SAMPLE_RATE, volume: false },
  lora: { controlsEnabled: true, decoder: 8, defaultUnit: '1000000', freq: 917000000, fs: DEFAULT_SAMPLE_RATE, volume: false },
  wifi: { controlsEnabled: true, decoder: 9, defaultUnit: '1000000', freq: 2412000000, fs: 20000000, volume: false },
}

/** FM/AM decoder gain from the 0–10 volume slider (streaming.js volume watch). */
const volumeGain = (v: number) => (v === 0 ? 0 : 12 * Math.exp(0.69077 * v))

type AcarsMsg = { timestamp?: number; tail?: string; flight?: string; channel?: number; freq?: number; level?: number; text?: string }
type LteCell = Record<string, string | number>
type TextMsg = { id: number; time?: number; payload: unknown }
type WifiMsg = { id: number; time?: number; payload: { bssid?: string; essid?: string; channel?: number; name?: string; signal?: number } }

/** AngularJS `date:'medium'`, e.g. "Sep 27, 2026 5:34:20 PM". */
function dateMedium(ms: number): string {
  const d = new Date(ms)
  const mon = d.toLocaleString('en-US', { month: 'short' })
  const h = d.getHours() % 12 || 12
  const p = (n: number) => String(n).padStart(2, '0')
  return `${mon} ${d.getDate()}, ${d.getFullYear()} ${h}:${p(d.getMinutes())}:${p(d.getSeconds())} ${d.getHours() < 12 ? 'AM' : 'PM'}`
}

/** uibTypeaheadHighlight: wrap the matched query in <strong>. */
function highlight(text: string, query: string) {
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (!query || i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <strong>{text.slice(i, i + query.length)}</strong>
      {text.slice(i + query.length)}
    </>
  )
}

/** Exact port of streaming.html / streaming.js (StreamingController). */
export default function SpectrumDecoderPage() {
  const { jwt, refreshJwt } = useAuth()
  const jwtRef = useRef(jwt)
  const refreshRef = useRef(refreshJwt)
  useEffect(() => {
    jwtRef.current = jwt
    refreshRef.current = refreshJwt
  })

  const signalingRef = useRef<Signaling | null>(null)
  const rtcRef = useRef<WebRTCConnection | null>(null)
  const wssUriRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const waterfallRef = useRef<LiveWaterfallHandle>(null)
  const powerRef = useRef<LivePowerLevelsHandle>(null)
  const adsbMapRef = useRef<FlightmapHandle>(null)
  const aisMapRef = useRef<FlightmapHandle>(null)

  const [signalingStatus, setSignalingStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [webrtcStatus, setWebrtcStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [sensorInfo, setSensorInfo] = useState<Record<string, Sensor>>({})
  const [sensorStates, setSensorStates] = useState<SensorStatusMap>({})
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [typeaheadOpen, setTypeaheadOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [panCenter, setPanCenter] = useState<[number, number] | null>(null)

  // tuning state; mirrored into cfgRef so the debounced retune sees it immediately
  const [activeTab, setActiveTab] = useState<TabKey>('fm')
  const [selectedFreq, setSelectedFreqState] = useState(TAB_SETTINGS.fm.freq)
  const [defaultUnit, setDefaultUnit] = useState(TAB_SETTINGS.fm.defaultUnit)
  const [controlsEnabled, setControlsEnabled] = useState(true)
  const [antennaGain, setAntennaGainState] = useState(44)
  const [volumeSliderVal, setVolumeState] = useState(8)
  const cfgRef = useRef({
    selectedFreq: TAB_SETTINGS.fm.freq,
    antennaGain: 44,
    decoder: TAB_SETTINGS.fm.decoder,
    sampleRate: DEFAULT_SAMPLE_RATE,
    volume: 8,
    hasVolume: true,
  })

  const [sliderWidth, setSliderWidth] = useState(0)
  const [thresholds, setThresholds] = useState({ upper: 0, lower: 1 })

  const [acarsMsgs, setAcarsMsgs] = useState<AcarsMsg[]>([])
  const [lteMsgs, setLteMsgs] = useState<TextMsg[]>([])
  const [lteResults, setLteResults] = useState<LteCell[]>([])
  const [iotMsgs, setIotMsgs] = useState<TextMsg[]>([])
  const [loraMsgs, setLoraMsgs] = useState<TextMsg[]>([])
  const [wifiMsgs, setWifiMsgs] = useState<WifiMsg[]>([])

  const retuneTimer = useRef<number | undefined>(undefined)

  /** Debounced (10 ms) retune: command to the sensor plus a clientEvent to the signaling server. */
  function retune() {
    window.clearTimeout(retuneTimer.current)
    retuneTimer.current = window.setTimeout(() => {
      const rtc = rtcRef.current
      if (!rtc || !rtc.isOpen) return
      const c = cfgRef.current
      const cmd = {
        target: 'es_sensor',
        gain: c.antennaGain,
        decoder: c.decoder,
        decoder_settings: c.hasVolume ? { gain: volumeGain(c.volume) } : null,
        fs: c.sampleRate,
        fc: c.selectedFreq,
      }
      rtc.send(encodeCmd(cmd))
      signalingRef.current?.send({ fn: 'clientEvent', sensorId: rtc.sensorId, data: cmd })
    }, 10)
  }

  function setSelectedFreq(f: number) {
    cfgRef.current.selectedFreq = f
    setSelectedFreqState(f)
    // $watch('$ctrl.selectedFreq') retunes on every change
    retune()
  }

  function changeTab(t: TabKey) {
    const s = TAB_SETTINGS[t]
    cfgRef.current = {
      ...cfgRef.current,
      decoder: s.decoder,
      sampleRate: s.fs,
      selectedFreq: s.freq,
      hasVolume: s.volume,
    }
    setActiveTab(t)
    setControlsEnabled(s.controlsEnabled)
    setDefaultUnit(s.defaultUnit)
    setSelectedFreqState(s.freq)
    setLteMsgs([])
    setLteResults([])
    setAcarsMsgs([])
    setIotMsgs([])
    setLoraMsgs([])
    setWifiMsgs([])
    retune()
  }

  function onPsd(p: PsdPayload) {
    waterfallRef.current?.addPsd(p)
    powerRef.current?.setData(p.data)
  }

  function dataMsg(text: string) {
    void decodeData(text)
      .then((x) => {
        if (!x) return
        switch (x.id) {
          case 1:
            onPsd(x.payload as PsdPayload)
            break
          case 2:
            adsbMapRef.current?.acState(x.payload as AircraftState)
            break
          case 3:
            aisMapRef.current?.aisState(x.payload)
            break
          case 5:
            setAcarsMsgs((m) => [x.payload as AcarsMsg, ...m].slice(0, 100))
            break
          case 6:
            setLteMsgs((m) => [x as TextMsg, ...m].slice(0, 15))
            break
          case 7:
            setLteResults((r) => [...r, ...((x.payload as { Cells?: LteCell[] }).Cells ?? [])])
            break
          case 8:
            setIotMsgs((m) => [x as TextMsg, ...m].slice(0, 100))
            break
          case 9:
            setLoraMsgs((m) => [x as TextMsg, ...m].slice(0, 100))
            break
          case 10:
            setWifiMsgs((m) => [x as WifiMsg, ...m].slice(0, 100))
            break
        }
      })
      .catch((err) => console.warn('Could not decode data channel frame', err))
  }

  // constructor: load sensors, then initialize signaling
  useEffect(() => {
    let cancelled = false
    let authRetries = 0

    ;(async () => {
      try {
        const list = await api.getSensors()
        if (cancelled) return
        const info: Record<string, Sensor> = {}
        for (const s of list ?? []) if (s.serial != null) info[String(s.serial)] = s
        setSensorInfo(info)
      } catch {
        /* the map simply stays empty */
      }
      if (cancelled) return

      const signaling = new Signaling(jwtRef.current ?? '', {
        onAuthenticationFailed: () => {
          if (++authRetries > 3) {
            if (authRetries === 4) console.error('Maximum auth retries reached, giving up')
            return
          }
          console.warn(`Authentication failed, fetching token and retrying (${authRetries}/3)`)
          void refreshRef.current().then((t) => signaling.authenticate(t ?? ''))
        },
        onSensors: (s) => setSensorStates({ ...s }),
        onSensorStatus: (msg) => {
          if (msg.sensorId == null) return
          setSensorStates((prev) => ({ ...prev, [String(msg.sensorId)]: String(msg.status) }))
        },
        onConnected: () => setSignalingStatus('connected'),
        onDisconnected: () => {
          setSignalingStatus('disconnected')
          setSensorStates({})
        },
        onConnectionClose: () => {
          setError('Session has been closed by server')
          rtcRef.current?.closeDataChannel()
          setWebrtcStatus('disconnected')
        },
        onConnectionDeclined: () => {
          setWebrtcStatus('disconnected')
          setError('Could not connect to sensor')
        },
        onConnectionOffer: (msg) => rtcRef.current?.createConnectionAnswer(msg),
        onIceCandidateForClient: (msg) => rtcRef.current?.addIceCandidate(msg),
      })
      signalingRef.current = signaling
      setSignalingStatus('connecting')

      const rtc = new WebRTCConnection(signaling, {
        onDataChannelMessage: (text) => dataMsg(text),
        onDataChannelOpen: () => {
          setWebrtcStatus('connected')
          retune()
        },
        onDataChannelClosed: () => setWebrtcStatus('disconnected'),
        onError: (err) => {
          const e = err as { errorText?: string; error?: { code?: number }; errorCode?: number } | null
          // ignore DNS lookup errors/warnings
          if (e && (e.errorText === 'TURN host lookup received error.' || e.error?.code === 0 || e.errorCode === 701)) {
            return
          }
          setError('Error in sensor connection')
          console.log('WebRTC connection error', err)
          setWebrtcStatus('disconnected')
        },
      })
      rtc.setAudioPlayer(audioRef.current)
      rtcRef.current = rtc

      try {
        const cfg = await api.getSignalingWssUri()
        if (cancelled) return
        const uri = (cfg as { wssUri?: string } | null)?.wssUri ?? null
        wssUriRef.current = uri
        if (uri) await signaling.connect(uri)
        else setSignalingStatus('disconnected')
      } catch {
        if (!cancelled) setSignalingStatus('disconnected')
      }
    })()

    const onUnload = () => {
      rtcRef.current?.closeDataChannel()
      signalingRef.current?.close()
    }
    window.addEventListener('beforeunload', onUnload)

    return () => {
      cancelled = true
      window.removeEventListener('beforeunload', onUnload)
      window.clearTimeout(retuneTimer.current)
      onUnload()
      rtcRef.current = null
      signalingRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function connectToSignalingServer() {
    const uri = wssUriRef.current
    if (uri && signalingRef.current) {
      setSignalingStatus('connecting')
      void signalingRef.current.connect(uri).catch(() => setSignalingStatus('disconnected'))
    }
  }

  // joinSensorInfo(): the sensor catalog annotated with live rtc status
  const joinedSensorInfo: MapSensor[] = useMemo(
    () =>
      Object.values(sensorInfo).map((s) => ({ ...s, rtcStatus: sensorStates[String(s.serial)] })),
    [sensorInfo, sensorStates],
  )
  const signalingSensors = Object.keys(sensorStates)

  function connectToSensor(sensorId: string | number) {
    setError(null)
    const id = String(sensorId)
    if (selectedSensor !== id) {
      waterfallRef.current?.clear()
      powerRef.current?.clear()
    }
    setSelectedSensor(id)
    setWebrtcStatus('connecting')
    rtcRef.current?.setAudioPlayer(audioRef.current)
    rtcRef.current?.connectToSensor(id)
    const si = joinedSensorInfo.find((s) => String(s.serial) === id)
    if (si?.position?.latitude != null && si.position.longitude != null) {
      setPanCenter([si.position.latitude, si.position.longitude])
    }
  }

  function connectToSensorName(name: string) {
    const serials = joinedSensorInfo.filter((i) => i.name === name).map((i) => i.serial)
    if (serials.length === 0 || serials[0] == null) return
    connectToSensor(serials[0])
  }

  function disconnect() {
    rtcRef.current?.closeDataChannel()
  }

  function waterfallClick(freq: number) {
    setSelectedFreq(freq)
  }

  // uib-typeahead: min length 2, name contains the query, rtcStatus 'ready', limit 15
  const matches = useMemo(() => {
    if (searchValue.length < 2) return []
    const q = searchValue.toLowerCase()
    return joinedSensorInfo
      .filter((s) => (s.name ?? '').toLowerCase().includes(q) && s.rtcStatus === 'ready')
      .slice(0, 15)
  }, [searchValue, joinedSensorInfo])

  function selectMatch(s: MapSensor) {
    setSearchValue(s.name ?? '')
    setTypeaheadOpen(false)
    if (s.serial != null) connectToSensor(s.serial)
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!typeaheadOpen || matches.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      selectMatch(matches[Math.min(activeIdx, matches.length - 1)])
    } else if (e.key === 'Escape') {
      setTypeaheadOpen(false)
    }
  }

  const nameOf = (id: string | null) => (id ? sensorInfo[id]?.name : undefined)

  return (
    <>
      <div className="container-fluid research-workbench">
        <PageHeader title="Spectrum Decoder" lead="Connect to a sensor to stream and decode radio signals." />

        <div id="sensor-status" className="panel panel-default">
          <div className="panel-heading">
            {webrtcStatus === 'connected' ? (
              <button className="btn btn-danger btn-xs" type="button" onClick={disconnect}>
                Disconnect
              </button>
            ) : null}
            {webrtcStatus === 'disconnected' ? <span>Select a sensor to connect to</span> : null}
            {webrtcStatus === 'connecting' ? <span>Connecting to {nameOf(selectedSensor) || '[]'}...</span> : null}
            {webrtcStatus === 'connected' ? (
              <span>
                {' '}
                Connected to {nameOf(selectedSensor) || `[${selectedSensor}]`}
              </span>
            ) : null}
          </div>

          <div className="panel-body" style={{ display: webrtcStatus !== 'connected' ? undefined : 'none' }}>
            {signalingSensors.length > 0 ? (
              <form
                className="form-inline streaming-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  connectToSensorName(searchValue)
                }}
              >
                <label htmlFor="sensor-search">Search Sensor</label>{' '}
                <div className="form-group" style={{ position: 'relative' }}>
                  <input
                    className="form-control input-sm"
                    id="sensor-search"
                    name="sensor-search"
                    type="search"
                    placeholder="Sensor name"
                    autoComplete="off"
                    value={searchValue}
                    onChange={(e) => {
                      setSearchValue(e.target.value)
                      setTypeaheadOpen(true)
                      setActiveIdx(0)
                    }}
                    onKeyDown={onSearchKey}
                    onBlur={() => window.setTimeout(() => setTypeaheadOpen(false), 150)}
                  />
                  {typeaheadOpen && matches.length > 0 ? (
                    <ul className="dropdown-menu" style={{ display: 'block', top: '100%', left: 0 }}>
                      {matches.map((s, i) => (
                        <li key={String(s.serial)} className={i === activeIdx ? 'active' : undefined}>
                          <a
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setActiveIdx(i)}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              selectMatch(s)
                            }}
                          >
                            <span>{highlight(s.name ?? '', searchValue)}</span>{' '}
                            {s.rtcStatus !== 'ready' ? '(not available)' : ''}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>{' '}
                <div className="form-group">
                  <button type="submit" className="btn btn-success" disabled={webrtcStatus === 'connecting'}>
                    Connect
                  </button>
                </div>
              </form>
            ) : null}

            {error !== null ? (
              <div className="alert alert-warning" role="alert">
                <p>{error}</p>
              </div>
            ) : null}

            <div style={{ display: webrtcStatus === 'disconnected' ? undefined : 'none' }}>
              <EsLeafletMap
                sensors={joinedSensorInfo}
                rtc
                scrolling
                onSelect={(serial) => connectToSensor(serial)}
                refresh={webrtcStatus}
              />
            </div>

            {webrtcStatus === 'connecting' ? (
              <div className="signaling-loader">
                <div className="lds-ripple">
                  <div />
                  <div />
                </div>
                <h3>Connecting...</h3>
              </div>
            ) : null}
          </div>
        </div>

        <div
          id="decoding-controls"
          style={{ position: 'relative', display: webrtcStatus === 'connected' ? undefined : 'none' }}
        >
          <LivePowerLevels
            ref={powerRef}
            upperThreshold={thresholds.upper}
            lowerThreshold={thresholds.lower}
            sliderWidth={sliderWidth}
          />

          <LiveWaterfall
            ref={waterfallRef}
            enableInteraction={controlsEnabled}
            showSlider
            hideTooltip={false}
            onFreqClick={waterfallClick}
            onThresholds={(upper, lower) => setThresholds({ upper, lower })}
            onSliderWidth={setSliderWidth}
          />

          <div className="row" style={{ marginTop: 25 }}>
            <div className="col-sm-2">Center Frequency:</div>
            <div className="col-sm-7" style={{ margin: -20 }}>
              <RzSlider
                value={selectedFreq}
                floor={0}
                ceil={6e9}
                disabled={!controlsEnabled}
                onChange={(v) => setSelectedFreq(v)}
                onEnd={() => retune()}
              />
            </div>
            <div className="col-sm-3">
              <EsSelFreq
                defaultUnit={defaultUnit}
                selectedFrequency={selectedFreq}
                isDisabled={!controlsEnabled}
                onChange={setSelectedFreq}
              />
            </div>
          </div>
          <div className="row" style={{ marginTop: 15 }}>
            <div className="col-sm-2">Antenna Gain:</div>
            <div className="col-sm-7" style={{ margin: -20 }}>
              <RzSlider
                value={antennaGain}
                floor={0}
                ceil={49}
                onChange={(v) => {
                  cfgRef.current.antennaGain = v
                  setAntennaGainState(v)
                }}
                onEnd={() => retune()}
              />
            </div>
            <div className="col-sm-3">
              {antennaGain !== 0 ? <input type="number" value={antennaGain} min={0} max={49} readOnly /> : <span>Auto</span>}
            </div>
          </div>
          <audio ref={audioRef} id="audio" autoPlay controls className="hidden" />

          <div style={{ marginTop: 20 }}>
            <ul className="nav nav-tabs">
              {TABS.map((t) => (
                <li key={t.key} className={`uib-tab nav-item${activeTab === t.key ? ' active' : ''}`}>
                  <a
                    href="#"
                    className="nav-link"
                    onClick={(e) => {
                      e.preventDefault()
                      if (activeTab !== t.key) changeTab(t.key)
                    }}
                  >
                    {t.heading}
                  </a>
                </li>
              ))}
            </ul>
            <div className="tab-content">
              {(['fm', 'am'] as const).map((k) => (
                <div key={k} className={`tab-pane${activeTab === k ? ' active' : ''}`}>
                  <div className="row">
                    <div className="col-sm-1" style={{ marginTop: 25 }}>
                      Volume:
                    </div>
                    <div className="col-sm-11">
                      <RzSlider
                        value={volumeSliderVal}
                        floor={0}
                        ceil={10}
                        step={1}
                        showTicks
                        onChange={(v) => {
                          cfgRef.current.volume = v
                          setVolumeState(v)
                        }}
                        onEnd={() => retune()}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className={`tab-pane${activeTab === 'adsb' ? ' active' : ''}`}>
                <Flightmap ref={adsbMapRef} aircraft center={panCenter} refresh={activeTab} />
              </div>
              <div className={`tab-pane${activeTab === 'ais' ? ' active' : ''}`}>
                <Flightmap ref={aisMapRef} ships center={panCenter} refresh={activeTab} />
              </div>

              <div className={`tab-pane${activeTab === 'acars' ? ' active' : ''}`}>
                {acarsMsgs.map((m, i) => (
                  <table key={i} className="table table-condensed" style={{ border: '1px solid #ccc' }}>
                    <tbody>
                      <tr className="text-muted">
                        <td>
                          <strong>Time:</strong> {m.timestamp != null ? dateMedium(m.timestamp * 1000) : ''}
                        </td>
                        <td>
                          <strong>Registration: </strong> {m.tail}
                        </td>
                        <td>
                          <strong>Flight: </strong> {m.flight}
                        </td>
                      </tr>
                      <tr className="text-muted">
                        <td>
                          <strong>Channel: </strong> {m.channel}
                        </td>
                        <td>
                          <strong>Frequency: </strong> {printHzUnit((m.freq ?? 0) * 1000000)}
                        </td>
                        <td>
                          <strong>Level: </strong> {m.level}dB
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3}>
                          <code>{m.text}</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ))}
              </div>

              <div className={`tab-pane${activeTab === 'lte' ? ' active' : ''}`}>
                {lteResults.length > 0 ? (
                  <table className="table table-condensed" style={{ border: '1px solid #ccc' }}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Antennas</th>
                        <th>Frequency</th>
                        <th>Offset</th>
                        <th>Power</th>
                        <th>CPType</th>
                        <th>nRB</th>
                        <th>PHICHDuration</th>
                        <th>PHICHResource</th>
                        <th>Corr. Factor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lteResults.map((m, i) => (
                        <tr key={i}>
                          <td>{m.CID}</td>
                          <td>{m.NumberAntennaPorts}</td>
                          <td>{printHzUnit(Number(m.CarrierFrequency) || 0)}</td>
                          <td>{m.FrequencyOffsetHz}</td>
                          <td>{m.RxPowerdB}dB</td>
                          <td>{m.CPType}</td>
                          <td>{m.nRB}</td>
                          <td>{m.PHICHDuration}</td>
                          <td>{m.PHICHResource}</td>
                          <td>{m.CrystalCorrectionFactor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                <div className="well">
                  <ul className="list-unstyled">
                    {lteMsgs.map((m, i) => (
                      <li key={i}>
                        <span className="text-muted">{m.time != null ? dateMedium(m.time) : ''}</span>{' '}
                        <span style={{ width: 20 }} /> <span className="text-info">{String(m.payload)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {([
                ['iot', iotMsgs],
                ['lora', loraMsgs],
              ] as const).map(([k, msgs]) => (
                <div key={k} className={`tab-pane${activeTab === k ? ' active' : ''}`}>
                  {msgs.map((m, i) => (
                    <table key={i} className="table table-condensed" style={{ border: '1px solid #ccc' }}>
                      <tbody>
                        <tr className="text-muted">
                          <td colSpan={3}>
                            <code>{JSON.stringify(m)}</code>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ))}
                </div>
              ))}

              <div className={`tab-pane${activeTab === 'wifi' ? ' active' : ''}`}>
                {wifiMsgs.length > 0 ? (
                  <table className="table table-condensed" style={{ border: '1px solid #ccc' }}>
                    <thead>
                      <tr>
                        <th>BSSID</th>
                        <th>ESSID</th>
                        <th>Channel</th>
                        <th>AP Name</th>
                        <th>Power</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wifiMsgs.map((m, i) => (
                        <tr key={i}>
                          <td>{m.payload.bssid}</td>
                          <td>{m.payload.essid}</td>
                          <td>{m.payload.channel}</td>
                          <td>{m.payload.name}</td>
                          <td>{m.payload.signal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {signalingStatus !== 'connected' ? (
        <div className="text-center white-overlay">
          {signalingStatus === 'connecting' ? (
            <div>
              <h2 className="text-info">Connecting Backend...</h2>
            </div>
          ) : null}
          {signalingStatus === 'disconnected' ? (
            <div>
              <h2 className="text-danger">Disconnected</h2>
              <p>
                The control connection to the backend is unavailable. There might be an error on our side. You can
                retry, refresh the page or come back later.
              </p>
              <button className="btn btn-warning" type="button" onClick={connectToSignalingServer}>
                Retry
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
