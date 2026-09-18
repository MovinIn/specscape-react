import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

type Application = Record<string, unknown>

export default function SponsoringListPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.getAllSensorApplications()
        if (cancelled) return
        setApps(Array.isArray(list) ? (list as Application[]) : [])
      } catch {
        if (!cancelled) setError('Could not load sensor applications.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page page-wide">
      <PageHeader title="Sponsoring applications" lead="All sensor donation / sponsoring applications." />
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="muted">Loading…</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Applicant</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {apps.map((a, i) => {
            const id = a.id ?? a.applicationId ?? i
            return (
              <tr key={String(id)}>
                <td>{String(id)}</td>
                <td>{String(a.name ?? a.username ?? a.email ?? '—')}</td>
                <td>
                  <span className="badge">{String(a.status ?? a.state ?? '—')}</span>
                </td>
                <td>
                  <Link className="btn btn-ghost" to={`/sensor-application/${id}`}>
                    View
                  </Link>
                </td>
              </tr>
            )
          })}
          {!loading && apps.length === 0 ? (
            <tr>
              <td colSpan={4} className="muted">
                No applications.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
