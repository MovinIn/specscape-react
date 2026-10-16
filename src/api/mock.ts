import type {
  AdminUser,
  NetworkStats,
  Sensor,
  SensorStatusEntry,
} from './types'

const now = Math.floor(Date.now() / 1000)

export const MOCK_SENSORS: Sensor[] = [
  {
    id: 1,
    serial: 11259375,
    name: 'demo-zurich',
    uid: 'demo',
    country: 'Switzerland',
    model: 'Raspberry Pi 4 · RTL-SDR',
    sensing: true,
    latitude: 47.3769,
    longitude: 8.5417,
    lat: 47.3769,
    lon: 8.5417,
    hardware: 'esraspi4psdr',
    type: 'esraspi4psdr',
    frontend: 'rtl-sdr2',
    owner: 'demo',
    position: {
      latitude: 47.3769,
      longitude: 8.5417,
      altitude: 410,
      indoor: false,
    },
  },
  {
    id: 2,
    serial: 11259376,
    name: 'demo-leuven',
    uid: 'demo',
    country: 'Belgium',
    model: 'Raspberry Pi 3 · RTL-SDR',
    sensing: false,
    latitude: 50.8798,
    longitude: 4.7005,
    lat: 50.8798,
    lon: 4.7005,
    hardware: 'esraspi3psdr',
    type: 'esraspi3psdr',
    frontend: 'rtl-sdr2',
    owner: 'demo',
    position: {
      latitude: 50.8798,
      longitude: 4.7005,
      altitude: 30,
      indoor: true,
    },
  },
  {
    id: 3,
    serial: 11259377,
    name: 'demo-madrid',
    uid: 'partner',
    country: 'Spain',
    model: 'Raspberry Pi 2 · RTL-SDR',
    sensing: true,
    latitude: 40.4168,
    longitude: -3.7038,
    lat: 40.4168,
    lon: -3.7038,
    hardware: 'esraspi2psdr',
    type: 'esraspi2psdr',
    frontend: 'rtl-sdr2',
    owner: 'partner',
  },
]

export const MOCK_STATUS: SensorStatusEntry[] = MOCK_SENSORS.map((s) => ({
  staticInfo: s,
  controllerInfo: {
    Status: s.sensing ? 'RUNNING' : 'OFF',
    SoftwareInfo: { ElectrosensePackage: 'mock-1.0' },
  },
}))

export const MOCK_STATS: NetworkStats = {
  sensors: MOCK_SENSORS,
  num_users: 42,
}

/** Deterministic sample SNR values. These are illustrative, never live measurements. */
export function mockSpectrumMatrix(rows = 48, cols = 128): number[][] {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      const t = x / Math.max(1, cols - 1)
      const noise = 3 + Math.abs(Math.sin(x * 12.98 + y * 7.23)) * 4
      const carrier =
        27 * Math.exp(-Math.pow((t - 0.17) / 0.013, 2)) +
        22 * Math.exp(-Math.pow((t - 0.38) / 0.024, 2)) +
        31 * Math.exp(-Math.pow((t - 0.73) / 0.018, 2))
      const intermittent = t > 0.46 && t < 0.57 && y % 16 < 10 ? 16 : 0
      return +(
        noise +
        carrier +
        intermittent +
        2 * Math.sin(y / 5 + x / 12)
      ).toFixed(2)
    }),
  )
}

export function mockRanking() {
  return MOCK_SENSORS.map((s, i) => ({
    rank: i + 1,
    name: s.name,
    serial: s.serial,
    score: 1000 - i * 120,
    hours: 720 - i * 40,
  }))
}

let mockWarned = false

export function warnMockOnce() {
  if (mockWarned || !import.meta.env?.DEV) return
  mockWarned = true
  console.warn(
    '[specscape] VITE_USE_MOCK_API is set — serving mock data instead of the real API.',
  )
  window.dispatchEvent(new Event('specscape:mock-api'))
}

export function isHtmlPayload(text: string) {
  const t = text.trimStart().slice(0, 32).toLowerCase()
  return t.startsWith('<!doctype') || t.startsWith('<html')
}

