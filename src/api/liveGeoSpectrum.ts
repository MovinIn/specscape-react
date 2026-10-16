import { api } from './client'
import { geoMeasurements, type SensorMeasurement } from '../lib/geoMeasurements'
import { sensorPosition } from '../lib/sensors'

/** Actual /spectrum/aggregated rows at real fixed sensor positions, in a 100 km neighborhood. */
export async function getLiveGeoSpectrum(params: {
  center: [number, number]
  freqMin: number
  freqMax: number
  endTime: number
  signal?: AbortSignal
}) {
  const catalog = await api.getSensors()
  const candidates = catalog
    .filter((sensor) => {
      const p = sensorPosition(sensor)
      if (!p || sensor.serial == null) return false
      const km = Math.hypot(
        (p[0] - params.center[0]) * 111.32,
        (p[1] - params.center[1]) *
          111.32 *
          Math.cos((params.center[0] * Math.PI) / 180),
      )
      return km <= 100
    })
    .slice(0, 12)
  const query = {
    timeBegin: params.endTime - 7200,
    timeEnd: params.endTime,
    freqMin: params.freqMin,
    freqMax: params.freqMax,
    aggFreq: Math.max(
      100_000,
      Math.ceil((params.freqMax - params.freqMin) / 768 / 100_000) * 100_000,
    ),
    aggTime: 60,
  }
  const records: SensorMeasurement[] = []
  const warnings: string[] = []
  // Limit concurrent historical queries to three.
  for (let start = 0; start < candidates.length; start += 3) {
    params.signal?.throwIfAborted()
    const group = candidates.slice(start, start + 3)
    const results = await Promise.allSettled(
      group.map(async (sensor) => ({
        sensor,
        spectrum: await api.getSpectrum(
          { ...query, sensor: sensor.serial! },
          AbortSignal.any([
            AbortSignal.timeout(15_000),
            ...(params.signal ? [params.signal] : []),
          ]),
        ),
      })),
    )
    params.signal?.throwIfAborted()
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') records.push(result.value)
      else {
        const error = result.reason as { status?: number; message?: string }
        if (error.status === 401 || error.status === 403) throw result.reason
        warnings.push(
          (group[index].name ?? String(group[index].serial)) +
            ': ' +
            (error.message ?? 'measurement unavailable'),
        )
      }
    })
  }
  if (!records.length && warnings.length)
    throw new Error('Could not retrieve measurements. ' + warnings.join(' · '))
  return { ...geoMeasurements(records, query), warnings }
}
