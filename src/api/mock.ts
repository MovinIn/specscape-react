import type { NetworkStats, Sensor, SensorStatusEntry } from './types'

const now = Math.floor(Date.now() / 1000)

export const MOCK_SENSORS: Sensor[] = [
  {
    id: 1,
    serial: 11259375,
    name: 'demo-zurich',
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
  sensors: MOCK_SENSORS.length,
  users: 42,
  online: MOCK_SENSORS.filter((s) => s.sensing).length,
}

/** Simple synthetic spectrum matrix (time × freq). */
export function mockSpectrumMatrix(rows = 48, cols = 128): number[][] {
  const matrix: number[][] = []
  for (let y = 0; y < rows; y++) {
    const row: number[] = []
    for (let x = 0; x < cols; x++) {
      const band = Math.sin((x / cols) * Math.PI * 4 + y * 0.15)
      const noise = Math.random() * 0.25
      row.push(-90 + band * 25 + noise * 10)
    }
    matrix.push(row)
  }
  return matrix
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
  if (mockWarned || !import.meta.env.DEV) return
  mockWarned = true
  console.warn(
    '[specscape] Live API unreachable (TLS/HTML). Using mock data. Set VITE_API_PROXY_TARGET or fix electrosense.org SSL.',
  )
  window.dispatchEvent(new Event('specscape:mock-api'))
}

export function isHtmlPayload(text: string) {
  const t = text.trimStart().slice(0, 32).toLowerCase()
  return t.startsWith('<!doctype') || t.startsWith('<html')
}

export function mockGet(path: string): unknown | undefined {
  warnMockOnce()
  const bare = path.split('?')[0]

  if (bare === '/network/stats') return MOCK_STATS
  if (bare === '/sensor/list') return MOCK_SENSORS
  if (bare === '/sensor/list/own') return MOCK_SENSORS.filter((s) => s.owner === 'demo')
  if (bare === '/sensor/status/list') return MOCK_STATUS
  if (bare === '/network/ranking/years') return [2024, 2025, 2026]
  if (bare === '/network/ranking/months') return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
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
      mock: true,
      sessions: 3,
      sensorsOnline: 2,
      peakClients: 12,
      wssHealthy: false,
    }
  }
  if (bare === '/sensorDonation/list' || bare === '/sensorDonation/list/all') {
    return [
      {
        id: 1,
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        organization: 'Analytical Engines',
        status: 'PENDING',
      },
      {
        id: 2,
        name: 'Nikola Tesla',
        email: 'nikola@example.com',
        organization: 'Wardenclyffe',
        status: 'APPROVED',
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
    return [
      { month: '2026-01', count: 4, total: 1200 },
      { month: '2026-02', count: 6, total: 2100 },
      { month: '2026-03', count: 3, total: 900 },
      { month: '2026-04', count: 8, total: 3200 },
      { month: '2026-05', count: 5, total: 1800 },
    ]
  }
  if (bare === '/sensorPrice/list') return []
  if (bare === '/user/profile') {
    return { uid: 'demo', mail: 'demo@specscape.local', fullName: 'Demo User' }
  }
  if (bare.startsWith('/sensor/') && !bare.includes('registration') && !bare.includes('exists')) {
    const id = bare.replace('/sensor/', '')
    return (
      MOCK_SENSORS.find((s) => String(s.serial) === id || String(s.id) === id) ??
      MOCK_SENSORS[0]
    )
  }
  if (bare === '/spectrum/aggregated') {
    return { values: mockSpectrumMatrix(), mock: true, generatedAt: now }
  }
  if (bare === '/sensor/registration-token') {
    return { token: 'mock-registration-token-demo' }
  }
  return undefined
}