/** Fake /user/list entries in the exact shape of the real response. */
export const MOCK_USERS: AdminUser[] = [
  {
    uid: 'demo',
    username: 'demo',
    surname: 'User',
    fullName: 'Demo User',
    mail: 'demo@specscape.local',
    organization: 'SpecScape',
    postalAddress: null,
    telephoneNumber: null,
    postalCode: null,
    city: 'Zurich',
    country: 'Switzerland',
    enabled: true,
    authorities: [],
    admin: false,
    accountNonExpired: true,
    accountNonLocked: true,
    credentialsNonExpired: true,
  },
  {
    uid: 'alice',
    username: 'alice',
    surname: 'Example',
    fullName: 'Alice Example',
    mail: 'alice@example.com',
    organization: 'Example University',
    postalAddress: '1 Example Street',
    telephoneNumber: '000',
    postalCode: null,
    city: 'Leuven',
    country: 'Belgium',
    enabled: true,
    authorities: [],
    admin: false,
    accountNonExpired: true,
    accountNonLocked: true,
    credentialsNonExpired: true,
  },
  {
    uid: 'bob',
    username: 'bob',
    surname: 'Sample',
    fullName: 'Bob Sample',
    mail: 'bob@example.org',
    organization: 'None',
    postalAddress: null,
    telephoneNumber: null,
    postalCode: null,
    city: null,
    country: null,
    enabled: false,
    authorities: [],
    admin: false,
    accountNonExpired: true,
    accountNonLocked: true,
    credentialsNonExpired: true,
  },
  {
    uid: 'carol',
    username: 'carol',
    surname: 'Test',
    fullName: 'Carol Test',
    mail: 'carol@example.net',
    organization: 'Radio Club',
    postalAddress: null,
    telephoneNumber: null,
    postalCode: null,
    city: 'Madrid',
    country: 'Spain',
    enabled: false,
    authorities: [],
    admin: false,
    accountNonExpired: true,
    accountNonLocked: true,
    credentialsNonExpired: true,
  },
]

