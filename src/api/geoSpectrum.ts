import type { GeoSpectrumDataset, GeoSpectrumSample } from '../lib/geoSpectrum'

/**
 * Source for the spectrum map view.
 *
 * There is no geo-tagged spectrum endpoint yet, so this generates a
 * synthetic dataset: a few mobile sensors driving around `center` past
 * modelled transmitters. Replace the body of `getGeoSpectrum` with the real
 * request once mobile sensors report positions; the rest of the map view
 * only depends on `GeoSpectrumDataset`.
 */
export async function getGeoSpectrum(params: {
  center: [number, number]
  /** Unix seconds; the window is the two hours before it. */
  endTime: number
}): Promise<GeoSpectrumDataset & { sources?: SyntheticSource[] }> {
  const key = `${params.center[0].toFixed(3)},${params.center[1].toFixed(3)},${params.endTime}`
  const hit = cache.get(key)
  if (hit) return hit
  // Yield first so the caller's loading state renders before the work runs.
  await new Promise((r) => setTimeout(r, 0))
  const ds = generateSynthetic(params.center, params.endTime)
  // ~17 MB per dataset, so keep only the most recent few (Map keeps insertion order).
  if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!)
  cache.set(key, ds)
  return ds
}

const CACHE_SIZE = 2
const cache = new Map<string, SyntheticGeoDataset>()

/** A modelled transmitter, exposed so the map can show where they are. */
export type SyntheticSource = {
  label: string
  lat: number
  lon: number
  freqMin: number
  freqMax: number
}

export type SyntheticGeoDataset = GeoSpectrumDataset & { sources: SyntheticSource[] }

const START_FREQ = 20e6
const FREQ_RES = 2e6
const BINS = Math.round((3000e6 - START_FREQ) / FREQ_RES)
const DURATION_S = 2 * 3600
const CADENCE_S = 10
const KM_PER_DEG_LAT = 111.32

type Emitter = SyntheticSource & {
  /** SNR in dB at 1 km. */
  snr1km: number
  /** Path-loss exponent: ~2 line of sight, 3-4 urban clutter. */
  exponent: number
  /** Fraction of the window [from, to] the transmitter is on; always when omitted. */
  active?: [number, number]
}

const MOBILES = [
  { serial: 'SYN-CAR', name: 'synthetic car', kind: 'car', kmh: 32, radiusKm: 7, segKm: [0.4, 1.6] },
  { serial: 'SYN-BUS', name: 'synthetic bus', kind: 'bus', kmh: 18, radiusKm: 4.5, segKm: [0.3, 1.2] },
  { serial: 'SYN-BIKE', name: 'synthetic bike', kind: 'bike', kmh: 14, radiusKm: 3, segKm: [0.2, 0.8] },
  { serial: 'SYN-WALK', name: 'synthetic pedestrian', kind: 'pedestrian', kmh: 5, radiusKm: 1.2, segKm: [0.08, 0.3] },
] as const

/** Small seeded PRNG (mulberry32) so the same place gives the same data. */
function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const range = (lo: number, hi: number) => lo + next() * (hi - lo)
  const gauss = () => Math.sqrt(-2 * Math.log(next() || 1e-12)) * Math.cos(2 * Math.PI * next())
  return { next, range, gauss }
}

