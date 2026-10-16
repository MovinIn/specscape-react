import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Sensor } from '../src/api/types.ts'
import { previewRequest } from '../src/api/previewStore.ts'
import {
  aggregateCells,
  type GeoSpectrumDataset,
  type AggregateOptions,
} from '../src/lib/geoSpectrum.ts'
import { sensorPosition, sensorMatches } from '../src/lib/sensors.ts'
import { sampleAvro, sampleIq } from '../src/lib/previewDownloads.ts'

Object.defineProperty(globalThis, 'localStorage', {
  value: new (class {
    values = new Map<string, string>()
    getItem(key: string) {
      return this.values.get(key) ?? null
    }
    setItem(key: string, value: string) {
      this.values.set(key, value)
    }
  })(),
  configurable: true,
})

test('sensor workflows persist add/edit/delete and reject duplicates', () => {
  const before = previewRequest('/sensor/list') as Sensor[]
  const created = previewRequest('/sensor/add', {
    method: 'POST',
    body: JSON.stringify({
      name: 'test-sensor',
      serial: 99999999,
      position: { latitude: 0, longitude: 0 },
    }),
  }) as Sensor
  assert.equal(
    (previewRequest('/sensor/list') as Sensor[]).length,
    before.length + 1,
  )
  assert.equal(created.uid, 'demo')
  assert.throws(
    () =>
      previewRequest('/sensor/add', {
        method: 'POST',
        body: JSON.stringify({ name: 'test-sensor', serial: 99999998 }),
      }),
    /already exists/,
  )
  previewRequest('/sensor/' + created.id, {
    method: 'PUT',
    body: JSON.stringify({ name: 'edited-sensor' }),
  })
  const edited = previewRequest('/sensor/' + created.serial) as Sensor
  assert.equal(edited.name, 'edited-sensor')
  edited.name = 'accidental-client-mutation'
  assert.equal(
    (previewRequest('/sensor/' + created.id) as Sensor).name,
    'edited-sensor',
  )
  previewRequest('/sensor/' + created.id, { method: 'DELETE' })
  assert.equal(
    (previewRequest('/sensor/list') as Sensor[]).length,
    before.length,
  )
  assert.throws(() => previewRequest('/sensor/' + created.id), /not found/)
})

test('campaigns, applications and profile changes survive subsequent reads', () => {
  const campaigns = previewRequest('/campaigns/current') as unknown[]
  const starts = Date.now() + 3600_000
  const campaign = previewRequest('/campaigns/add', {
    method: 'POST',
    body: JSON.stringify({
      startTime: starts,
      endTime: starts + 10_000,
      sensors: [11259375],
      senseParameters: { absoluteTime: starts / 1000, monitorTime: 10 },
    }),
  }) as { id: string; startTime: number; endTime: number }
  assert.equal(campaign.startTime, starts / 1000)
  assert.equal(campaign.endTime - campaign.startTime, 10)
  assert.equal(
    (previewRequest('/campaigns/current') as { id: string }[])[0].id,
    campaign.id,
  )
  assert.equal(
    (previewRequest('/campaigns/current') as unknown[]).length,
    campaigns.length + 1,
  )
  previewRequest('/sensorDonation/application/1', {
    method: 'PUT',
    body: JSON.stringify({ status: 'SHIPPED', notes: 'Packed' }),
  })
  const application = previewRequest('/sensorDonation/application/1') as Record<
    string,
    unknown
  >
  assert.equal(application.status, 'SHIPPED')
  assert.equal(application.notes, 'Packed')
  assert.ok(Number(application.shipped) > 0)
  previewRequest('/user/updateProfile', {
    method: 'POST',
    body: JSON.stringify({
      newDetails: {
        fullName: 'Research Admin',
        editModePassword: 'should-never-be-stored',
      },
    }),
  })
  const profile = previewRequest('/user/profile') as Record<string, unknown>
  assert.equal(profile.fullName, 'Research Admin')
  assert.equal(profile.editModePassword, undefined)
  const token = previewRequest('/sensor/registration-token') as {
    value: string
  }
  assert.notEqual(
    (
      previewRequest('/sensor/registration-token?force=true') as {
        value: string
      }
    ).value,
    token.value,
  )
})

test('research API samples match the UI contracts', () => {
  const months = previewRequest('/network/ranking/months') as number[]
  assert.ok(
    months.every(
      (month) =>
        Math.floor(month / 100) >= 2024 &&
        month % 100 >= 1 &&
        month % 100 <= 12,
    ),
  )
  const ranking = previewRequest(
    '/network/ranking?timestamp=' + months[0],
  ) as Record<string, unknown>[]
  assert.equal(ranking[0].rankAvailability, 1)
  assert.equal(typeof ranking[0].availability, 'number')
  const spectrum = previewRequest(
    '/spectrum/aggregated?freqMin=100000000&freqMax=108000000&aggFreq=1000000&timeBegin=100&timeEnd=220&aggTime=60',
  ) as { values: number[][]; startTime: number; startFreq: number }
  assert.equal(spectrum.startTime, 100)
  assert.equal(spectrum.startFreq, 100000000)
  assert.equal(spectrum.values.length, 2)
  assert.equal(spectrum.values[0].length, 8)
  assert.ok(spectrum.values.flat().every(Number.isFinite))
})

