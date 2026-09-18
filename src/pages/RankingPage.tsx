import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

type RankingRow = Record<string, unknown>

function cell(row: RankingRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null) return String(v)
  }
  return '—'
}

export default function RankingPage() {
  const [years, setYears] = useState<number[]>([])
  const [months, setMonths] = useState<number[]>([])
  const [year, setYear] = useState<number | ''>('')
  const [month, setMonth] = useState<number | ''>('')
  const [rows, setRows] = useState<RankingRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [y, m] = await Promise.all([api.getRankingYears(), api.getRankingMonths()])
        if (cancelled) return
        setYears(y ?? [])
        setMonths(m ?? [])
        if (y?.length) setYear(y[0])
        if (m?.length) setMonth(m[0])
      } catch {
        if (!cancelled) setError('Could not load ranking periods.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const timestamp = useMemo(() => {
    if (year === '' || month === '') return null
    return Date.UTC(Number(year), Number(month) - 1, 1) / 1000
  }, [year, month])

  useEffect(() => {
    if (timestamp === null) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.getRanking(timestamp)
        if (cancelled) return
        setRows(Array.isArray(data) ? (data as RankingRow[]) : [])
      } catch {
        if (!cancelled) setError('Could not load ranking.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [timestamp])

  return (
    <div className="page page-wide">
      <PageHeader title="Sensor ranking" lead="Contribution ranking by period." />
      <div className="stack form-grid">
        <div className="field">
          <label className="label" htmlFor="rank-year">
            Year
          </label>
          <select
            id="rank-year"
            className="input"
            value={year}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">—</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="rank-month">
            Month
          </label>
          <select
            id="rank-month"
            className="input"
            value={month}
            onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">—</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="muted">Loading…</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Sensor / owner</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{cell(row, ['rank', 'position', 'index']) || String(i + 1)}</td>
              <td>{cell(row, ['name', 'sensorName', 'username', 'owner'])}</td>
              <td>{cell(row, ['score', 'points', 'value'])}</td>
            </tr>
          ))}
          {!loading && rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="muted">
                No ranking data.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