export function mockGet(path: string): unknown | undefined {
  warnMockOnce()
  const bare = path.split('?')[0]

  if (bare === '/network/stats') return MOCK_STATS
  if (bare === '/sensor/list') return MOCK_SENSORS
  if (bare === '/sensor/list/own')
    return MOCK_SENSORS.filter((s) => s.owner === 'demo')
  if (bare === '/sensor/status/list') return MOCK_STATUS
  if (bare === '/network/ranking/years') return [2024, 2025, 2026]
  if (bare === '/network/ranking/months')
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  if (bare === '/network/ranking') return mockRanking()
  if (bare === '/iq/datasets') {
    return {
      '11259375': [
        {
          name: 'FM-band-hour',
          size: 48_000_000,
          modified: Date.now() - 86400000,
          firstMeasurement: Date.now() - 90000000,
          lastMeasurement: Date.now() - 86400000,
          url: '#',
        },
      ],
      '11259376': [],
      '11259377': [
        {
          name: 'ADS-B-sample',
          size: 12_500_000,
          modified: Date.now() - 3600000,
          firstMeasurement: Date.now() - 7200000,
          lastMeasurement: Date.now() - 3600000,
        },
      ],
    }
  }
  if (bare === '/campaigns/add') {
    return { id: `mock-${Date.now()}`, status: 'Pending', ok: true }
  }
  if (bare === '/campaigns/current') {
    return [
      {
        id: 'mock-1',
        status: 'Pending',
        sensors: [11259375],
        senseParameters: {
          absoluteTime: Math.floor(Date.now() / 1000) + 3600,
          monitorTime: 30,
          minfreq: 1090000000,
          maxfreq: 1090000000,
        },
      },
    ]
  }
  if (bare === '/signaling/status') {
    return {
      connectedSensors: ['11259375', '11259376', 'None'],
      connectedClients: ['demo', 'alice', 'alice'],
      rtc: [{ clientUid: 'alice', sensorId: 11259375, start: now - 754 }],
    }
  }
  if (bare === '/signaling/time/user') {
    return [
      { uid: 'alice', duration: 15342 },
      { uid: 'demo', duration: 5400 },
      { uid: 'bob', duration: 610 },
    ]
  }
  if (bare === '/signaling/time/sensor') {
    return [
      { sensorId: 11259375, duration: 16100 },
      { sensorId: 11259376, duration: 5252 },
    ]
  }
  if (bare === '/signaling/time/hours') {
    return [8, 9, 10, 14, 15, 20].map((hour, i) => ({
      hour,
      startedSessions: i + 2,
    }))
  }
  if (bare === '/sensorDonation/list' || bare === '/sensorDonation/list/all') {
    return [
      {
        id: 1,
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        organization: 'Analytical Engines',
        status: 'PENDING',
        sensorType: 'ElectroSense Kit (RasPi + Dongle + Board)',
        created: now - 3 * 86400,
        deleted: null,
        shipped: null,
      },
      {
        id: 2,
        name: 'Nikola Tesla',
        email: 'nikola@example.com',
        organization: 'Wardenclyffe',
        status: 'APPROVED',
        sensorType: 'Extension Board only',
        created: now - 40 * 86400,
        deleted: null,
        shipped: now - 86400,
      },
    ]
  }
  if (bare.startsWith('/sensorDonation/application/')) {
    const id = bare.split('/').pop()
    return {
      id,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      organization: 'Analytical Engines',
      notes: 'Would host near Zurich.',
      status: 'PENDING',
    }
  }
  if (bare === '/sensorDonation/stats/monthly/') {
    // real shape is {"monthly": {...}} (captured empty); the YYYY-MM key format is inferred
    return {
      monthly: {
        '2026-08': {
          'ElectroSense Kit (RasPi + Dongle + Board)': {
            created: 3,
            deleted: 1,
            shipped: 1,
          },
          'Extension Board only': { created: 1, deleted: 0, shipped: 1 },
        },
        '2026-09': {
          'ElectroSense Kit (RasPi + Dongle + Board)': {
            created: 2,
            deleted: 0,
            shipped: 0,
          },
          'ElectroSense Kit (RasPi + Dongle)': {
            created: 1,
            deleted: 0,
            shipped: 0,
          },
        },
      },
    }
  }
  if (bare === '/sensorPrice/list') return []
  if (bare === '/user/list') return MOCK_USERS
  if (bare === '/user/profile') {
    return { uid: 'demo', mail: 'demo@specscape.local', fullName: 'Demo User' }
  }
  if (
    bare.startsWith('/sensor/') &&
    !bare.includes('registration') &&
    !bare.includes('exists')
  ) {
    const id = bare.replace('/sensor/', '')
    return (
      MOCK_SENSORS.find(
        (s) => String(s.serial) === id || String(s.id) === id,
      ) ?? MOCK_SENSORS[0]
    )
  }
  if (bare === '/spectrum/aggregated') {
    const params = new URLSearchParams(path.split('?')[1])
    const startFreq = Number(params.get('freqMin') ?? 20e6)
    const endFreq = Number(params.get('freqMax') ?? 1700e6)
    const requestedRes = Number(params.get('aggFreq') ?? 10e6)
    const freqRes = Math.max(
      requestedRes,
      Math.ceil((endFreq - startFreq) / 1200),
    )
    const startTime = Number(params.get('timeBegin') ?? now - 3600)
    const endTime = Number(params.get('timeEnd') ?? now)
    const timeRes = Math.max(
      Number(params.get('aggTime') ?? 60),
      Math.ceil((endTime - startTime) / 240),
    )
    const cols = Math.max(2, Math.ceil((endFreq - startFreq) / freqRes))
    const rows = Math.max(2, Math.ceil((endTime - startTime) / timeRes))
    return {
      values: mockSpectrumMatrix(rows, cols),
      startFreq,
      freqRes,
      startTime,
      timeRes,
    }
  }
  if (bare === '/sensor/registration-token') {
    return {
      value: 'MOCK-1234-5678',
      validUntil: Date.now() + 5 * 60 * 1000,
    }
  }
  return undefined
}
