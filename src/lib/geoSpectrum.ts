import { cellToLatLng, gridDiskDistances, latLngToCell } from 'h3-js'

/**
 * Geo-tagged spectrum for mobile sensors, binned onto Uber H3 hexagons.
 *
 * A fixed sensor's /spectrum/aggregated response is a time x frequency
 * matrix. A mobile sensor adds a position to every sweep, so the unit here
 * is one sweep (one matrix row) plus where it was taken. The map view
 * collapses each sweep to one number for the chosen band, then aggregates
 * those numbers per H3 cell.
 */

/** One PSD sweep from a (possibly moving) sensor, tagged with its position. */
export type GeoSpectrumSample = {
  sensor: string
  /** Unix seconds. */
  time: number
  lat: number
  lon: number
  /**
   * SNR in dB per frequency bin, bin j at `startFreq + j * freqRes` of the
   * dataset. NaN marks a bin with no measurement (the API's `null`).
   */
  values: Float32Array
}

export type GeoSpectrumDataset = {
  startFreq: number
  freqRes: number
  /** Number of bins in every sample's `values`. */
  bins: number
  startTime: number
  endTime: number
  sensors: { serial: string; name: string; kind?: string }[]
  /** Sorted by time. */
  samples: GeoSpectrumSample[]
  /** True while the data comes from the synthetic generator. */
  synthetic?: boolean
}

/** AVG/MAX match the time view's aggregation; OCC is % of bins over threshold. */
export type GeoMetric = 'AVG' | 'MAX' | 'OCC'

export type CellStat = {
  id: string
  value: number
  /** Sweeps that fell in this cell; 0 for a gap-filled cell. */
  count: number
  /** True when the value was estimated from neighbouring cells. */
  interpolated: boolean
  /** Indexes into dataset.samples, for the per-cell spectrum. */
  samples: number[]
  sensors: string[]
  firstTime?: number
  lastTime?: number
}

export type AggregateOptions = {
  freqMin: number
  freqMax: number
  timeBegin: number
  timeEnd: number
  res: number
  metric: GeoMetric
  /** dB; only used by OCC. */
  threshold: number
  /** Sensor serials to include; all when omitted. */
  sensors?: Set<string>
  /** Gap fill: estimate empty cells within this many rings of a measured one. */
  fillRings?: number
}

/** Inclusive bin range covering [freqMin, freqMax], at least one bin wide. */
export function bandBins(
  ds: GeoSpectrumDataset,
  freqMin: number,
  freqMax: number,
): [number, number] {
  const lo = Math.max(0, Math.floor((freqMin - ds.startFreq) / ds.freqRes))
  const hi = Math.min(
    ds.bins - 1,
    Math.ceil((freqMax - ds.startFreq) / ds.freqRes) - 1,
  )
  return hi < lo
    ? [Math.min(lo, ds.bins - 1), Math.min(lo, ds.bins - 1)]
    : [lo, hi]
}

/** Collapses one sweep to a single number for the band, or NaN if empty. */
function sampleValue(
  v: Float32Array,
  lo: number,
  hi: number,
  metric: GeoMetric,
  threshold: number,
): number {
  let n = 0
  let acc = metric === 'MAX' ? -Infinity : 0
  for (let j = lo; j <= hi; j++) {
    const x = v[j]
    if (!Number.isFinite(x)) continue
    n++
    if (metric === 'AVG') acc += x
    else if (metric === 'MAX') acc = x > acc ? x : acc
    else if (x > threshold) acc++
  }
  if (!n) return NaN
  if (metric === 'AVG') return acc / n
  if (metric === 'OCC') return (acc / n) * 100
  return acc
}

/** Bins the dataset onto H3 cells at `opts.res`. */
export function aggregateCells(
  ds: GeoSpectrumDataset,
  opts: AggregateOptions,
): Map<string, CellStat> {
  if (
    opts.freqMax <= opts.freqMin ||
    opts.freqMax <= ds.startFreq ||
    opts.freqMin >= ds.startFreq + ds.freqRes * ds.bins
  )
    return new Map()
  const [lo, hi] = bandBins(ds, opts.freqMin, opts.freqMax)
  const acc = new Map<string, CellStat & { sensorSet: Set<string> }>()

  ds.samples.forEach((s, i) => {
    if (
      !Number.isFinite(s.lat) ||
      !Number.isFinite(s.lon) ||
      Math.abs(s.lat) > 90 ||
      Math.abs(s.lon) > 180
    )
      return
    if (s.time < opts.timeBegin || s.time > opts.timeEnd) return
    if (opts.sensors && !opts.sensors.has(s.sensor)) return
    const v = sampleValue(s.values, lo, hi, opts.metric, opts.threshold)
    if (Number.isNaN(v)) return
    const id = latLngToCell(s.lat, s.lon, opts.res)
    let c = acc.get(id)
    if (!c) {
      c = {
        id,
        value: opts.metric === 'MAX' ? -Infinity : 0,
        count: 0,
        interpolated: false,
        samples: [],
        sensors: [],
        sensorSet: new Set(),
        firstTime: s.time,
        lastTime: s.time,
      }
      acc.set(id, c)
    }
    // AVG and OCC are means over sweeps; MAX keeps the peak sweep.
    c.value = opts.metric === 'MAX' ? Math.max(c.value, v) : c.value + v
    c.count++
    c.samples.push(i)
    c.sensorSet.add(s.sensor)
    c.lastTime = s.time
  })

  const out = new Map<string, CellStat>()
  for (const { sensorSet, ...c } of acc.values()) {
    out.set(c.id, {
      ...c,
      value: opts.metric === 'MAX' ? c.value : c.value / c.count,
      sensors: [...sensorSet],
    })
  }
  if (opts.fillRings) fillGaps(out, opts.fillRings)
  return out
}

