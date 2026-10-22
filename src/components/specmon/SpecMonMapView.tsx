import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { getGeoSpectrum, type SyntheticSource } from '../../api/geoSpectrum'
import {
  aggregateCells,
  BAND_PRESETS,
  bandBins,
  cellSpectrum,
  formatDistance,
  H3_EDGE_M,
  resForZoom,
  type CellStat,
  type GeoMetric,
  type GeoSpectrumDataset,
} from '../../lib/geoSpectrum'
import { formatHz, printDate } from '../../lib/spectrum'
import { RzSlider } from '../RzSlider'
import { EsBarPlot } from './EsBarPlot'
import { H3HeatmapMap, type MapTrack } from './H3HeatmapMap'

type Props = {
  /** Where to centre the synthetic data: the selected sensor's position. */
  center: [number, number]
  /** SNR threshold for the occupancy metric, shared with the time view. */
  occupancyThresholdDb: number
}

const METRICS: { key: GeoMetric; label: string }[] = [
  { key: 'AVG', label: 'Mean SNR' },
  { key: 'MAX', label: 'Peak SNR' },
  { key: 'OCC', label: 'Occupancy' },
]

/** Fixed colour domain for SNR, so maps of different bands and windows compare. */
const SNR_DOMAIN: [number, number] = [0, 45]
const OCC_DOMAIN: [number, number] = [0, 100]
const YLIM: [number, number] = [0, 60]

