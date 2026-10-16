import type {
  AdminUser,
  AggregatedSpectrum,
  ContactPayload,
  NetworkStats,
  Principal,
  RankingEntry,
  Sensor,
  SensorStatusEntry,
  SignalingSensorTime,
  SignalingStatus,
  SignalingUsageHour,
  SignalingUserTime,
} from './types'
import { isHtmlPayload } from './mock'
import { previewRequest } from './previewStore'
import { isPreview as useMock } from '../config/runtime'

const API_ROOT = '/api'
let hasBackendSession = false
function rememberPrincipal(text: string) {
  try {
    hasBackendSession = Boolean(JSON.parse(text)?.username)
  } catch {
    hasBackendSession = false
  }
}
function accessDenied(error: unknown) {
  return [401, 403].includes(
    Number((error as { status?: number } | null)?.status),
  )
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1')}=([^;]*)`,
    ),
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

function fromMock<T>(path: string, init: RequestInit): T {
  const data = previewRequest(path, init)
  if (data === undefined) {
    const err = new Error(`Mock API miss: ${path}`) as Error & {
      status?: number
    }
    err.status = 404
    throw err
  }
  return data as T
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (useMock) {
    return fromMock<T>(path, init)
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
      // `no-store` keeps the browser from replaying stale API responses from
      // its disk cache — including error pages cached from an earlier,
      // misconfigured proxy target.
      cache: 'no-store',
      ...init,
      headers,
      credentials: 'include',
    })
  } catch {
    if (init.signal?.aborted) throw init.signal.reason
    throw new Error(`Network error: ${path}`)
  }
  if (import.meta.env.DEV && path.startsWith('/spectrum/aggregated'))
    console.info(`[SpecScape] Spectrum API: HTTP ${res.status}`)

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = undefined
    }
    const detail =
      Array.isArray(body) && typeof body[0] === 'string'
        ? body[0]
        : res.status === 403
          ? 'Backend access is required'
          : ''
    const err = new Error(
      `${detail || 'API request failed'} (${res.status})`,
    ) as Error & {
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
    const err = new Error(
      `API returned HTML instead of JSON: ${path}`,
    ) as Error & {
      status?: number
    }
    err.status = 502
    throw err
  }

  try {
    return JSON.parse(text) as T
  } catch {
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
  /**
   * GET /user/principal — the sole authentication endpoint.
   *
   * Pass a Basic auth header to log in; the server then sets the JSESSIONID
   * session cookie and an XSRF-TOKEN cookie, which authenticate every
   * subsequent request via `credentials: 'include'`.
   *
   * Note: this endpoint answers 200 even when unauthenticated, returning
   * `{"admin":false,"username":null}`. Callers must check `username`, not
   * the status code.
   */
  getPrincipal(headers?: HeadersInit) {
    return (async () => {
      if (useMock) {
        return new Response(JSON.stringify({ username: 'demo', admin: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-jwt-demo',
          },
        })
      }

      // `cache: 'no-store'` is essential: without it the browser will happily
      // replay a stale principal response from disk (including an error page
      // cached from a previously misconfigured proxy) and never hit the
      // network, which makes auth appear permanently broken.
      const res = await fetch(`${API_ROOT}/user/principal`, {
        method: 'GET',
        headers: mergeHeaders(headers),
        credentials: 'include',
        cache: 'no-store',
      })

      if (!res.ok) return res

      // Read the body once and rebuild the Response so callers always get a
      // readable stream regardless of what we inspect here.
      const text = await res.text()

      if (isHtmlPayload(text)) {
        console.warn(
          '[api] /user/principal returned HTML, not JSON — the proxy is ' +
            'almost certainly pointed at the wrong backend. Check ' +
            'VITE_API_PROXY_TARGET in .env.local and restart the dev server ' +
            '(make sure no stale vite process is still holding port 5173). ' +
            'First 200 chars:',
          text.slice(0, 200),
        )
        // Sending Basic auth can make some setups answer with a page rather
        // than JSON, even though the credentials were accepted and the
        // session cookie is now set. Re-read the principal over that plain
        // session before treating this as a failure.
        const retry = await fetch(`${API_ROOT}/user/principal`, {
          method: 'GET',
          headers: mergeHeaders(),
          credentials: 'include',
          cache: 'no-store',
        })
        const retryText = await retry.text()
        if (!isHtmlPayload(retryText)) {
          rememberPrincipal(retryText)
          return new Response(retryText, {
            status: retry.status,
            headers: retry.headers,
          })
        }
        console.warn(
          '[api] retry over the session cookie also returned HTML. ' +
            'First 200 chars:',
          retryText.slice(0, 200),
        )
        return new Response(null, { status: 502 })
      }

      rememberPrincipal(text)
      return new Response(text, { status: res.status, headers: res.headers })
    })()
  },

  logout() {
    return request<void>('/logout', { method: 'POST' }).catch(() => undefined)
  },

  getStats() {
    return request<NetworkStats>('/network/stats')
  },

  /** Unix-second timestamps (midnight) for every day the network was online. */
  getOnlineDays() {
    return request<number[]>('/network/onlineDays')
  },

  getActiveTimes(begin = 0, end = 0, granularity = 3600) {
    const timeEnd = end === 0 ? Math.floor(Date.now() / 1000) : end
    return request<unknown>(
      `/network/activeTimes${qs({ timeBegin: begin, timeEnd, granularity })}`,
    )
  },

  getActiveSensors(begin = 0, end = 0, granularity = 3600) {
    const timeEnd = end === 0 ? Math.floor(Date.now() / 1000) : end
    return request<unknown>(
      `/network/activeSensors${qs({ timeBegin: begin, timeEnd, granularity })}`,
    )
  },

  getActiveHours(dayBegin = 0, dayEnd = 0) {
    const end = dayEnd === 0 ? Math.floor(Date.now() / 1000) : dayEnd
    return request<unknown>(
      `/network/activeHours${qs({ dayBegin, dayEnd: end })}`,
    )
  },

  async getSensors() {
    if (!useMock && !hasBackendSession)
      return (await request<NetworkStats>('/network/stats')).sensors ?? []
    try {
      return await request<Sensor[]>('/sensor/list')
    } catch (error) {
      if (!useMock && accessDenied(error))
        return (await request<NetworkStats>('/network/stats')).sensors ?? []
      throw error
    }
  },

  async getSensorStatus() {
    if (!useMock && !hasBackendSession)
      return (
        (await request<NetworkStats>('/network/stats')).sensors ?? []
      ).map((staticInfo) => ({ staticInfo }))
    try {
      return await request<SensorStatusEntry[]>('/sensor/status/list')
    } catch (error) {
      if (!useMock && accessDenied(error))
        return (
          (await request<NetworkStats>('/network/stats')).sensors ?? []
        ).map((staticInfo) => ({ staticInfo }))
      throw error
    }
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
    return request<{ value: string; validUntil: string | number }>(
      `/sensor/registration-token${force ? '?force=true' : ''}`,
    )
  },

  getRankingYears() {
    return request<number[]>('/network/ranking/years')
  },

  getRankingMonths() {
    return request<number[]>('/network/ranking/months')
  },

  /** `timestamp` is a YYYYMM month key, e.g. 202609. */
  getRanking(timestamp: number) {
    return request<RankingEntry[]>(`/network/ranking${qs({ timestamp })}`)
  },

  getIqDatasets(serial = 0) {
    return request<Record<string, unknown[]>>(`/iq/datasets${qs({ serial })}`)
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
    return request<SignalingStatus>('/signaling/status')
  },

  getSignalingUserTimes() {
    return request<SignalingUserTime[]>('/signaling/time/user')
  },

  getSignalingSensorTimes() {
    return request<SignalingSensorTime[]>('/signaling/time/sensor')
  },

  getSignalingUsageTimes() {
    return request<SignalingUsageHour[]>('/signaling/time/hours')
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

  /** GET /user/list — all users (admin only). Read-only. */
  listUsers() {
    return request<AdminUser[]>('/user/list')
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

  /**
   * Aggregated spectrum for one sensor. `extended=true` matches what the
   * production UI sends and makes the response include the `bands` and
   * `noiseFloor` fields.
   */
  getSpectrum(
    params: {
      sensor: string | number
      timeBegin: number
      timeEnd: number
      freqMin?: number
      freqMax?: number
      aggFreq: number
      aggTime: number
      aggFun?: 'AVG' | 'MAX'
    },
    signal?: AbortSignal,
  ) {
    return request<AggregatedSpectrum | undefined>(
      `/spectrum/aggregated${qs({
        freqMin: 20000000,
        freqMax: 1700000000,
        aggFun: 'AVG',
        extended: true,
        ...params,
      })}`,
      { signal },
    ).then((data) => data ?? { values: [] })
  },
}

export type { Principal }
