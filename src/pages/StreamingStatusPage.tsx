import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

export default function StreamingStatusPage() {
  const { isAdmin, authenticated } = useAuth()
  const [status, setStatus] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authenticated || !isAdmin) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.getSignalingStatus()
        if (!cancelled) setStatus(data)
      } catch {
        if (!cancelled) setError('Could not load signaling status.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authenticated, isAdmin])

  if (!authenticated || !isAdmin) {
    return (
      <div className="page">
        <PageHeader title="Streaming status" />
        <div className="error-banner">Admin access required.</div>
      </div>
    )
  }

  const summary =
    status && typeof status === 'object'
      ? Object.entries(status as Record<string, unknown>)
          .slice(0, 8)
          .map(([k, v]) => ({ k, v: typeof v === 'object' ? JSON.stringify(v) : String(v) }))
      : []

  return (
    <div className="page page-wide">
      <PageHeader title="Streaming status" lead="Admin view of WebRTC signaling health." />
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="muted">Loading…</p> : null}
      {summary.length > 0 ? (
        <div className="stack">
          {summary.map(({ k, v }) => (
            <div className="panel" key={k}>
              <strong>{k}</strong>
              <p className="muted">{v}</p>
            </div>
          ))}
        </div>
      ) : null}
      {status !== null ? (
        <div className="panel">
          <p className="muted">Raw JSON</p>
          <pre className="prose" style={{ textAlign: 'left', overflow: 'auto' }}>
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
