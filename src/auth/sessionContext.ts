import { createContext, useContext } from 'react'

export type AuthUser = { username: string; admin?: boolean }
export type AuthContextValue = {
  user: AuthUser | null
  authenticated: boolean
  isAdmin: boolean
  backendAuthenticated: boolean
  backendIsAdmin: boolean
  checkingSession: boolean
  jwt: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshJwt: () => Promise<string | null>
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