/**
 * Inverse-distance estimate for empty cells near measured ones, the k-ring
 * smoothing from the H3 heatmap tutorial. Measured cells are never changed;
 * only gaps are filled, and they stay flagged so the map can draw them
 * as estimates.
 */
function fillGaps(cells: Map<string, CellStat>, rings: number) {
  const est = new Map<string, { sum: number; w: number }>()
  for (const c of cells.values()) {
    gridDiskDistances(c.id, rings).forEach((ring, d) => {
      if (d === 0) return
      const w = 1 / (d * d)
      for (const id of ring) {
        if (cells.has(id)) continue
        const e = est.get(id) ?? { sum: 0, w: 0 }
        e.sum += c.value * w
        e.w += w
        est.set(id, e)
      }
    })
  }
  for (const [id, e] of est) {
    cells.set(id, {
      id,
      value: e.sum / e.w,
      count: 0,
      interpolated: true,
      samples: [],
      sensors: [],
    })
  }
}

/** Mean spectrum (NaN-aware) over the given samples, as a bar-plot row. */
export function cellSpectrum(
  ds: GeoSpectrumDataset,
  sampleIdx: number[],
  lo = 0,
  hi = ds.bins - 1,
): { startFreq: number; freqRes: number; values: (number | null)[] } {
  const n = hi - lo + 1
  const sums = new Float64Array(n)
  const counts = new Uint32Array(n)
  for (const i of sampleIdx) {
    const v = ds.samples[i].values
    for (let j = 0; j < n; j++) {
      const x = v[lo + j]
      if (!Number.isFinite(x)) continue
      sums[j] += x
      counts[j]++
    }
  }
  return {
    startFreq: ds.startFreq + lo * ds.freqRes,
    freqRes: ds.freqRes,
    values: Array.from(sums, (s, j) => (counts[j] ? s / counts[j] : null)),
  }
}

/**
 * H3 resolution for a Leaflet zoom level. Each resolution step is ~2.65x
 * smaller and each zoom step 2x, so this keeps a hexagon roughly 15-40 px
 * across at mid latitudes: res 8 (~460 m edge) at zoom 12, res 10 (~66 m)
 * at zoom 14-15.
 */
export function resForZoom(zoom: number): number {
  return Math.max(4, Math.min(11, Math.round(zoom * 0.7 - 0.2)))
}

/** Approximate hexagon edge length per resolution, for the UI. */
export const H3_EDGE_M: Record<number, number> = {
  4: 22_600,
  5: 8_540,
  6: 3_230,
  7: 1_220,
  8: 461,
  9: 174,
  10: 66,
  11: 25,
}

export function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

/** Centre of a cell as [lat, lon]. */
export function cellCenter(id: string): [number, number] {
  return cellToLatLng(id)
}

/**
 * Semantic heat ramp, pale yellow (weak) to deep red (strong). Weak cells
 * stay light so the basemap remains readable under them.
 */
const HEAT: [number, number, number][] = [
  [255, 245, 190],
  [254, 217, 118],
  [254, 178, 76],
  [253, 141, 60],
  [240, 59, 32],
  [189, 0, 38],
  [110, 0, 40],
]

export function heatColor(t: number): string {
  const x =
    Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (HEAT.length - 1)
  const i = Math.min(HEAT.length - 2, Math.floor(x))
  const f = x - i
  const a = HEAT[i]
  const b = HEAT[i + 1]
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`
}

export function heatGradientCss(): string {
  return `linear-gradient(to right, ${HEAT.map((c) => `rgb(${c.join(',')})`).join(', ')})`
}

/** Named bands for the map's band picker. Downlink ranges for cellular. */
export const BAND_PRESETS: {
  key: string
  label: string
  min: number
  max: number
}[] = [
  { key: 'all', label: 'Full range', min: 20e6, max: 3000e6 },
  { key: 'fm', label: 'FM broadcast', min: 87.5e6, max: 108e6 },
  { key: 'ism433', label: 'ISM 433 MHz', min: 430e6, max: 440e6 },
  { key: 'dvbt', label: 'DVB-T (UHF TV)', min: 470e6, max: 694e6 },
  { key: 'lte800', label: 'LTE 800 downlink', min: 791e6, max: 821e6 },
  { key: 'gsm900', label: 'GSM/LTE 900 downlink', min: 925e6, max: 960e6 },
  { key: 'adsb', label: 'ADS-B 1090 MHz', min: 1086e6, max: 1094e6 },
  { key: 'lte1800', label: 'LTE 1800 downlink', min: 1805e6, max: 1880e6 },
  {
    key: 'umts2100',
    label: 'UMTS/LTE 2100 downlink',
    min: 2110e6,
    max: 2170e6,
  },
  { key: 'wifi24', label: 'Wi-Fi 2.4 GHz', min: 2400e6, max: 2484e6 },
  { key: 'lte2600', label: 'LTE 2600 downlink', min: 2620e6, max: 2690e6 },
]
