import type {
  ContactPayload,
  NetworkStats,
  Principal,
  Sensor,
  SensorStatusEntry,
} from './types'
import { isHtmlPayload, mockGet } from './mock'

const API_ROOT = '/api'
const useMock =
  import.meta.env.VITE_USE_MOCK_API === 'true' ||
  import.meta.env.VITE_USE_MOCK_API === '1'

function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1')}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : null
}

function mergeHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init)
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest')
  }
  return headers
}

function fromMock<T>(path: string): T {
  const data = mockGet(path)
  if (data === undefined) {
    const err = new Error(`Mock API miss: ${path}`) as Error & { status?: number }
    err.status = 404
    throw err
  }
  return data as T
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (useMock) {
    return fromMock<T>(path)
  }

  const headers = mergeHeaders(init.headers)
  const method = (init.method ?? 'GET').toUpperCase()

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (method !== 'GET' && method !== 'HEAD') {
    const xsrf =
      getCookie('XSRF-TOKEN') ??
      getCookie('Xsrf-Token') ??
      getCookie('CSRF-TOKEN')
    if (xsrf && !headers.has('X-XSRF-TOKEN')) {
      headers.set('X-XSRF-TOKEN', xsrf)
    }
  }

  let res: Response
  try {
    res = await fetch(`${API_ROOT}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    })
  } catch {
    if (import.meta.env.DEV) return fromMock<T>(path)
    throw new Error(`Network error: ${path}`)
  }

  if (!res.ok) {
    if (import.meta.env.DEV) {
      try {
        return fromMock<T>(path)
      } catch {
        /* fall through */
      }
    }
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = undefined
    }
    const err = new Error(`API ${res.status}: ${path}`) as Error & {
      status?: number
      data?: unknown
    }
    err.status = res.status
    err.data = body
    throw err
  }

  if (res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  if (!text) return undefined as T

  if (isHtmlPayload(text)) {
    if (import.meta.env.DEV) return fromMock<T>(path)
    const err = new Error(`API returned HTML instead of JSON: ${path}`) as Error & {
      status?: number
    }
    err.status = 502
    throw err
  }

  try {
    return JSON.parse(text) as T
  } catch {
    if (import.meta.env.DEV && method === 'GET') return fromMock<T>(path)
    throw new Error(`Invalid JSON from ${path}`)
  }
}

function qs(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value))
    }
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

export const api = {
  getPrincipal(headers?: HeadersInit) {
    return (async () => {
      try {
        const res = await fetch(`${API_ROOT}/user/principal`, {
          method: 'GET',
          headers: mergeHeaders(headers),
          credentials: 'include',
        })
        if (res.ok) {
          const text = await res.clone().text()
          if (!isHtmlPayload(text)) return res
        }
      } catch {
        /* fall through to mock in DEV */
      }

      if (!import.meta.env.DEV && !useMock) {
        return new Response(null, { status: 401 })
      }

      mockGet('/user/profile')
      return new Response(JSON.stringify({ username: 'demo', admin: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt-demo',
        },
      })
    })()
  },

  logout() {
    return request<void>('/logout', { method: 'POST' }).catch(() => undefined)
  },

  getStats() {
    return request<NetworkStats>('/network/stats')
  },

  getSensors() {
    return request<Sensor[]>('/sensor/list')
  },

  getSensorStatus() {
    return request<SensorStatusEntry[]>('/sensor/status/list')
  },

  getSensor(id: string | number) {
    return request<Sensor>(`/sensor/${id}`)
  },

  addSensor(sensor: Sensor) {
    return request<Sensor>('/sensor/add', {
      method: 'POST',
      body: JSON.stringify(sensor),
    })
  },

  editSensor(sensor: Sensor) {
    return request<Sensor>(`/sensor/${sensor.id}`, {
      method: 'PUT',
      body: JSON.stringify(sensor),
    })
  },

  deleteSensor(id: string | number) {
    return request<void>(`/sensor/${id}`, { method: 'DELETE' })
  },

  checkSensorName(name: string) {
    return request<boolean>(`/sensor/exists/${encodeURIComponent(name)}`)
  },

  getOwnSensors() {
    return request<Sensor[]>('/sensor/list/own')
  },

  getRegistrationToken(force = false) {
    return request<{ token?: string }>(
      `/sensor/registration-token${force ? '?force=true' : ''}`,
    )
  },

  getRankingYears() {
    return request<number[]>('/network/ranking/years')
  },

  getRankingMonths() {
    return request<number[]>('/network/ranking/months')
  },

  getRanking(timestamp: number) {
    return request<unknown[]>(`/network/ranking${qs({ timestamp })}`)
  },

  getIqDatasets(serial = 0) {
    return request<unknown[]>(`/iq/datasets${qs({ serial })}`)
  },

  getCurrentCampaigns() {
    return request<unknown[]>('/campaigns/current')
  },

  addCampaign(campaign: unknown) {
    return request('/campaigns/add', {
      method: 'POST',
      body: JSON.stringify(campaign),
    })
  },

  contactInquiry(contact: ContactPayload) {
    return request('/contact', {
      method: 'POST',
      body: JSON.stringify(contact),
    })
  },

  getSignalingStatus() {
    return request('/signaling/status')
  },

  getSignalingWssUri() {
    return request<{ uri?: string }>('/signaling/wss-config')
  },

  getSensorApplications() {
    return request('/sensorDonation/list')
  },

  getAllSensorApplications() {
    return request('/sensorDonation/list/all')
  },

  getSensorApplication(id: string | number) {
    return request(`/sensorDonation/application/${id}`)
  },

  updateSensorApplication(appl: Record<string, unknown>) {
    return request(`/sensorDonation/application/${appl.id}`, {
      method: 'PUT',
      body: JSON.stringify(appl),
    })
  },

  getSensorApplicationStatsMonthly() {
    return request('/sensorDonation/stats/monthly/')
  },

  getSensorPrices() {
    return request('/sensorPrice/list')
  },

  getAccount() {
    return request('/user/profile')
  },

  updateAccount(payload: {
    currentPassword: string
    newDetails: Record<string, unknown>
  }) {
    return request('/user/updateProfile', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  registerAccount(payload: {
    user: Record<string, unknown>
    'g-recaptcha-response'?: string
  }) {
    return request('/user/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  activateAccount(uid: string, token: string) {
    return request(`/user/activate${qs({ uid, secret: token })}`)
  },

  reactivateAccount(uid: string, token: string) {
    return request(`/user/reactivate${qs({ uid, secret: token })}`)
  },

  updatePassword(data: Record<string, unknown>) {
    return request('/user/updatePassword', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  resendActivation(mail: string, captchaResponse?: string) {
    return request('/user/resendActivation', {
      method: 'POST',
      body: JSON.stringify({
        mail,
        'g-recaptcha-response': captchaResponse,
      }),
    })
  },

  requestPassword(mail: string, captchaResponse?: string) {
    return request('/user/forgotPassword', {
      method: 'POST',
      body: JSON.stringify({
        mail,
        'g-recaptcha-response': captchaResponse,
      }),
    })
  },

  resetPassword(uid: string, secret: string, password: string) {
    return request('/user/recover', {
      method: 'POST',
      body: JSON.stringify({ uid, secret, password }),
    })
  },

  requestUsername(mail: string, captchaResponse?: string) {
    return request('/user/forgotUsername', {
      method: 'POST',
      body: JSON.stringify({
        mail,
        'g-recaptcha-response': captchaResponse,
      }),
    })
  },

  getSpectrum(params: Record<string, string | number>) {
    return request(`/spectrum/aggregated${qs(params)}`)
  },
}

export type { Principal }
