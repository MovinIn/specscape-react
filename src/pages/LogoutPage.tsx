import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

const REDIRECT_MS = 1500

export default function LogoutPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await logout()
      } finally {
        if (!cancelled) setDone(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [logout])

  useEffect(() => {
    if (!done) return
    const t = window.setTimeout(() => navigate('/', { replace: true }), REDIRECT_MS)
    return () => window.clearTimeout(t)
  }, [done, navigate])

  return (
    <div className="page">
      <PageHeader title="Signed out" lead="You have been logged out of SpecScape." />
      <p className="muted">
        {done ? 'Redirecting home…' : 'Signing out…'}{' '}
        <Link to="/">Continue now</Link>
      </p>
    </div>
  )
}