test('H3 metrics, filters and interpolation retain correct measurement values', () => {
  const dataset: GeoSpectrumDataset = {
    startFreq: 100e6,
    freqRes: 1e6,
    bins: 3,
    startTime: 100,
    endTime: 200,
    sensors: [
      { serial: 'a', name: 'A' },
      { serial: 'b', name: 'B' },
    ],
    samples: [
      {
        sensor: 'a',
        time: 100,
        lat: 47.3769,
        lon: 8.5417,
        values: new Float32Array([10, 20, NaN]),
      },
      {
        sensor: 'b',
        time: 200,
        lat: 47.3769,
        lon: 8.5417,
        values: new Float32Array([20, 40, NaN]),
      },
    ],
  }
  const options: AggregateOptions = {
    freqMin: 100e6,
    freqMax: 102e6,
    timeBegin: 100,
    timeEnd: 200,
    res: 8,
    metric: 'AVG',
    threshold: 15,
  }
  const mean = [...aggregateCells(dataset, options).values()][0]
  assert.equal(mean.count, 2)
  assert.equal(mean.value, 22.5)
  assert.equal(
    [...aggregateCells(dataset, { ...options, metric: 'MAX' }).values()][0]
      .value,
    40,
  )
  assert.equal(
    [...aggregateCells(dataset, { ...options, metric: 'OCC' }).values()][0]
      .value,
    75,
  )
  assert.equal(
    [
      ...aggregateCells(dataset, {
        ...options,
        sensors: new Set(['a']),
      }).values(),
    ][0].value,
    15,
  )
  assert.equal(
    aggregateCells(dataset, { ...options, sensors: new Set() }).size,
    0,
  )
  assert.equal(
    aggregateCells(dataset, { ...options, timeBegin: 300, timeEnd: 400 }).size,
    0,
  )
  assert.equal(
    aggregateCells(dataset, { ...options, freqMin: 500e6, freqMax: 510e6 })
      .size,
    0,
  )
  assert.equal(
    aggregateCells(dataset, { ...options, freqMin: 110e6, freqMax: 100e6 })
      .size,
    0,
  )
  const filled = aggregateCells(dataset, { ...options, fillRings: 1 })
  assert.equal(filled.get(mean.id)?.value, 22.5)
  assert.ok(
    [...filled.values()].some((cell) => cell.interpolated && cell.count === 0),
  )
})

test('sensor coordinates and search distinguish missing values from a valid origin', () => {
  assert.equal(sensorPosition({ name: 'missing' }), null)
  assert.deepEqual(sensorPosition({ latitude: 0, longitude: 0 }), [0, 0])
  assert.equal(sensorPosition({ latitude: 91, longitude: 0 }), null)
  assert.equal(
    sensorMatches({ name: 'Zurich', country: 'Switzerland' }, 'switz'),
    true,
  )
})

test('sample Raw and Avro downloads contain valid float I/Q blocks', () => {
  const raw = sampleIq()
  assert.equal(raw.byteLength, 8192)
  assert.equal(new DataView(raw.buffer).getFloat32(0, true), 0)
  const bytes = sampleAvro()
  assert.deepEqual([...bytes.slice(0, 4)], [79, 98, 106, 1])
  let offset = 4
  const readLong = () => {
    let value = 0,
      shift = 0,
      byte = 0
    do {
      byte = bytes[offset++]
      value += (byte & 127) * 2 ** shift
      shift += 7
    } while (byte & 128)
    return value % 2 ? -(value + 1) / 2 : value / 2
  }
  const readBytes = () => {
    const size = readLong()
    const value = bytes.slice(offset, offset + size)
    offset += size
    return value
  }
  const metadata: Record<string, string> = {}
  const count = readLong()
  for (let i = 0; i < count; i++) {
    const key = new TextDecoder().decode(readBytes())
    metadata[key] = new TextDecoder().decode(readBytes())
  }
  assert.equal(readLong(), 0)
  assert.equal(JSON.parse(metadata['avro.schema']).name, 'PreviewIqSample')
  assert.equal(metadata['avro.codec'], 'null')
  const sync = bytes.slice(offset, offset + 16)
  offset += 16
  assert.equal(readLong(), 1024)
  assert.equal(readLong(), 8192)
  assert.deepEqual(bytes.slice(offset, offset + 8192), raw)
  offset += 8192
  assert.deepEqual(bytes.slice(offset), sync)
})
