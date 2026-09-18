import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

type StatRow = Record<string, unknown>

function num(row: StatRow, keys: string[]): number {
  for (const k of keys) {
    const v = row[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return 0
}

export default function SponsoringStatsPage() {
  const [stats, setStats] = useState<StatRow[] | StatRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.getSensorApplicationStatsMonthly()
        if (!cancelled) setStats(data as StatRow[] | StatRow)
      } catch {
        if (!cancelled) setError('Could not load monthly sponsoring stats.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const rows: StatRow[] = Array.isArray(stats) ? stats : stats ? [stats] : []
  const maxTotal = useMemo(
    () => Math.max(1, ...rows.map((r) => num(r, ['total', 'value', 'amount']))),
    [rows],
  )

  return (
    <div className="page page-wide">
      <PageHeader
        title="Sponsoring stats"
        lead="Monthly sensor application / donation statistics."
      />
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="muted">Loading…</p> : null}

      {rows.length > 0 ? (
        <div className="panel">
          <p className="muted">Monthly totals</p>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '0.5rem',
              height: 160,
              marginTop: '0.75rem',
            }}
            aria-label="Monthly sponsoring totals chart"
          >
            {rows.map((r, i) => {
              const total = num(r, ['total', 'value', 'amount'])
              const label = String(r.month ?? r.period ?? i + 1)
              return (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div
                    title={`${label}: ${total}`}
                    style={{
                      width: '100%',
                      maxWidth: 48,
                      height: `${(total / maxTotal) * 100}%`,
                      minHeight: 4,
                      borderRadius: 3,
                      background: 'linear-gradient(180deg, #2dd4bf, #0ea5e9)',
                    }}
                  />
                  <span className="muted" style={{ fontSize: '0.75rem' }}>
                    {label.replace(/^\d{4}-/, '')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Applications</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{String(r.month ?? r.period ?? r.year ?? i + 1)}</td>
                <td>{String(r.count ?? '—')}</td>
                <td>{String(r.total ?? r.value ?? r.amount ?? '—')}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  No stats available.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