function buildEmitters(center: [number, number], r: ReturnType<typeof rng>): Emitter[] {
  const [lat0, lon0] = center
  const kmLon = KM_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180)
  const at = (xKm: number, yKm: number) => ({ lat: lat0 + yKm / KM_PER_DEG_LAT, lon: lon0 + xKm / kmLon })
  const out: Emitter[] = []

  // FM broadcast: two hilltop sites, high power, near line of sight.
  const fmSites: [number, number, number[]][] = [
    [-3.5, 4, [94.6, 97.3, 101.8]],
    [5, -2.5, [89.2, 105.1]],
  ]
  for (const [x, y, freqs] of fmSites) {
    for (const f of freqs) {
      out.push({ label: `FM ${f} MHz`, ...at(x, y), freqMin: f * 1e6 - 1e5, freqMax: f * 1e6 + 1e5, snr1km: 52, exponent: 2.2 })
    }
  }

  // DVB-T: one UHF tower with three 8 MHz multiplexes.
  for (const f of [538, 610, 674]) {
    out.push({ label: `DVB-T ${f} MHz`, ...at(6, 5), freqMin: (f - 4) * 1e6, freqMax: (f + 4) * 1e6, snr1km: 44, exponent: 2.5 })
  }

  // Cellular: three operators' macro sites on a jittered grid, each
  // transmitting its own block in every downlink band.
  const blocks: [string, number, number][][] = [
    [['LTE 800', 791, 801], ['GSM 900', 925, 935], ['LTE 1800', 1805, 1830], ['UMTS 2100', 2110, 2130], ['LTE 2600', 2620, 2640]],
    [['LTE 800', 801, 811], ['GSM 900', 935, 948], ['LTE 1800', 1830, 1855], ['UMTS 2100', 2130, 2150], ['LTE 2600', 2640, 2665]],
    [['LTE 800', 811, 821], ['GSM 900', 948, 960], ['LTE 1800', 1855, 1880], ['UMTS 2100', 2150, 2170], ['LTE 2600', 2665, 2690]],
  ]
  let site = 0
  for (let gx = -6; gx <= 6; gx += 3) {
    for (let gy = -6; gy <= 6; gy += 3) {
      if (r.next() < 0.25) continue
      const op = site++ % 3
      const pos = at(gx + r.range(-1, 1), gy + r.range(-1, 1))
      for (const [name, lo, hi] of blocks[op]) {
        // Higher bands lose more to clutter, so they cover less ground.
        const exponent = lo > 1700 ? 3.8 : 3.3
        out.push({ label: `${name} site ${site} (operator ${op + 1})`, ...pos, freqMin: lo * 1e6, freqMax: hi * 1e6, snr1km: 36, exponent })
      }
    }
  }

  // Wi-Fi: dense access points downtown on channels 1/6/11.
  for (let i = 0; i < 70; i++) {
    const ch = [2412, 2437, 2462][i % 3]
    const d = Math.abs(r.gauss()) * 0.9
    const a = r.range(0, 2 * Math.PI)
    out.push({ label: `Wi-Fi AP ch ${[1, 6, 11][i % 3]}`, ...at(d * Math.cos(a), d * Math.sin(a)), freqMin: (ch - 10) * 1e6, freqMax: (ch + 10) * 1e6, snr1km: -8, exponent: 3.5 })
  }

  // ISM 433: a short-lived transmitter, only on for part of the window.
  out.push({ label: 'ISM 433 MHz (intermittent)', ...at(1.2, -1.6), freqMin: 433.05e6, freqMax: 434.79e6, snr1km: 22, exponent: 3, active: [0.35, 0.6] })

  return out
}

/** Street-grid random walk, sampled every CADENCE_S seconds. */
function buildTrack(
  m: (typeof MOBILES)[number],
  steps: number,
  r: ReturnType<typeof rng>,
): [number, number][] {
  const dirs: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]]
  let x = r.range(-m.radiusKm, m.radiusKm) * 0.5
  let y = r.range(-m.radiusKm, m.radiusKm) * 0.5
  let heading = Math.floor(r.range(0, 4))
  let left = 0
  const stepKm = (m.kmh * CADENCE_S) / 3600
  const out: [number, number][] = []
  for (let i = 0; i < steps; i++) {
    let move = stepKm
    while (move > 0) {
      if (left <= 0) {
        // Turn left/right or keep straight; never U-turn. Head home if outside the radius.
        const options = [heading, (heading + 1) % 4, (heading + 3) % 4]
        const outside = Math.hypot(x, y) > m.radiusKm
        heading = outside
          ? options.reduce((best, h) =>
              Math.hypot(x + dirs[h][0], y + dirs[h][1]) < Math.hypot(x + dirs[best][0], y + dirs[best][1]) ? h : best,
            )
          : options[Math.floor(r.range(0, 3))]
        left = r.range(m.segKm[0], m.segKm[1])
      }
      const d = Math.min(move, left)
      x += dirs[heading][0] * d
      y += dirs[heading][1] * d
      left -= d
      move -= d
    }
    out.push([x, y])
  }
  return out
}

