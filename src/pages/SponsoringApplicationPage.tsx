import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'
import { useNotify } from '../components/Notifier'

type AppForm = {
  name: string
  email: string
  organization: string
  notes: string
  status: string
}

const empty: AppForm = {
  name: '',
  email: '',
  organization: '',
  notes: '',
  status: '',
}

export default function SponsoringApplicationPage() {
  const { appId } = useParams<{ appId: string }>()
  const { show } = useNotify()
  const [form, setForm] = useState<AppForm>(empty)
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!appId) {
      setLoading(false)
      setError('Missing application id.')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const data = (await api.getSensorApplication(appId)) as Record<
          string,
          unknown
        >
        if (cancelled) return
        setRaw(data)
        setForm({
          name: String(data?.name ?? data?.username ?? ''),
          email: String(data?.email ?? data?.mail ?? ''),
          organization: String(data?.organization ?? data?.org ?? ''),
          notes: String(data?.notes ?? data?.message ?? ''),
          status: String(data?.status ?? data?.state ?? ''),
        })
      } catch {
        if (!cancelled) setError('Could not load application.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [appId])

  function update<K extends keyof AppForm>(key: K, value: AppForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!appId) return
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        ...(raw ?? {}),
        id: appId,
        name: form.name,
        email: form.email,
        organization: form.organization,
        notes: form.notes,
        status: form.status,
        state: form.status,
      }
      await api.updateSensorApplication(payload)
      setRaw(payload)
      show('Application updated', 'success')
    } catch {
      setError('Could not update application.')
      show('Update failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <PageHeader title="Sponsoring application" />
        <p className="muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Sponsoring application"
        lead={appId ? `Application #${appId}` : undefined}
      />
      {error ? <div className="error-banner">{error}</div> : null}
      <form className="stack form-grid" onSubmit={(e) => void onSubmit(e)}>
        <div className="field">
          <label className="label" htmlFor="app-name">
            Name
          </label>
          <input
            id="app-name"
            className="input"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="app-email">
            Email
          </label>
          <input
            id="app-email"
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="app-org">
            Organization
          </label>
          <input
            id="app-org"
            className="input"
            value={form.organization}
            onChange={(e) => update('organization', e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="app-status">
            Status
          </label>
          <select
            id="app-status"
            className="input"
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
          >
            <option value="">—</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="app-notes">
            Notes
          </label>
          <textarea
            id="app-notes"
            className="input"
            rows={4}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </div>
        <div className="stack" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
          <Link className="btn btn-ghost" to="/sensor-application-list">
            Back to list
          </Link>
        </div>
      </form>
      {raw !== null ? (
        <div className="panel" style={{ marginTop: '1.5rem' }}>
          <p className="muted">Raw payload</p>
          <pre className="prose" style={{ textAlign: 'left', overflow: 'auto' }}>
            {JSON.stringify(raw, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
