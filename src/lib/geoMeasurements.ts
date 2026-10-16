import type { AggregatedSpectrum, Sensor } from '../api/types'
import type { GeoSpectrumDataset, GeoSpectrumSample } from './geoSpectrum'
import { sensorPosition } from './sensors.ts'

export type SensorMeasurement = { sensor: Sensor; spectrum: AggregatedSpectrum }
export type MeasurementWindow = {
  timeBegin: number
  timeEnd: number
  freqMin: number
  freqMax: number
  aggFreq: number
  aggTime: number
}

/** Attach actual stationary sensor positions to received rows; never invent a route or signal. */
export function geoMeasurements(
  records: SensorMeasurement[],
  query: MeasurementWindow,
): GeoSpectrumDataset {
  const bins = Math.ceil((query.freqMax - query.freqMin) / query.aggFreq)
  if (!Number.isFinite(bins) || bins < 1 || bins > 2048 || query.aggTime <= 0)
    throw new Error('Invalid spatial measurement grid')
  const samples: GeoSpectrumSample[] = []
  const sensors: GeoSpectrumDataset['sensors'] = []
  for (const { sensor, spectrum } of records) {
    const position = sensorPosition(sensor)
    if (!position || sensor.serial == null) continue
    const values = Array.isArray(spectrum) ? spectrum : spectrum.values
    if (!Array.isArray(values) || !values.length) continue
    const startFreq = spectrum.startFreq ?? query.freqMin
    const freqRes = spectrum.freqRes ?? query.aggFreq
    const startTime = spectrum.startTime ?? query.timeBegin
    const timeRes = spectrum.timeRes ?? query.aggTime
    if (
      !Number.isFinite(startFreq) ||
      !Number.isFinite(startTime) ||
      !Number.isFinite(freqRes) ||
      !Number.isFinite(timeRes) ||
      freqRes <= 0 ||
      timeRes <= 0
    )
      throw new Error('Invalid spectrum coordinates from the API')
    // All requests use the same grid. Reject a mismatched response instead of shifting measured frequencies.
    const offset = (startFreq - query.freqMin) / query.aggFreq
    if (
      Math.abs(freqRes - query.aggFreq) > 1e-6 ||
      Math.abs(offset - Math.round(offset)) > 1e-6
    )
      throw new Error('The API returned incompatible frequency bins')
    let received = false
    values.forEach((row: unknown, index: number) => {
      if (!Array.isArray(row)) return
      const time = startTime + index * timeRes
      if (time < query.timeBegin || time > query.timeEnd) return
      const data = new Float32Array(bins).fill(NaN)
      row.forEach((value: unknown, col: number) => {
        const at = Math.round(offset) + col
        if (
          at >= 0 &&
          at < bins &&
          typeof value === 'number' &&
          Number.isFinite(value)
        )
          data[at] = value
      })
      if (!data.some(Number.isFinite)) return
      samples.push({
        sensor: String(sensor.serial),
        time,
        lat: position[0],
        lon: position[1],
        values: data,
      })
      received = true
    })
    if (received)
      sensors.push({
        serial: String(sensor.serial),
        name: sensor.name ?? String(sensor.serial),
        kind: 'fixed',
      })
  }
  samples.sort((a, b) => a.time - b.time)
  return {
    startFreq: query.freqMin,
    freqRes: query.aggFreq,
    bins,
    startTime: query.timeBegin,
    endTime: query.timeEnd,
    sensors,
    samples,
    synthetic: false,
  }
}