function generateSynthetic(center: [number, number], endTime: number): SyntheticGeoDataset {
  const seed = Math.round(center[0] * 1000) * 31 + Math.round(center[1] * 1000)
  const r = rng(seed)
  const emitters = buildEmitters(center, r)
  const [lat0, lon0] = center
  const kmLon = KM_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180)
  const steps = DURATION_S / CADENCE_S
  const startTime = endTime - DURATION_S
  const tracks = MOBILES.map((m) => buildTrack(m, steps, r))
  const emitterBins = emitters.map((e) => {
    const lo = Math.max(0, Math.floor((e.freqMin - START_FREQ) / FREQ_RES))
    const hi = Math.min(BINS - 1, Math.floor((e.freqMax - START_FREQ) / FREQ_RES))
    return [lo, hi] as const
  })
  const adsbBin = Math.floor((1090e6 - START_FREQ) / FREQ_RES)
  const lin = new Float64Array(BINS)
  const samples: GeoSpectrumSample[] = []

  for (let i = 0; i < steps; i++) {
    const time = startTime + i * CADENCE_S
    const frac = i / steps
    MOBILES.forEach((m, k) => {
      // ~5 m of GPS jitter.
      const [x, y] = tracks[k][i]
      const lat = lat0 + (y + r.gauss() * 0.005) / KM_PER_DEG_LAT
      const lon = lon0 + (x + r.gauss() * 0.005) / kmLon
      // Spatially correlated shadowing (buildings, terrain), a few hundred metres across.
      const shadow = 4 * Math.sin(lat * 900 + 1.3) * Math.cos(lon * 700 + 0.7)

      lin.fill(1) // noise floor = 0 dB SNR
      emitters.forEach((e, n) => {
        if (e.active && (frac < e.active[0] || frac > e.active[1])) return
        const dKm = Math.max(0.03, Math.hypot((e.lat - lat) * KM_PER_DEG_LAT, (e.lon - lon) * kmLon))
        const snr = e.snr1km - 10 * e.exponent * Math.log10(dKm) + shadow + r.gauss() * 2
        if (snr < -10) return
        const p = 10 ** (snr / 10)
        const [lo, hi] = emitterBins[n]
        for (let j = lo; j <= hi; j++) lin[j] += p
      })
      // ADS-B: aircraft overhead, everywhere and bursty.
      if (r.next() < 0.6) lin[adsbBin] += 10 ** (r.range(4, 14) / 10)

      const values = new Float32Array(BINS)
      for (let j = 0; j < BINS; j++) {
        const v = 10 * Math.log10(lin[j]) + Math.abs(r.gauss()) * 1.2
        values[j] = Math.min(60, v)
      }
      samples.push({ sensor: m.serial, time, lat, lon, values })
    })
  }

  return {
    startFreq: START_FREQ,
    freqRes: FREQ_RES,
    bins: BINS,
    startTime,
    endTime: startTime + (steps - 1) * CADENCE_S,
    sensors: MOBILES.map((m) => ({ serial: m.serial, name: m.name, kind: m.kind })),
    samples,
    synthetic: true,
    sources: emitters.map(({ label, lat, lon, freqMin, freqMax }) => ({ label, lat, lon, freqMin, freqMax })),
  }
}
