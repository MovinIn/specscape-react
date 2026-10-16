import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { AggregatedSpectrum, Sensor } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import LeafletMap, { type MapMarker } from '../components/LeafletMap'
import { WorkspaceHeading } from '../components/WorkspaceHeading'
import { isPreview } from '../config/navigation'
import { EsBarPlot } from '../components/specmon/EsBarPlot'
import { EsWaterfall } from '../components/specmon/EsWaterfall'
import type {
  RowData,
  WaterfallData,
} from '../components/specmon/waterfallEngine'
import {
  averageSpectrumRow,
  extractSpectrumMatrix,
  formatHz,
  printDate,
  sensorOptions,
  type SpectrumMatrix,
} from '../lib/spectrum'

/**
 * Frequency Channel Occupancy per ITU-R SM.2256-1: percentage of samples in
 * each frequency bin whose SNR exceeds a fixed threshold. Matches the
 * original occupancy.js, which used a flat 15 dB threshold on the SNR
 * values returned by the API (not a noise-floor-relative one).
 */
function occupancyPercents(
  matrix: SpectrumMatrix,
  thresholdDb: number,
): number[] {
  const cols = matrix[0]?.length ?? 0
  const out: number[] = []
  for (let x = 0; x < cols; x++) {
    let hits = 0
    let samples = 0
    for (const row of matrix) {
      const v = row[x]
      if (typeof v !== 'number' || !Number.isFinite(v)) continue
      samples++
      if (v > thresholdDb) hits++
    }
    out.push(samples ? (hits / samples) * 100 : 0)
  }
  return out
}

