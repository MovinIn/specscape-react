import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api/client'
import type { Principal } from '../api/types'
import { isPreview, isLocalAdmin } from '../config/runtime'
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
} from './sessionContext'
export { useAuth } from './sessionContext'

const LOCAL_USER: AuthUser = { username: 'Linxiang', admin: true }

/** The API returns the signaling JWT as `Authorization: Bearer <token>` on /user/principal. */
function tokenFrom(res: Response): string | null {
  const header = res.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

function toBasicAuth(username: string, password: string) {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return `Basic ${btoa(binary)}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [backendUser, setUser] = useState<AuthUser | null>(
    isPreview ? { username: 'demo', admin: true } : null,
  )
  const [jwt, setJwt] = useState<string | null>(() =>
    isPreview
      ? 'preview-local-only'
      : localStorage.getItem('authentication_token'),
  )
  const [checkingSession, setCheckingSession] = useState(!isPreview)
  const user = backendUser ?? (isLocalAdmin ? LOCAL_USER : null)
  const loading = !isLocalAdmin && checkingSession

  useEffect(() => {
    if (isPreview) return
    let cancelled = false
    ;(async () => {
      try {
        // Session cookie (if any) is sent automatically; no credentials here.
        const res = await api.getPrincipal()
        if (!res.ok) {
          if (!cancelled) {
            setUser(null)
            setJwt(null)
          }
          return
        }
        const principal = (await res.json()) as Principal
        const token = tokenFrom(res)
        if (token && !cancelled) {
          localStorage.setItem('authentication_token', token)
          setJwt(token)
        }
        if (!cancelled) {
          setUser(
            principal?.username
              ? { username: principal.username, admin: principal.admin }
              : null,
          )
          if (!principal?.username) {
            localStorage.removeItem('authentication_token')
            setJwt(null)
          }
        }
      } catch {
        if (!cancelled) {
          setUser(null)
          setJwt(null)
        }
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const headers = {
      Authorization: toBasicAuth(username, password),
      'X-Requested-With': 'XMLHttpRequest',
    }

    let res: Response
    try {
      res = await api.getPrincipal(headers)
    } catch (err) {
      console.error('[auth] login request failed to reach the API:', err)
      return false
    }

    // 401 means the server rejected the username/password outright.
    if (res.status === 401) {
      console.warn('[auth] server rejected the credentials (HTTP 401).')
      return false
    }
    if (!res.ok) {
      console.warn(
        `[auth] unexpected response from /user/principal: ${res.status}. ` +
          `502 here means the API returned HTML (the SPA shell) instead of ` +
          `JSON — check the Network tab for the /api/user/principal request.`,
      )
      return false
    }

    // With no auth header the API answers 200 with {"username":null}, so a
    // 200 alone does not mean success — the body decides.
    const principal = (await res.json()) as Principal
    if (!principal?.username) {
      console.warn('[auth] HTTP 200 but username was null — not authenticated.')
      return false
    }

    const token = tokenFrom(res)
    if (token) {
      localStorage.setItem('authentication_token', token)
      setJwt(token)
    }

    // Second hit with the same credentials; the original Angular flow
    // reissued the identical request to pick up the CSRF token cookie.
    await api.getPrincipal(headers).catch(() => undefined)

    setUser({ username: principal.username, admin: principal.admin })
    return true
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    localStorage.removeItem('authentication_token')
    setJwt(null)
    setUser(null)
  }, [])

  const refreshJwt = useCallback(async () => {
    try {
      const res = await api.getPrincipal()
      const token = res.ok ? tokenFrom(res) : null
      const principal = res.ok ? ((await res.json()) as Principal) : null
      setUser(
        principal?.username
          ? { username: principal.username, admin: principal.admin }
          : null,
      )
      if (token) {
        localStorage.setItem('authentication_token', token)
        setJwt(token)
      } else {
        localStorage.removeItem('authentication_token')
        setJwt(null)
      }
      return token
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (isPreview) return
    const refresh = () => {
      void refreshJwt()
    }
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 30_000)
    return () => {
      window.removeEventListener('focus', refresh)
      window.clearInterval(timer)
    }
  }, [refreshJwt])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authenticated: Boolean(user),
      isAdmin: isLocalAdmin || Boolean(backendUser?.admin),
      backendAuthenticated: Boolean(backendUser),
      backendIsAdmin: Boolean(backendUser?.admin),
      checkingSession,
      jwt,
      login,
      logout,
      refreshJwt,
      loading,
    }),
    [
      user,
      backendUser,
      jwt,
      login,
      logout,
      refreshJwt,
      loading,
      checkingSession,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
