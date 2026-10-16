import type { AdminUser, Sensor } from './types'
import { MOCK_SENSORS, MOCK_USERS, mockGet } from './mock.ts'

type Row = Record<string, unknown>
type PreviewState = {
  version: 1
  sensors: Sensor[]
  users: AdminUser[]
  applications: Row[]
  campaigns: Row[]
  profile: Row
  inquiries: Row[]
  token: { value: string; validUntil: number }
}
const KEY = 'specscape.linxiang.preview.v1'
let memory: PreviewState | null = null
const clone = <T>(value: T): T => structuredClone(value)
function initial(): PreviewState {
  return {
    version: 1,
    sensors: clone(MOCK_SENSORS),
    users: clone(MOCK_USERS),
    applications: clone(mockGet('/sensorDonation/list/all') as Row[]),
    campaigns: clone(mockGet('/campaigns/current') as Row[]),
    profile: {
      uid: 'demo',
      username: 'demo',
      name: 'Local',
      surname: 'Administrator',
      fullName: 'Local Administrator',
      mail: 'demo@specscape.local',
      organization: 'SpecScape Research',
      country: 'Switzerland',
      enabled: true,
    },
    inquiries: [],
    token: {
      value: 'PREVIEW-' + crypto.randomUUID().slice(0, 12).toUpperCase(),
      validUntil: Date.now() + 86400_000,
    },
  }
}
function state() {
  if (memory) return memory
  try {
    const saved = JSON.parse(
      localStorage.getItem(KEY) ?? 'null',
    ) as PreviewState | null
    if (
      saved?.version === 1 &&
      Array.isArray(saved.sensors) &&
      Array.isArray(saved.users) &&
      Array.isArray(saved.applications) &&
      Array.isArray(saved.campaigns) &&
      Array.isArray(saved.inquiries) &&
      saved.profile &&
      typeof saved.profile === 'object' &&
      typeof saved.token?.value === 'string' &&
      Number.isFinite(saved.token.validUntil)
    )
      memory = saved
  } catch {
    /* Start from samples if local storage is unavailable or damaged. */
  }
  memory ??= initial()
  return memory
}
function publicDetails(value: Row): Row {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => !key.toLowerCase().includes('password'),
    ),
  )
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state()))
  } catch {
    /* The current session remains usable. */
  }
}
function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status })
}
function bodyOf(init: RequestInit): Row {
  try {
    return typeof init.body === 'string' ? (JSON.parse(init.body) as Row) : {}
  } catch {
    return fail('Invalid preview request')
  }
}
export function previewRequest(path: string, init: RequestInit = {}): unknown {
  const s = state()
  const url = new URL(path, 'http://preview.local')
  const route = url.pathname
  const method = (init.method ?? 'GET').toUpperCase()
  const body = bodyOf(init)
  const now = Math.floor(Date.now() / 1000)
  if (route === '/network/stats')
    return { sensors: clone(s.sensors), num_users: s.users.length }
  if (route === '/sensor/list') return clone(s.sensors)
  if (route === '/sensor/list/own')
    return clone(s.sensors.filter((sensor) => sensor.uid === 'demo'))
  if (route === '/sensor/status/list')
    return s.sensors.map((sensor) => ({
      staticInfo: clone(sensor),
      controllerInfo: {
        Serial: String(sensor.serial),
        Status: sensor.sensing ? 'SENSING' : 'OFF',
        Temperature: 38,
        ProcessCPU: 12,
        ProcessMemory: 96,
        SoftwareInfo: { ElectrosensePackage: 'preview-1.0' },
      },
    }))
  if (route.startsWith('/sensor/exists/'))
    return s.sensors.some(
      (sensor) =>
        sensor.name ===
        decodeURIComponent(route.slice('/sensor/exists/'.length)),
    )
  if (route === '/sensor/registration-token') {
    if (
      url.searchParams.get('force') === 'true' ||
      s.token.validUntil < Date.now()
    ) {
      s.token = {
        value: 'PREVIEW-' + crypto.randomUUID().slice(0, 12).toUpperCase(),
        validUntil: Date.now() + 86400_000,
      }
      persist()
    }
    return clone(s.token)
  }
  if (route === '/sensor/add' && method === 'POST') {
    if (!body.name || body.serial == null)
      fail('A name and serial are required')
    if (
      s.sensors.some(
        (sensor) =>
          String(sensor.serial) === String(body.serial) ||
          sensor.name === body.name,
      )
    )
      fail('Sensor name or serial already exists', 409)
    const sensor: Sensor = {
      ...body,
      id: Math.max(0, ...s.sensors.map((sensor) => Number(sensor.id) || 0)) + 1,
      uid: 'demo',
      sensing: false,
      deployed: now,
    } as Sensor
    s.sensors.push(sensor)
    persist()
    return clone(sensor)
  }
  if (/^\/sensor\/[^/]+$/.test(route)) {
    const id = decodeURIComponent(route.split('/').at(-1)!)
    const index = s.sensors.findIndex(
      (sensor) => String(sensor.id) === id || String(sensor.serial) === id,
    )
    if (index < 0) fail('Sensor not found', 404)
    if (method === 'DELETE') {
      s.sensors.splice(index, 1)
      persist()
      return null
    }
    if (method === 'PUT') {
      if (
        s.sensors.some((sensor, i) => i !== index && sensor.name === body.name)
      )
        fail('Sensor name already exists', 409)
      s.sensors[index] = { ...s.sensors[index], ...body } as Sensor
      persist()
    }
    return clone(s.sensors[index])
  }
  if (route === '/network/ranking/years') return [2026, 2025, 2024]
  if (route === '/network/ranking/months')
    return [202610, 202609, 202608, 202607]
  if (route === '/network/ranking')
    return s.sensors.map((sensor, i) => ({
      serial: sensor.serial,
      name: sensor.name,
      uid: sensor.uid,
      rankAvailability: i + 1,
      availability: +(99.85 - i * 7.2).toFixed(2),
      onlineMinutes: 43200 - i * 3000,
    }))
  if (route === '/campaigns/current') return clone(s.campaigns)
  if (route === '/campaigns/add' && method === 'POST') {
    const seconds = (value: unknown) =>
      typeof value === 'number' && value > 1e11 ? value / 1000 : value
    const campaign = {
      ...body,
      startTime: seconds(body.startTime),
      endTime: seconds(body.endTime),
      id: 'preview-' + crypto.randomUUID().slice(0, 8),
      status: 'Pending',
    }
    s.campaigns.unshift(campaign)
    persist()
    return clone(campaign)
  }
  if (route === '/sensorDonation/list' || route === '/sensorDonation/list/all')
    return clone(s.applications)
  if (route.startsWith('/sensorDonation/application/')) {
    const id = decodeURIComponent(route.split('/').at(-1)!)
    const index = s.applications.findIndex((row) => String(row.id) === id)
    if (index < 0) fail('Application not found', 404)
    if (method === 'PUT') {
      s.applications[index] = {
        ...s.applications[index],
        ...body,
        ...(body.status === 'SHIPPED'
          ? { shipped: now }
          : body.status === 'REJECTED'
            ? { deleted: now }
            : {}),
      }
      persist()
    }
    return clone(s.applications[index])
  }
  if (route === '/sensorDonation/stats/monthly/') {
    const monthly: Record<
      string,
      Record<string, { created: number; deleted: number; shipped: number }>
    > = {}
    for (const application of s.applications) {
      for (const event of ['created', 'deleted', 'shipped'] as const) {
        if (!application[event]) continue
        const date = new Date(Number(application[event]) * 1000)
        const key =
          date.getFullYear() +
          '-' +
          String(date.getMonth() + 1).padStart(2, '0')
        const kit = String(application.sensorType ?? 'Extension Board only')
        monthly[key] ??= {}
        monthly[key][kit] ??= { created: 0, deleted: 0, shipped: 0 }
        monthly[key][kit][event]++
      }
    }
    return { monthly }
  }
  if (route === '/sensorPrice/list')
    return [
      { sensorType: 'Extension Board only', price: 45 },
      { sensorType: 'ElectroSense Kit (RasPi + Dongle + Board)', price: 140 },
    ]
  if (route === '/user/list') return clone(s.users)
  if (route === '/user/profile') return clone(s.profile)
  if (route === '/user/updateProfile') {
    s.profile = {
      ...s.profile,
      ...publicDetails((body.newDetails as Row) ?? {}),
    }
    persist()
    return clone(s.profile)
  }
  if (route === '/user/register') {
    const user = (body.user ?? {}) as Row
    const uid = String(
      user.username ?? user.uid ?? 'researcher-' + s.users.length,
    )
    if (s.users.some((row) => row.uid === uid))
      fail('Username already exists', 409)
    const entry = {
      ...MOCK_USERS[0],
      ...publicDetails(user),
      uid,
      username: uid,
      enabled: true,
    } as AdminUser
    s.users.push(entry)
    persist()
    return { ok: true, uid }
  }
  if (
    [
      '/user/activate',
      '/user/reactivate',
      '/user/updatePassword',
      '/user/resendActivation',
      '/user/forgotPassword',
      '/user/recover',
      '/user/forgotUsername',
      '/logout',
    ].includes(route)
  )
    return { ok: true, preview: true }
  if (route === '/contact' && method === 'POST') {
    const inquiry = { ...body, id: crypto.randomUUID(), created: now }
    s.inquiries.push(inquiry)
    persist()
    return { ok: true, id: inquiry.id, preview: true }
  }
  if (route === '/iq/datasets') {
    const serial = url.searchParams.get('serial')
    const sample = mockGet(path) as Record<string, Row[]>
    const result = Object.fromEntries(
      Object.entries(sample)
        .filter(([key]) => !serial || serial === '0' || serial === key)
        .map(([key, rows]) => [
          key,
          rows.map((row, i) => ({
            ...row,
            id: 'sample-' + key + '-' + i,
            centerFrequency: key === '11259375' ? 97.3e6 : 1090e6,
            antennaGain: 28,
            samplingRate: 2.4e6,
            size: 8192,
          })),
        ]),
    )
    return result
  }
  if (route === '/signaling/wss-config')
    return { uri: null, wssUri: null, preview: true }
  const fallback = mockGet(path)
  if (fallback === undefined)
    return fail('Preview endpoint is unavailable: ' + route, 404)
  return clone(fallback)
}
