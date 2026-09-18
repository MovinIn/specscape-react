import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'
import { useNotify } from '../components/Notifier'

export default function SensorTokenPage() {
  const { show } = useNotify()
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)

  const load = useCallback(async (force = false) => {
    setError(null)
    if (force) setRotating(true)
    else setLoading(true)
    try {
      const res = await api.getRegistrationToken(force)
      setToken(res?.token ?? null)
      if (force) show('Registration token rotated', 'success')
    } catch {
      setError('Could not load registration token.')
      setToken(null)
      show('Token request failed', 'error')
    } finally {
      setLoading(false)
      setRotating(false)
    }
  }, [show])

  useEffect(() => {
    void load(false)
  }, [load])

  async function copyToken() {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      show('Token copied', 'success')
    } catch {
      show('Could not copy token', 'error')
    }
  }

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Sensor registration token"
        lead="Use this token when provisioning a new SpecScape sensor."
      />
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="muted">Loading token…</p> : null}
      {!loading && token ? (
        <div className="panel stack">
          <p className="muted">Current token</p>
          <code style={{ wordBreak: 'break-all' }}>{token}</code>
          <button type="button" className="btn btn-ghost" onClick={() => void copyToken()}>
            Copy to clipboard
          </button>
        </div>
      ) : null}
      {!loading && !token && !error ? (
        <p className="muted">No token available.</p>
      ) : null}
      <div className="stack" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={rotating || loading}
          onClick={() => void load(true)}
        >
          {rotating ? 'Rotating…' : 'Rotate token'}
        </button>
        <Link className="btn btn-ghost" to="/sensors">
          Back to sensors
        </Link>
        <Link className="btn btn-ghost" to="/sensor-setup">
          Setup guide
        </Link>
      </div>
    </div>
  )
}
