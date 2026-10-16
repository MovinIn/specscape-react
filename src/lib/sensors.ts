import type { Sensor } from '../api/types'
import type { MapMarker } from '../components/LeafletMap'

/** Reject missing or invalid positions rather than placing them at (0, 0). */
export function sensorPosition(sensor: Sensor): [number, number] | null {
  const latitude = sensor.position?.latitude ?? sensor.latitude ?? sensor.lat
  const longitude = sensor.position?.longitude ?? sensor.longitude ?? sensor.lon
  if (latitude == null || longitude == null) return null
  const lat = Number(latitude)
  const lon = Number(longitude)
  return Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
    ? [lat, lon]
    : null
}

export function sensorMarkers(sensors: Sensor[]): MapMarker[] {
  return sensors.flatMap((sensor) => {
    const position = sensorPosition(sensor)
    if (!position || sensor.serial == null) return []
    return [
      {
        id: String(sensor.serial),
        lat: position[0],
        lon: position[1],
        label: sensor.name ?? String(sensor.serial),
        online: Boolean(sensor.sensing),
      },
    ]
  })
}

export function sensorMatches(sensor: Sensor, query: string) {
  const q = query.trim().toLowerCase()
  return (
    !q ||
    [
      sensor.name,
      sensor.serial,
      sensor.country,
      sensor.address,
      sensor.uid,
    ].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(q),
    )
  )
}