const hhmm = (sec: number) => {
  const d = new Date(sec * 1000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Spread of the measured values, ignoring the outer 5% each side. */
function fitDomain(cells: CellStat[]): [number, number] | null {
  const vals = cells.filter((c) => !c.interpolated).map((c) => c.value).sort((a, b) => a - b)
  if (vals.length < 2) return null
  const lo = vals[Math.floor(vals.length * 0.05)]
  const hi = vals[Math.ceil(vals.length * 0.95) - 1]
  return hi > lo ? [lo, hi] : [lo, lo + 1]
}

/**
 * Spectrum monitor map view: geo-tagged sweeps from mobile sensors, binned
 * onto H3 hexagons and coloured by the chosen metric for the chosen band.
 */
export function SpecMonMapView({ center, occupancyThresholdDb }: Props) {
  /** The loaded dataset, tagged with the centre it was loaded for. */
  const [loaded, setLoaded] = useState<{
    key: string
    ds: (GeoSpectrumDataset & { sources?: SyntheticSource[] }) | null
    error?: string
  } | null>(null)

  const [bandKey, setBandKey] = useState('lte800')
  const [freqMin, setFreqMin] = useState(791e6)
  const [freqMax, setFreqMax] = useState(821e6)
  const [metric, setMetric] = useState<GeoMetric>('AVG')
  const [resMode, setResMode] = useState<'auto' | number>('auto')
  const [zoom, setZoom] = useState(12)
  const [fillRings, setFillRings] = useState(0)
  const [fitScale, setFitScale] = useState(false)
  const [showTracks, setShowTracks] = useState(true)
  const [showSources, setShowSources] = useState(false)
  const [window_, setWindow] = useState<[number, number] | null>(null)
  const [hiddenSensors, setHiddenSensors] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selFreq, setSelFreq] = useState<number | null>(null)
  const [selSnr, setSelSnr] = useState<number | null>(null)

  const [lat, lon] = center
  const centerKey = `${lat},${lon}`
  useEffect(() => {
    let cancelled = false
    getGeoSpectrum({ center: [lat, lon], endTime: Math.floor(Date.now() / 60_000) * 60 })
      .then((d) => {
        if (cancelled) return
        setLoaded({ key: `${lat},${lon}`, ds: d })
        setWindow([d.startTime, d.endTime])
        setSelectedId(null)
      })
      .catch(() => !cancelled && setLoaded({ key: `${lat},${lon}`, ds: null, error: 'Could not load geo-tagged spectrum' }))
    return () => {
      cancelled = true
    }
  }, [lat, lon])
  const ds = loaded?.ds ?? null
  const error = loaded?.error ?? null
  const loading = loaded?.key !== centerKey

  const res = resMode === 'auto' ? resForZoom(zoom) : resMode
  // Dragging the time slider re-bins every sweep; let React keep the slider responsive.
  const deferredWindow = useDeferredValue(window_)

  const cellMap = useMemo(() => {
    if (!ds || !deferredWindow) return new Map<string, CellStat>()
    const visible = new Set(ds.sensors.map((s) => s.serial).filter((s) => !hiddenSensors.has(s)))
    return aggregateCells(ds, {
      freqMin,
      freqMax,
      timeBegin: deferredWindow[0],
      timeEnd: deferredWindow[1],
      res,
      metric,
      threshold: occupancyThresholdDb,
      sensors: visible,
      fillRings,
    })
  }, [ds, deferredWindow, hiddenSensors, freqMin, freqMax, res, metric, occupancyThresholdDb, fillRings])
  const cells = useMemo(() => [...cellMap.values()], [cellMap])

  const fitted = useMemo(() => (fitScale ? fitDomain(cells) : null), [fitScale, cells])
  const domain: [number, number] = fitted ?? (metric === 'OCC' ? OCC_DOMAIN : SNR_DOMAIN)

  const tracks: MapTrack[] = useMemo(() => {
    if (!ds || !deferredWindow || !showTracks) return []
    return ds.sensors
      .filter((s) => !hiddenSensors.has(s.serial))
      .map((s) => ({
        sensor: s.serial,
        name: s.name,
        points: ds.samples
          .filter((p) => p.sensor === s.serial && p.time >= deferredWindow[0] && p.time <= deferredWindow[1])
          .map((p) => [p.lat, p.lon] as [number, number]),
      }))
  }, [ds, deferredWindow, hiddenSensors, showTracks])

  const sources = useMemo(
    () => (showSources && ds?.sources ? ds.sources.filter((s) => s.freqMax >= freqMin && s.freqMin <= freqMax) : undefined),
    [showSources, ds, freqMin, freqMax],
  )

  const sensorName = useCallback((serial: string) => ds?.sensors.find((s) => s.serial === serial)?.name ?? serial, [ds])

  const formatValue = useCallback((v: number) => (metric === 'OCC' ? `${v.toFixed(0)}%` : `${v.toFixed(1)} dB`), [metric])
  const describeCell = useCallback(
    (c: CellStat) =>
      c.interpolated
        ? 'estimated from nearby cells'
        : `${c.count} sweep${c.count === 1 ? '' : 's'} · ${c.sensors.length} sensor${c.sensors.length === 1 ? '' : 's'}`,
    [],
  )

  const selected = selectedId ? cellMap.get(selectedId) ?? null : null

  // Spectrum around the band at the selected cell: the band plus half its width either side.
  const selectedSpectrum = useMemo(() => {
    if (!ds || !selected || !selected.samples.length) return null
    const pad = (freqMax - freqMin) / 2
    const [lo, hi] = bandBins(ds, freqMin - pad, freqMax + pad)
    return cellSpectrum(ds, selected.samples, lo, hi)
  }, [ds, selected, freqMin, freqMax])

  const measuredCount = cells.filter((c) => !c.interpolated).length
  const sweepCount = cells.reduce((n, c) => n + c.count, 0)
  const metricLabel = METRICS.find((m) => m.key === metric)?.label ?? metric
  const legendTitle =
    metric === 'OCC' ? `Occupancy (% of bins > ${occupancyThresholdDb} dB)` : `${metricLabel}, ${formatHz(freqMin)} – ${formatHz(freqMax)}`

  function pickBand(key: string) {
    setBandKey(key)
    const preset = BAND_PRESETS.find((b) => b.key === key)
    if (preset) {
      setFreqMin(preset.min)
      setFreqMax(preset.max)
    }
  }

  function setCustomFreq(which: 'min' | 'max', mhz: string) {
    const hz = Number(mhz) * 1e6
    if (!Number.isFinite(hz) || hz < 0) return
    setBandKey('custom')
    if (which === 'min') setFreqMin(hz)
    else setFreqMax(hz)
  }

  function toggleSensor(serial: string) {
    setHiddenSensors((prev) => {
      const next = new Set(prev)
      if (next.has(serial)) next.delete(serial)
      else next.add(serial)
      return next
    })
  }

  return (
    <div>
      <div className="es-sbar specmon-map-controls">
        <form className="form-inline" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="map-band">Band</label>
          <select id="map-band" className="form-control input-sm" value={bandKey} onChange={(e) => pickBand(e.target.value)}>
            {BAND_PRESETS.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
          <input
            type="number"
            className="form-control input-sm map-mhz"
            aria-label="Start frequency in MHz"
            step={0.1}
            value={+(freqMin / 1e6).toFixed(3)}
            onChange={(e) => setCustomFreq('min', e.target.value)}
          />
          –
          <input
            type="number"
            className="form-control input-sm map-mhz"
            aria-label="Stop frequency in MHz"
            step={0.1}
            value={+(freqMax / 1e6).toFixed(3)}
            onChange={(e) => setCustomFreq('max', e.target.value)}
          />
          MHz
          {' | '}
          <label htmlFor="map-metric">Metric</label>
          <select id="map-metric" className="form-control input-sm" value={metric} onChange={(e) => setMetric(e.target.value as GeoMetric)}>
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
          {' | '}
          <label htmlFor="map-res" title="H3 resolution; Auto follows the map zoom">
            Hex size
          </label>
          <select
            id="map-res"
            className="form-control input-sm"
            value={String(resMode)}
            onChange={(e) => setResMode(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
          >
            <option value="auto">Auto (res {resForZoom(zoom)})</option>
            {Object.entries(H3_EDGE_M).map(([r, m]) => (
              <option key={r} value={r}>
                res {r} · {formatDistance(m)} edge
              </option>
            ))}
          </select>
          {' | '}
          <label htmlFor="map-fill" title="Estimate empty hexagons from measured neighbours (inverse distance)">
            Gap fill
          </label>
          <select id="map-fill" className="form-control input-sm" value={fillRings} onChange={(e) => setFillRings(Number(e.target.value))}>
            <option value={0}>Off</option>
            <option value={1}>1 ring</option>
            <option value={2}>2 rings</option>
          </select>
          {' | '}
          <label htmlFor="map-scale">Colour scale</label>
          <select id="map-scale" className="form-control input-sm" value={fitScale ? 'fit' : 'fixed'} onChange={(e) => setFitScale(e.target.value === 'fit')}>
            <option value="fixed">Fixed</option>
            <option value="fit">Fit to data</option>
          </select>
        </form>
      </div>

      <div className="es-sbar specmon-map-controls">
        <div className="specmon-map-window">
          <span className="specmon-map-label">Time window</span>
          {ds && window_ ? (
            <RzSlider
              value={window_[0]}
              high={window_[1]}
              floor={ds.startTime}
              ceil={ds.endTime}
              step={60}
              format={hhmm}
              onChange={(lo, hi) => setWindow([lo, hi ?? lo])}
              style={{ flex: 1 }}
            />
          ) : (
            <span className="muted">—</span>
          )}
        </div>
        <div className="specmon-map-sensors">
          <span className="specmon-map-label">Sensors</span>
          {ds?.sensors.map((s) => (
            <label key={s.serial} className="checkbox-inline">
              <input type="checkbox" checked={!hiddenSensors.has(s.serial)} onChange={() => toggleSensor(s.serial)} /> {s.name}
            </label>
          ))}
          <span className="specmon-map-sep">|</span>
          <label className="checkbox-inline">
            <input type="checkbox" checked={showTracks} onChange={(e) => setShowTracks(e.target.checked)} /> Tracks
          </label>
          {ds?.sources && (
            <label className="checkbox-inline" title="Where the synthetic data's modelled transmitters for this band are">
              <input type="checkbox" checked={showSources} onChange={(e) => setShowSources(e.target.checked)} /> Transmitters
            </label>
          )}
        </div>
      </div>

      {ds?.synthetic && (
        <div className="alert alert-warning specmon-map-note" role="status">
          <strong>Synthetic data.</strong> Mobile sensors don&apos;t report positions yet, so this view shows simulated
          drives around the selected sensor past modelled FM, TV, cellular, Wi-Fi and ISM transmitters.
        </div>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <H3HeatmapMap
          key={centerKey}
          cells={cells}
          domain={domain}
          legendTitle={legendTitle}
          formatValue={formatValue}
          describeCell={describeCell}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onZoom={setZoom}
          tracks={tracks}
          sources={sources}
          center={center}
        />
        {loading && <div className="es-loader specmon-map-loader" />}
      </div>

      <div className="es-sbar">
        <div className="es-msgbox pull-left">
          {!loading && ds && measuredCount === 0 ? 'No sweeps in this band, window and sensor selection' : ''}
        </div>
        Hexagons <span className="es-sbar-val">{measuredCount}</span>
        Sweeps <span className="es-sbar-val">{sweepCount}</span>
        Resolution{' '}
        <span className="es-sbar-val">
          res {res} · {formatDistance(H3_EDGE_M[res])}
        </span>
        Window{' '}
        <span className="es-sbar-val">{deferredWindow ? `${hhmm(deferredWindow[0])}–${hhmm(deferredWindow[1])}` : '—'}</span>
      </div>

      <div className="row">
        <div className="col-sm-4">
          <div className="panel specmon-map-cell">
            <h4>Selected hexagon</h4>
            {selected ? (
              <table className="table table-condensed">
                <tbody>
                  <tr>
                    <th>{metricLabel}</th>
                    <td>
                      {formatValue(selected.value)}
                      {selected.interpolated && ' (estimated)'}
                    </td>
                  </tr>
                  <tr>
                    <th>Sweeps</th>
                    <td>{selected.count}</td>
                  </tr>
                  {selected.sensors.length > 0 && (
                    <tr>
                      <th>Sensors</th>
                      <td>{selected.sensors.map(sensorName).join(', ')}</td>
                    </tr>
                  )}
                  {selected.firstTime != null && (
                    <tr>
                      <th>Measured</th>
                      <td>
                        {printDate(new Date(selected.firstTime * 1000))} – {hhmm(selected.lastTime ?? selected.firstTime)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <th>H3 cell</th>
                    <td>
                      <code>{selected.id}</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="muted">Click a hexagon to see its values and spectrum.</p>
            )}
          </div>
        </div>
        <div className="col-sm-8">
          <h4 className="specmon-map-spectrum-title">
            Mean spectrum in hexagon
            {selFreq != null && (
              <small>
                {' '}
                {formatHz(selFreq)} · {selSnr != null ? `${selSnr.toFixed(1)} dB` : '—'}
              </small>
            )}
          </h4>
          {!selected ? (
            <p className="muted">The band&apos;s spectrum, averaged over every sweep in the selected hexagon, appears here.</p>
          ) : !selectedSpectrum ? (
            <p className="muted">This hexagon was estimated from its neighbours and has no sweeps of its own.</p>
          ) : (
            <EsBarPlot
              data={selectedSpectrum}
              ylim={YLIM}
              selFreq={selFreq}
              onSelect={(f, v) => {
                setSelFreq(f)
                setSelSnr(v)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