function drawOccupancy(canvas: HTMLCanvasElement, percents: number[]) {
  const ctx = canvas.getContext('2d')
  if (!ctx || !percents.length) return
  const dpr = window.devicePixelRatio || 1
  const cssW = canvas.clientWidth || 640
  const cssH = 150
  canvas.width = Math.floor(cssW * dpr)
  canvas.height = Math.floor(cssH * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)

  const padL = 4
  const padR = 4
  const padT = 8
  const padB = 8
  const plotW = cssW - padL - padR
  const plotH = cssH - padT - padB

  ctx.strokeStyle = '#7852ee'
  ctx.lineWidth = 2
  ctx.beginPath()
  percents.forEach((p, i) => {
    const x = padL + (i / Math.max(1, percents.length - 1)) * plotW
    const y = padT + plotH - (p / 100) * plotH
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
}

const FREQ_RESOLUTIONS = [10_000, 100_000, 1_000_000, 10_000_000, 100_000_000]
const YLIM: [number, number] = [0, 60]
/** Fixed SNR threshold above which a channel counts as occupied (occupancy.js). */
const OCCUPANCY_THRESHOLD_DB = 15
// Loaded on first use: h3-js reserves 32 MB of memory as soon as it is imported,
// which time-view users shouldn't pay for.
const SpecMonMapView = lazy(() =>
  import('../components/specmon/SpecMonMapView').then((m) => ({
    default: m.SpecMonMapView,
  })),
)

/** Synthetic map data is centred here when the sensor has no position (demo-zurich). */
const DEFAULT_MAP_CENTER: [number, number] = [47.3769, 8.5417]

type SpecMonView = 'time' | 'map'

export default function SpecMonPage() {
  const { user, backendIsAdmin, backendAuthenticated } = useAuth()
  const isAdmin = isPreview || backendIsAdmin
  const [searchParams, setSearchParams] = useSearchParams()

  const [allSensors, setAllSensors] = useState<Sensor[]>([])
  const [sensor, setSensor] = useState<{
    serial: string
    name: string
    uid?: string
  }>({
    serial: searchParams.get('sensor') ?? '',
    name: '',
  })
  const [senSelDialog, setSenSelDialog] = useState(false)
  const view: SpecMonView = searchParams.get('view') === 'map' ? 'map' : 'time'
  function setView(next: SpecMonView) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (next === 'map') params.set('view', 'map')
      else params.delete('view')
      return params
    })
  }

  const [startTime, setStartTime] = useState(
    () => new Date(Date.now() - 3600_000),
  )
  const [aggFun, setAggFun] = useState<'AVG' | 'MAX'>('AVG')
  const [startFreq, setStartFreq] = useState(20_000_000)
  const [maxFreq, setMaxFreq] = useState(11_800_000_000)
  const [freqRes, setFreqRes] = useState(10_000_000)
  const [timeRes] = useState(60)

  const [loading, setLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [statusMessage, setStatusMessage] = useState(
    'Select a sensor and reload.',
  )
  const [retrievalMs, setRetrievalMs] = useState(0)
  const [liveMode, setLiveMode] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  /** The last /spectrum/aggregated response, with its own start/resolution. */
  const [spec, setSpec] = useState<
    (WaterfallData & { bands?: AggregatedSpectrum['bands'] }) | null
  >(null)
  const matrix: SpectrumMatrix | null = spec?.values ?? null
  const [barPlotData, setBarPlotData] = useState<RowData | null>(null)
  /** Plot area in pixels, reported by the waterfall; drives the zoom resolution. */
  const [maxNumVals, setMaxNumVals] = useState<[number, number]>([768, 60])
  const [colorprops, setColorprops] = useState({
    median: isPreview ? 0 : -5000,
    high: 4000,
  })

  const [showBarplot, setShowBarplot] = useState(true)
  const [showOccupancy, setShowOccupancy] = useState(true)
  const [selFreq, setSelFreq] = useState<number | null>(null)
  const [selSnr, setSelSnr] = useState<number | null>(null)
  const [selTime, setSelTime] = useState<Date | null>(null)

  const occRef = useRef<HTMLCanvasElement>(null)
  const sensorDialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!senSelDialog) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = sensorDialogRef.current
    dialog?.focus()
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSenSelDialog(false)
      if (event.key !== 'Tab' || !dialog) return
      const targets = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button, a, input, [tabindex="0"]',
        ),
      ].filter((el) => el.getClientRects().length)
      const first = targets[0]
      const last = targets.at(-1)
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault()
        last?.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', keyboard)
    return () => {
      document.removeEventListener('keydown', keyboard)
      previous?.focus()
    }
  }, [senSelDialog])

  // Load the sensor catalog once, mirroring sen-time-select's initial fetch.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.getSensors()
        if (cancelled) return
        const sensors = Array.isArray(list) ? list : []
        setAllSensors(sensors)

        const paramSerial = searchParams.get('sensor')
        let picked = sensors.find((s) => String(s.serial) === paramSerial)
        if (!picked) picked = sensors.find((s) => s.uid === user?.username)
        if (!picked) picked = sensors[0]
        if (picked) {
          setSensor({
            serial: String(picked.serial ?? ''),
            name: picked.name ?? '',
            uid: picked.uid,
          })
        }
      } catch {
        setStatusMessage('Could not load sensor list')
        setIsError(true)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(
    async (opts?: {
      startTime?: Date
      maxTime?: Date
      startFreq?: number
      maxFreq?: number
      freqRes?: number
      isUpdate?: boolean
    }) => {
      if (!isPreview && !backendAuthenticated) {
        setSpec(null)
        setStatusMessage('Backend access required for real measurements')
        return
      }
      if (!sensor.serial) {
        setStatusMessage('Select a sensor')
        return
      }
      const st = opts?.startTime ?? startTime
      const sf = opts?.startFreq ?? startFreq
      const mf = opts?.maxFreq ?? maxFreq
      const fr = opts?.freqRes ?? freqRes
      const maxTime = opts?.maxTime ?? new Date(st.getTime() + 3600_000)

      // legacy updateSelection clears the bar plot while fetching
      setBarPlotData(null)
      setLoading(true)
      setIsError(false)
      setStatusMessage('')
      const t0 = Date.now()
      try {
        const data = await api.getSpectrum({
          sensor: sensor.serial,
          timeBegin: Math.floor(st.getTime() / 1000),
          timeEnd: Math.floor(maxTime.getTime() / 1000),
          freqMin: sf,
          freqMax: mf,
          aggFreq: fr,
          aggTime: timeRes,
          aggFun,
        })
        const m = extractSpectrumMatrix(data)
        setRetrievalMs(Date.now() - t0)
        if (m && m.length > 1 && (m[0]?.length ?? 0) > 1) {
          setSpec({
            startFreq: data.startFreq ?? sf,
            startTime: data.startTime ?? Math.floor(st.getTime() / 1000),
            freqRes: data.freqRes ?? fr,
            timeRes: data.timeRes ?? timeRes,
            noiseFloor: data.noiseFloor,
            values: m,
            bands: data.bands,
          })
          setBarPlotData({
            startFreq: data.startFreq ?? sf,
            freqRes: data.freqRes ?? fr,
            values: averageSpectrumRow(m),
          })
          setStartFreq(sf)
          setMaxFreq(mf)
          setFreqRes(data.freqRes ?? fr)
          setStartTime(st)
        } else if (opts?.isUpdate && matrix) {
          // keep the current view when a zoom/drag returns nothing
          setSpec((prev) => (prev ? { ...prev } : prev))
          setStatusMessage('Could not zoom: No Data')
        } else {
          setSpec(null)
          setStatusMessage('No archived measurements in this time window.')
        }
      } catch (error) {
        setIsError(true)
        setSpec(null)
        setStatusMessage(
          error instanceof Error ? error.message : 'Request failed',
        )
        setRetrievalMs(Date.now() - t0)
      } finally {
        setLoading(false)
      }
    },
    [
      sensor.serial,
      startTime,
      startFreq,
      maxFreq,
      freqRes,
      timeRes,
      aggFun,
      matrix,
      backendAuthenticated,
    ],
  )

  // Live mode: reload every 5s, tracking the last hour.
  useEffect(() => {
    if (!liveMode) return
    const id = window.setInterval(() => {
      if (!loading) {
        void load({ startTime: new Date(Date.now() - (3600_000 - 120_000)) })
      }
    }, 5000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode, loading])

  const occupancy = useMemo(
    () => (matrix ? occupancyPercents(matrix, OCCUPANCY_THRESHOLD_DB) : null),
    [matrix],
  )

  useEffect(() => {
    if (!occupancy || !occRef.current || !showOccupancy) return
    drawOccupancy(occRef.current, occupancy)
  }, [occupancy, showOccupancy])

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (sensor.serial) params.set('sensor', sensor.serial)
        return params
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensor.serial])

  // Load measurements when a sensor is resolved or changed in the selector.
  useEffect(() => {
    if (!sensor.serial) return
    void load({ startFreq: 0, maxFreq: 11_900_000_000, freqRes: 10_000_000 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensor.serial, backendAuthenticated])

  function isAllowedFreq(freq: number): boolean {
    if (isAdmin) return freq >= 10_000
    if (user?.username === sensor.uid) return freq >= 10_000
    return freq >= 100_000
  }

  function canZoomIn(): boolean {
    if (isAdmin) return freqRes > 10_000
    if (user?.username === sensor.uid) return freqRes > 10_000
    return freqRes > 100_000
  }

  const showZoomOut = freqRes !== 10_000_000

  /** specmon.js onZoom: pick the finest resolution that fits the plot width. */
  function onZoom(sf: number, mf: number, stSec?: number, mtSec?: number) {
    if (!Number.isFinite(sf) || !Number.isFinite(mf) || mf - sf <= 0) return
    let fr: number | null = null
    for (const cand of FREQ_RESOLUTIONS) {
      if ((mf - sf) / cand <= maxNumVals[0]) {
        fr = cand
        break
      }
    }
    if (fr == null) {
      setStatusMessage('after drag - Unable to find proper resolution')
      return
    }
    if (!isAllowedFreq(fr)) fr *= 10
    void load({
      startFreq: sf,
      maxFreq: mf,
      freqRes: fr,
      startTime: stSec != null ? new Date(stSec * 1000) : startTime,
      maxTime: mtSec != null ? new Date(mtSec * 1000) : undefined,
      isUpdate: true,
    })
  }

  /** specmon.js onBboxChange: the waterfall was dragged to a new window. */
  function onBboxChange(sf: number, mf: number, stSec: number, mtSec: number) {
    void load({
      startFreq: sf,
      maxFreq: mf,
      startTime: new Date(stSec * 1000),
      maxTime: new Date(mtSec * 1000),
      isUpdate: true,
    })
  }

  function onZoomIn() {
    if (freqRes === 10_000) return
    const cols = matrix?.[0]?.length ?? 0
    if (!cols) return
    const zFac = 3
    const newStart = Math.trunc(startFreq + (cols / zFac / 2) * freqRes)
    const newMax = Math.trunc(newStart + (cols / zFac) * freqRes)
    onZoom(newStart, newMax)
  }

  function onZoomOut() {
    if (freqRes === 10_000) return
    const cols = matrix?.[0]?.length ?? 0
    if (!cols) return
    const zFac = 3
    const newStart = startFreq - (cols / 2) * zFac * freqRes
    const newMax = startFreq + (cols * zFac - zFac) * freqRes
    onZoom(newStart, newMax)
  }

  function freqShift(direction: 1 | -1) {
    const cols = matrix?.[0]?.length ?? 0
    if (!cols) return
    const currentMax = startFreq + cols * freqRes
    const delta = currentMax - startFreq
    const newStart = startFreq + direction * 0.75 * delta
    const newMax = newStart + cols * freqRes
    onZoom(newStart, newMax)
  }

  function resetPlot() {
    setStartFreq(0)
    setMaxFreq(11_900_000_000)
    setFreqRes(10_000_000)
    void load({ startFreq: 0, maxFreq: 11_900_000_000, freqRes: 10_000_000 })
  }

  const markers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = []
    for (const s of allSensors) {
      const lat = Number(s.position?.latitude ?? s.latitude ?? s.lat)
      const lon = Number(s.position?.longitude ?? s.longitude ?? s.lon)
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        s.serial === undefined
      )
        continue
      out.push({
        id: String(s.serial),
        lat,
        lon,
        label: s.name ?? String(s.serial),
        online: Boolean(s.sensing),
      })
    }
    return out
  }, [allSensors])

  const mapCenter: [number, number] = useMemo(() => {
    const s = allSensors.find((a) => String(a.serial) === sensor.serial)
    const lat = Number(s?.position?.latitude ?? s?.latitude ?? s?.lat)
    const lon = Number(s?.position?.longitude ?? s?.longitude ?? s?.lon)
    return Number.isFinite(lat) && Number.isFinite(lon)
      ? [lat, lon]
      : DEFAULT_MAP_CENTER
  }, [allSensors, sensor.serial])

  const viewToggle = (
    <div
      className="lx-segment lx-view-toggle"
      role="group"
      aria-label="Spectrum view"
    >
      <button
        type="button"
        aria-pressed={view === 'time'}
        onClick={() => setView('time')}
      >
        <i className="fa-solid fa-wave-square" aria-hidden="true" /> Time &
        frequency
      </button>
      <button
        type="button"
        aria-pressed={view === 'map'}
        onClick={() => {
          setLiveMode(false)
          setView('map')
        }}
      >
        <i className="fa-solid fa-layer-group" aria-hidden="true" /> Spatial
        view <small>LAB</small>
      </button>
    </div>
  )
  const heading = (
    <WorkspaceHeading
      eyebrow="SPECTRUM INTELLIGENCE"
      title={
        view === 'map'
          ? 'A new dimension of discovery.'
          : 'Signals, in perspective.'
      }
      description={
        view === 'map'
          ? 'Explore spectrum across space. Select a hexagon to look closer.'
          : 'Explore frequency and time. Every measurement tells a story.'
      }
    >
      {viewToggle}
    </WorkspaceHeading>
  )

  if (view === 'map') {
    return (
      <div className="lx-monitor">
        {heading}
        <div className="lx-monitor-context">
          <span>
            <span className="lx-pulse-dot" /> Spatial lab
          </span>
          <span>
            Centered on {sensor.name || 'the selected sensor'} · Choose a data
            source below
          </span>
          <select
            className="lx-map-center-select"
            aria-label="Map center sensor"
            value={sensor.serial}
            onChange={(event) => {
              const found = allSensors.find(
                (item) => String(item.serial) === event.target.value,
              )
              if (found)
                setSensor({
                  serial: String(found.serial),
                  name: found.name ?? '',
                  uid: found.uid,
                })
            }}
          >
            {sensorOptions(allSensors).map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <Suspense
          fallback={
            <div className="lx-empty" role="status">
              Preparing the spatial workspace…
            </div>
          }
        >
          <SpecMonMapView
            center={mapCenter}
            occupancyThresholdDb={OCCUPANCY_THRESHOLD_DB}
          />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="lx-monitor">
      {heading}
      <div className="lx-monitor-context">
        <span>
          <span className="lx-pulse-dot" />{' '}
          {isPreview
            ? 'Sample measurements'
            : liveMode
              ? 'Auto-refresh enabled'
              : 'Historical measurements'}
        </span>
        <span>
          {isPreview
            ? 'Illustrative spectrum data · no hardware connection'
            : 'Drag to pan · Shift + drag to zoom · Hover to inspect'}
        </span>
      </div>
      <div className="row">
        <div className="col-sm-12">
          <section
            className="lx-monitor-controls"
            aria-label="Measurement controls"
          >
            <div className="lx-monitor-fields">
              <label className="lx-field" htmlFor="es-vals-sen">
                <span>01 / SENSOR</span>
                <select
                  id="es-vals-sen"
                  className="form-control"
                  value={sensor.serial}
                  onChange={(e) => {
                    const found = allSensors.find(
                      (s) => String(s.serial) === e.target.value,
                    )
                    if (found)
                      setSensor({
                        serial: String(found.serial),
                        name: found.name ?? '',
                        uid: found.uid,
                      })
                  }}
                >
                  {!allSensors.length && (
                    <option value="">No sensors available</option>
                  )}
                  {sensorOptions(allSensors).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lx-field" htmlFor="es-date">
                <span>02 / DATE</span>
                <input
                  id="es-date"
                  type="date"
                  className="form-control"
                  value={`${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}-${String(startTime.getDate()).padStart(2, '0')}`}
                  onChange={(e) => {
                    if (!e.target.value) return
                    const [y, m, d] = e.target.value.split('-').map(Number)
                    const next = new Date(startTime)
                    next.setFullYear(y, m - 1, d)
                    setStartTime(next)
                  }}
                />
              </label>
              <label className="lx-field" htmlFor="es-start-time">
                <span>03 / START TIME · LOCAL</span>
                <input
                  id="es-start-time"
                  type="time"
                  className="form-control"
                  value={`${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`}
                  onChange={(e) => {
                    if (!e.target.value) return
                    const [h, m] = e.target.value.split(':').map(Number)
                    const next = new Date(startTime)
                    next.setHours(h, m, 0, 0)
                    setStartTime(next)
                  }}
                />
              </label>
              <label className="lx-field" htmlFor="esHeatAggregateFun">
                <span>04 / AGGREGATION</span>
                <select
                  id="esHeatAggregateFun"
                  className="form-control"
                  value={aggFun}
                  onChange={(e) => setAggFun(e.target.value as 'AVG' | 'MAX')}
                >
                  <option value="AVG">Average</option>
                  <option value="MAX">Maximum</option>
                </select>
              </label>
              <button
                type="button"
                className="lx-button lx-button-primary"
                disabled={loading || !sensor.serial}
                onClick={() => load()}
              >
                {loading ? 'Loading…' : 'Load spectrum'}{' '}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
            <div className="lx-plot-toolbar">
              <div
                className="lx-plot-tool-group"
                role="group"
                aria-label="Frequency navigation"
              >
                <button
                  type="button"
                  className="lx-icon-button"
                  disabled={!showZoomOut}
                  aria-label="Zoom out"
                  title="Zoom out"
                  onClick={onZoomOut}
                >
                  <i className="fa-solid fa-minus" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="lx-icon-button"
                  disabled={!canZoomIn()}
                  aria-label="Zoom in"
                  title="Zoom in"
                  onClick={onZoomIn}
                >
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="lx-icon-button"
                  disabled={!showZoomOut}
                  aria-label="Lower frequency"
                  title="Lower frequency"
                  onClick={() => freqShift(-1)}
                >
                  <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="lx-icon-button"
                  disabled={!showZoomOut}
                  aria-label="Higher frequency"
                  title="Higher frequency"
                  onClick={() => freqShift(1)}
                >
                  <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="lx-toolbar-text"
                  onClick={resetPlot}
                >
                  <i className="fa-solid fa-rotate-left" aria-hidden="true" />{' '}
                  Reset view
                </button>
              </div>
              <div
                className="lx-plot-tool-group"
                role="group"
                aria-label="Time navigation"
              >
                <button
                  type="button"
                  className="lx-toolbar-text"
                  onClick={() =>
                    load({
                      startTime: new Date(startTime.getTime() - 3600_000),
                    })
                  }
                >
                  ← Previous hour
                </button>
                <button
                  type="button"
                  className="lx-toolbar-text"
                  onClick={() =>
                    load({
                      startTime: new Date(startTime.getTime() + 3600_000),
                    })
                  }
                >
                  Next hour →
                </button>
              </div>
              <div className="lx-plot-tool-group">
                <button
                  type="button"
                  className={`lx-toolbar-text${liveMode ? ' is-enabled' : ''}`}
                  aria-pressed={liveMode}
                  onClick={() => setLiveMode((v) => !v)}
                >
                  <span className="lx-pulse-dot" />{' '}
                  {liveMode ? 'Pause refresh' : 'Auto-refresh'}
                </button>
                <button
                  type="button"
                  className="lx-icon-button"
                  aria-label="Choose sensor on map"
                  title="Choose sensor on map"
                  onClick={() => setSenSelDialog(true)}
                >
                  <i
                    className="fa-solid fa-map-location-dot"
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  className="lx-icon-button"
                  aria-label="Plot help"
                  title="Plot help"
                  aria-expanded={helpOpen}
                  onClick={() => setHelpOpen((v) => !v)}
                >
                  <i
                    className="fa-regular fa-circle-question"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </section>
          <div className="lx-chart-heading">
            <h2>Spectrum waterfall</h2>
            <span>
              {formatHz(startFreq)} — {formatHz(maxFreq)}{' '}
              <span aria-hidden="true">/</span> {formatHz(freqRes)} resolution
            </span>
          </div>
          {!isPreview &&
            !loading &&
            !isError &&
            statusMessage.startsWith('No archived') && (
              <div className="lx-notice">
                There are no archived sweeps for this sensor in the selected
                interval.{' '}
                <Link
                  to={`/spectrum-decoder?sensor=${encodeURIComponent(sensor.serial)}`}
                >
                  Open the live signal instead ↗
                </Link>
              </div>
            )}

          {/* waterfall */}
          <div style={{ width: '100%', textAlign: 'center' }}>
            <EsWaterfall
              data={spec}
              bands={spec?.bands ?? null}
              colorLow={colorprops.median}
              colorHigh={colorprops.high}
              onColorChange={(median, high) => setColorprops({ median, high })}
              loading={loading}
              isError={isError}
              message={statusMessage}
              noMoveEvent={senSelDialog}
              selFreq={selFreq}
              onSelect={(sel) => {
                setSelFreq(sel?.freq ?? null)
                setSelTime(sel?.time ?? null)
                setSelSnr(sel?.snr ?? null)
              }}
              onRowData={setBarPlotData}
              onZoom={onZoom}
              onBboxChange={onBboxChange}
              onMaxNumVals={setMaxNumVals}
            />
          </div>

          {/* status bar */}
          <div className="es-sbar">
            <div className="es-msgbox pull-left">{statusMessage}</div>
            <span title="Time it took to query data from server">
              Retrieval Time
            </span>
            <span className="es-sbar-val">{retrievalMs}ms</span>
            Resolution: <span className="es-sbar-val">{formatHz(freqRes)}</span>
            Time{' '}
            <span className="es-sbar-val">
              {selTime ? printDate(selTime) : '—'}
            </span>
            Frequency{' '}
            <span className="es-sbar-val" style={{ width: '6em' }}>
              {selFreq != null ? formatHz(selFreq) : '—'}
            </span>
            SNR{' '}
            <span className="es-sbar-val" style={{ width: '4.5em' }}>
              {selSnr != null ? `${selSnr.toFixed(1)}dB` : '—'}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-sm pull-right"
            aria-expanded={showOccupancy}
            onClick={() => setShowOccupancy((v) => !v)}
          >
            {showOccupancy ? 'Hide' : 'Show'} Occupancy
          </button>
          {showOccupancy && (
            <div className="panel">
              <h4 style={{ textAlign: 'center', marginTop: 0 }}>Occupancy</h4>
              {occupancy ? (
                <>
                  <canvas
                    ref={occRef}
                    style={{ width: '100%', height: 150, display: 'block' }}
                  />
                  <p
                    className="muted"
                    style={{ textAlign: 'center', fontSize: '0.85em' }}
                  >
                    total Frequency Band Occupancy:{' '}
                    {(
                      occupancy.reduce((a, b) => a + b, 0) / occupancy.length
                    ).toFixed(2)}
                    %
                  </p>
                </>
              ) : (
                <p className="muted">
                  Occupancy appears after a spectrum fetch.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            className="btn btn-sm pull-right"
            aria-expanded={showBarplot}
            onClick={() => setShowBarplot((v) => !v)}
          >
            {showBarplot ? 'Hide' : 'Show'} Spectrum
          </button>
          {showBarplot && (
            <section className="lx-power-spectrum" aria-label="Power spectrum">
              <div className="lx-chart-heading">
                <h2>Power spectrum</h2>
                <span>Mean SNR · hover the waterfall for a time slice</span>
              </div>
              <EsBarPlot
                data={barPlotData}
                ylim={YLIM}
                selFreq={selFreq}
                onSelect={(freq, value) => {
                  setSelFreq(freq)
                  setSelSnr(value)
                }}
              />
            </section>
          )}
        </div>
      </div>

      {senSelDialog && (
        <div
          ref={sensorDialogRef}
          tabIndex={-1}
          className="modal-backdrop-custom lx-sensor-picker"
          role="dialog"
          aria-modal="true"
          aria-label="Choose sensor on map"
        >
          <div
            className="text-left well"
            style={{ width: 680, maxWidth: '100%', margin: 0 }}
          >
            <h3 className="modal-title">Select Sensor</h3>
            <p>Select a marker from the map and click ok</p>
            <div className="row">
              <div className="col-sm-12">
                <LeafletMap
                  markers={markers}
                  fitToMarkers
                  height={320}
                  onMarkerClick={(m) => {
                    const found = allSensors.find(
                      (s) => String(s.serial) === String(m.id),
                    )
                    if (found) {
                      setSensor({
                        serial: String(found.serial ?? ''),
                        name: found.name ?? '',
                        uid: found.uid,
                      })
                    }
                  }}
                />
              </div>
            </div>
            <div className="text-right" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setSenSelDialog(false)}
              >
                Close
              </button>{' '}
              <button
                type="button"
                className="btn btn-default"
                onClick={() => setSenSelDialog(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {helpOpen && (
        <div
          className="alert alert-info"
          role="status"
          style={{ margin: '10px 0' }}
        >
          Hover the waterfall to inspect a value and see that minute&apos;s
          spectrum below. Drag the waterfall to move in frequency and time,
          Shift+drag to zoom into a frequency range, or hold Ctrl while
          scrolling to zoom in and out. Reset Plot returns to the full view.
        </div>
      )}
    </div>
  )
}
