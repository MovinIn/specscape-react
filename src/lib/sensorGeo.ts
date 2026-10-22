import type { Sensor } from '../api/types'

export type LatLon = [number, number]

/** Neighbours within this many degrees (about 110 km) count as the same area. */
const AREA_DEG = 1

/**
 * The densest group of located sensors, i.e. where most of the network is.
 * Sensors reported at 0,0 have no real position and are ignored. With
 * `preferOnline`, only online sensors are considered when any exist.
 */
export function sensorCluster(
  sensors: Sensor[],
  { preferOnline = false }: { preferOnline?: boolean } = {},
): { center: LatLon; points: LatLon[] } | null {
  const located = sensors.flatMap((s) => {
    const lat = Number(s.position?.latitude ?? s.latitude ?? s.lat)
    const lon = Number(s.position?.longitude ?? s.longitude ?? s.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return []
    return [{ lat, lon, sensing: Boolean(s.sensing) }]
  })
  const online = located.filter((p) => p.sensing)
  const pool = preferOnline && online.length ? online : located

  let best: typeof pool = []
  for (const seed of pool) {
    const near = pool.filter((p) => Math.abs(p.lat - seed.lat) <= AREA_DEG && Math.abs(p.lon - seed.lon) <= AREA_DEG)
    if (near.length > best.length) best = near
  }
  if (!best.length) return null

  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length
  return {
    center: [mean(best.map((p) => p.lat)), mean(best.map((p) => p.lon))],
    points: best.map((p) => [p.lat, p.lon] as LatLon),
  }
}
