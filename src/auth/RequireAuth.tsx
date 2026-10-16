import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { BackendAccess } from '../components/BackendAccess'
import { isLocalAdmin, isPreview } from '../config/runtime'

/** Paths that do not require authentication (mirrors Angular whitelist). */
export const PUBLIC_PATH_PREFIXES = [
  '/',
  '/contribute',
  '/datasets',
  '/hardware',
  '/open-source',
  '/join',
  '/sensor-setup',
  '/publications',
  '/partners',
  '/terms-of-service',
  '/privacy-policy',
  '/api-spec',
  '/contact',
  '/work-with-us',
  '/faq',
  '/login',
  '/logout',
  '/account',
  '/sensor-application-list',
] as const

export function isPublicPath(pathname: string) {
  if (pathname === '/') return true
  return PUBLIC_PATH_PREFIXES.some(
    (p) => p !== '/' && (pathname === p || pathname.startsWith(`${p}/`)),
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { authenticated, loading, backendAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="loading-screen">Checking session…</div>
  }

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  if (
    isLocalAdmin &&
    !isPreview &&
    !backendAuthenticated &&
    !['/sensors', '/sensors/manage', '/specmon', '/spectrum-decoder'].includes(
      location.pathname,
    )
  )
    return <BackendAccess block />
  return children
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const {
    isAdmin,
    authenticated,
    loading,
    backendAuthenticated,
    backendIsAdmin,
  } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="loading-screen">Checking session…</div>
  }

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  if (!isAdmin) {
    return <Navigate to="/sensors" replace />
  }

  if (!isPreview && (!backendAuthenticated || !backendIsAdmin))
    return <BackendAccess block admin />
  return children
}
