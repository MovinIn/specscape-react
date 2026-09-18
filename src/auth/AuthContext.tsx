import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api/client'
import type { Principal } from '../api/types'

type AuthUser = {
  username: string
  admin?: boolean
}

type AuthContextValue = {
  user: AuthUser | null
  authenticated: boolean
  isAdmin: boolean
  jwt: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toBasicAuth(username: string, password: string) {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return `Basic ${btoa(binary)}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [jwt, setJwt] = useState<string | null>(
    () => localStorage.getItem('authentication_token'),
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.getPrincipal()
        if (!res.ok) {
          if (!cancelled) setUser(null)
          return
        }
        const principal = (await res.json()) as Principal
        if (!cancelled) {
          setUser(
            principal?.username
              ? { username: principal.username, admin: principal.admin }
              : null,
          )
        }
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
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
    const res = await api.getPrincipal(headers)
    if (!res.ok) return false
    const principal = (await res.json()) as Principal
    if (!principal?.username) return false

    const authHeader = res.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      localStorage.setItem('authentication_token', token)
      setJwt(token)
    }

    // Second principal hit establishes CSRF cookie (Angular parity).
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authenticated: Boolean(user),
      isAdmin: Boolean(user?.admin),
      jwt,
      login,
      logout,
      loading,
    }),
    [user, jwt, login, logout, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
