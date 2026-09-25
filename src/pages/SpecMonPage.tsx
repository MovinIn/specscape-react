import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { AggregatedSpectrum, Sensor } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import LeafletMap, { type MapMarker } from '../components/LeafletMap'
import { EsBarPlot } from '../components/specmon/EsBarPlot'
import { EsWaterfall } from '../components/specmon/EsWaterfall'
import type { RowData, WaterfallData } from '../components/specmon/waterfallEngine'
import {
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
function occupancyPercents(matrix: SpectrumMatrix, thresholdDb: number): number[] {
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

  ctx.strokeStyle = '#2e6da4'
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

export default function SpecMonPage() {
  const { user, isAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [allSensors, setAllSensors] = useState<Sensor[]>([])
  const [sensor, setSensor] = useState<{ serial: string; name: string; uid?: string }>({
    serial: searchParams.get('sensor') ?? '',
    name: '',
  })
  const [senSelDialog, setSenSelDialog] = useState(false)

  const [startTime, setStartTime] = useState(() => new Date(Date.now() - 3600_000))
  const [aggFun, setAggFun] = useState<'AVG' | 'MAX'>('AVG')
  const [startFreq, setStartFreq] = useState(20_000_000)
  const [maxFreq, setMaxFreq] = useState(11_800_000_000)
  const [freqRes, setFreqRes] = useState(10_000_000)
  const [timeRes] = useState(60)

  const [loading, setLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Select a sensor and reload.')
  const [retrievalMs, setRetrievalMs] = useState(0)
  const [liveMode, setLiveMode] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  /** The last /spectrum/aggregated response, with its own start/resolution. */
  const [spec, setSpec] = useState<(WaterfallData & { bands?: AggregatedSpectrum['bands'] }) | null>(null)
  const matrix: SpectrumMatrix | null = spec?.values ?? null
  const [barPlotData, setBarPlotData] = useState<RowData | null>(null)
  /** Plot area in pixels, reported by the waterfall; drives the zoom resolution. */
  const [maxNumVals, setMaxNumVals] = useState<[number, number]>([768, 60])
  const [colorprops, setColorprops] = useState({ median: -5000, high: 4000 })

  const [showBarplot, setShowBarplot] = useState(true)
  const [showOccupancy, setShowOccupancy] = useState(true)
  const [selFreq, setSelFreq] = useState<number | null>(null)
  const [selSnr, setSelSnr] = useState<number | null>(null)
  const [selTime, setSelTime] = useState<Date | null>(null)

  const occRef = useRef<HTMLCanvasElement>(null)

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
          setStatusMessage('No data')
        }
      } catch {
        setIsError(true)
        setStatusMessage('Request failed')
        setRetrievalMs(Date.now() - t0)
      } finally {
        setLoading(false)
      }
    },
    [sensor.serial, startTime, startFreq, maxFreq, freqRes, timeRes, aggFun, matrix],
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
      sensor.serial ? { sensor: sensor.serial } : {},
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensor.serial])

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
    const newStart = startFreq - ((cols / 2) * zFac) * freqRes
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
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || s.serial === undefined) continue
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

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-sm-12">
          {/* controls: sensor/date/time + zoom/aggregation/live-mode bars */}
          <div className="es-center">
            <div className="es-sbar">
              <button
                type="button"
                className="btn btn-sm es-left-btn btn-primary"
                style={{ marginTop: 7 }}
                title="Toggle Help"
                onClick={() => setHelpOpen((v) => !v)}
              >
                <i className="glyphicon glyphicon-question-sign" />
              </button>

              <form className="form form-inline es-sbar" style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
                <label htmlFor="es-vals-sen">Sensor Name</label>
                <div className="input-group input-group-sm">
                  <input
                    id="es-vals-sen"
                    className="form-control input-sm"
                    list="specmon-sensors"
                    value={sensor.name}
                    onChange={(e) => {
                      const name = e.target.value
                      const found = allSensors.find((s) => s.name === name)
                      setSensor(
                        found
                          ? { serial: String(found.serial ?? ''), name: found.name ?? '', uid: found.uid }
                          : { ...sensor, name },
                      )
                    }}
                    title="Select a sensor by typing its name in the field or click the button to open a map"
                  />
                  <datalist id="specmon-sensors">
                    {sensorOptions(allSensors).map((s) => (
                      <option key={s.id} value={allSensors.find((a) => String(a.serial) === s.id)?.name ?? s.label} />
                    ))}
                  </datalist>
                  <span className="input-group-btn">
                    <button
                      type="button"
                      className="btn btn-sm btn-default"
                      onClick={() => setSenSelDialog(true)}
                    >
                      <i className="glyphicon glyphicon-map-marker" />
                    </button>
                  </span>
                </div>
                {' | '}
                <label htmlFor="es-date">Date</label>
                <div className="input-group input-group-sm">
                  <input
                    id="es-date"
                    type="date"
                    className="form-control"
                    value={startTime.toISOString().slice(0, 10)}
                    onChange={(e) => {
                      const [y, m, d] = e.target.value.split('-').map(Number)
                      const next = new Date(startTime)
                      next.setFullYear(y, m - 1, d)
                      setStartTime(next)
                    }}
                  />
                </div>
                {' | '}
                <label>Start Time</label>
                <div className="input-group input-group-sm">
                  <input
                    type="time"
                    className="form-control"
                    value={`${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(':').map(Number)
                      const next = new Date(startTime)
                      next.setHours(h, m, 0, 0)
                      setStartTime(next)
                    }}
                  />
                </div>
              </form>
            </div>

            <div className="es-sbar">
              <form className="form form-inline esStatusBar">
                <button
                  type="button"
                  disabled={!showZoomOut}
                  className="btn btn-sm es-left-btn"
                  title="Zoom Out"
                  onClick={onZoomOut}
                >
                  <i className="glyphicon glyphicon-zoom-out" />
                </button>
                <button
                  type="button"
                  disabled={!canZoomIn()}
                  className="btn btn-sm es-left-btn"
                  title="Zoom In"
                  onClick={onZoomIn}
                >
                  <i className="glyphicon glyphicon-zoom-in" />
                </button>
                <button
                  type="button"
                  disabled={!showZoomOut}
                  className="btn btn-sm es-left-btn"
                  title="-freq"
                  onClick={() => freqShift(-1)}
                >
                  <i className="glyphicon glyphicon-chevron-left" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm es-left-btn"
                  title="-1h"
                  onClick={() => load({ startTime: new Date(startTime.getTime() - 3600_000) })}
                >
                  <i className="glyphicon glyphicon-chevron-down" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm es-left-btn"
                  title="+1h"
                  onClick={() => load({ startTime: new Date(startTime.getTime() + 3600_000) })}
                >
                  <i className="glyphicon glyphicon-chevron-up" />
                </button>
                <button
                  type="button"
                  disabled={!showZoomOut}
                  className="btn btn-sm es-left-btn"
                  title="+freq"
                  onClick={() => freqShift(1)}
                >
                  <i className="glyphicon glyphicon-chevron-right" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm es-left-btn btn-danger"
                  title="Reset Plot"
                  onClick={resetPlot}
                >
                  <i className="glyphicon glyphicon-repeat" />
                  &nbsp;Reset Plot
                </button>

                {loading && <div className="es-loader pull-left" />}

                <label htmlFor="esHeatAggregateFun">Aggregation</label>
                <select
                  id="esHeatAggregateFun"
                  className="form-control input-sm"
                  value={aggFun}
                  onChange={(e) => setAggFun(e.target.value as 'AVG' | 'MAX')}
                >
                  <option value="AVG">AVG</option>
                  <option value="MAX">MAX</option>
                </select>

                <button
                  type="button"
                  className={`btn btn-sm ${liveMode ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => setLiveMode((v) => !v)}
                >
                  {liveMode ? 'Stop Live Reload' : 'Start Live Reload'}
                </button>
                {!liveMode && (
                  <button
                    type="button"
                    className="btn btn-sm btn-success"
                    disabled={loading}
                    onClick={() => load()}
                  >
                    Reload
                  </button>
                )}
              </form>
            </div>
          </div>

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
            <span title="Time it took to query data from server">Retrieval Time</span>
            <span className="es-sbar-val">{retrievalMs}ms</span>
            Resolution: <span className="es-sbar-val">{formatHz(freqRes)}</span>
            Time{' '}
            <span className="es-sbar-val">
              {selTime ? printDate(selTime) : '—'}
            </span>
            Frequency <span className="es-sbar-val" style={{ width: '6em' }}>{selFreq != null ? formatHz(selFreq) : '—'}</span>
            SNR <span className="es-sbar-val" style={{ width: '4.5em' }}>{selSnr != null ? `${selSnr.toFixed(1)}dB` : '—'}</span>
          </div>

          <button
            type="button"
            className="btn btn-sm pull-right"
            onClick={() => setShowOccupancy((v) => !v)}
          >
            {showOccupancy ? 'Hide' : 'Show'} Occupancy
          </button>
          {showOccupancy && (
            <div className="panel">
              <h4 style={{ textAlign: 'center', marginTop: 0 }}>Occupancy</h4>
              {occupancy ? (
                <>
                  <canvas ref={occRef} style={{ width: '100%', height: 150, display: 'block' }} />
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
                <p className="muted">Occupancy appears after a spectrum fetch.</p>
              )}
            </div>
          )}

          <button
            type="button"
            className="btn btn-sm pull-right"
            onClick={() => setShowBarplot((v) => !v)}
          >
            {showBarplot ? 'Hide' : 'Show'} Spectrum
          </button>
          {showBarplot && (
            <EsBarPlot
              data={barPlotData}
              ylim={YLIM}
              selFreq={selFreq}
              onSelect={(freq, value) => {
                setSelFreq(freq)
                setSelSnr(value)
              }}
            />
          )}
        </div>
      </div>

      {senSelDialog && (
        <div
          style={{ top: '25%', left: '50%', position: 'absolute', zIndex: 1000 }}
        >
          <div
            className="text-left well"
            style={{ position: 'relative', width: 600, marginLeft: -300, marginTop: -200 }}
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
                    const found = allSensors.find((s) => String(s.serial) === String(m.id))
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
                Cancel
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
        <div className="alert alert-info" role="status" style={{ margin: '10px 0' }}>
          Hover the waterfall to inspect a value and see that minute&apos;s
          spectrum below. Drag the waterfall to move in frequency and time,
          Shift+drag to zoom into a frequency range, or hold Ctrl while
          scrolling to zoom in and out. Reset Plot returns to the full view.
        </div>
      )}
    </div>
  )
}
