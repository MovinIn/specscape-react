import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { RankingEntry } from '../api/types'
import { useAuth } from '../auth/AuthContext'

type Mode = 'month' | 'year'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export default function RankingPage() {
  const { user } = useAuth()
  const [mode, setMode] = useState<Mode>('month')
  const [monthsAvail, setMonthsAvail] = useState<number[]>([])
  const [yearsAvail, setYearsAvail] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [rows, setRows] = useState<RankingEntry[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [months, years] = await Promise.all([
        api.getRankingMonths().catch(() => [] as number[]),
        api.getRankingYears().catch(() => [] as number[]),
      ])
      if (cancelled) return
      const m = Array.isArray(months) ? [...months].sort((a, b) => b - a) : []
      const y = Array.isArray(years) ? [...years].sort((a, b) => b - a) : []
      setMonthsAvail(m)
      setYearsAvail(y)
      // Default to the most recent period with data.
      setSelected(m[0] ?? y[0] ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const load = useCallback(async (timestamp: number) => {
    setLoading(true)
    setRows(null)
    try {
      const data = await api.getRanking(timestamp)
      setRows(Array.isArray(data) ? data : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selected == null) return
    void load(selected)
  }, [selected, load])

  const options = useMemo(
    () => (mode === 'month' ? monthsAvail : yearsAvail),
    [mode, monthsAvail, yearsAvail],
  )

  // Keep the selection valid when switching between month and year mode.
  useEffect(() => {
    if (options.length === 0) return
    if (selected == null || !options.includes(selected)) {
      setSelected(options[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, options])

  function labelFor(value: number): string {
    if (mode === 'year') return String(value)
    const year = Math.floor(value / 100)
    const month = (value % 100) - 1
    return `${MONTH_NAMES[month] ?? '?'} ${year}`
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-12">
          <h1>Ranking</h1>

          <div className="row">
            <div className="col-sm-4 col-sm-offset-8">
              <div className="btn-group" style={{ float: 'left' }}>
                <button
                  type="button"
                  className={`btn btn-primary${mode === 'month' ? ' active' : ''}`}
                  onClick={() => setMode('month')}
                >
                  Month
                </button>
                <button
                  type="button"
                  className={`btn btn-primary${mode === 'year' ? ' active' : ''}`}
                  onClick={() => setMode('year')}
                >
                  Year
                </button>
              </div>
              <p className="input-group">
                <select
                  className="form-control"
                  value={selected ?? ''}
                  onChange={(e) => setSelected(Number(e.target.value))}
                >
                  {options.map((v) => (
                    <option key={v} value={v}>
                      {labelFor(v)}
                    </option>
                  ))}
                </select>
                <span className="input-group-btn">
                  <button type="button" className="btn btn-default" disabled>
                    <i className="glyphicon glyphicon-calendar" />
                  </button>
                </span>
              </p>
            </div>
          </div>

          {loading && (
            <div className="text-center">
              <h4>Loading...</h4>
            </div>
          )}

          {!loading && rows !== null && rows.length === 0 && (
            <div className="text-center">
              <h5>No ranking data for the selected time.</h5>
            </div>
          )}

          {!loading && rows !== null && rows.length > 0 && (
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Sensor</th>
                  <th>Username</th>
                  <th>Sensing Time (percent)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const mine = r.uid === user?.username
                  const top = r.rankAvailability === 1 && !mine
                  return (
                    <tr
                      key={`${r.serial}-${r.rankAvailability}`}
                      className={mine ? 'info' : top ? 'success' : undefined}
                    >
                      <td>{r.rankAvailability}</td>
                      <td>{r.name}</td>
                      <td>{r.uid}</td>
                      <td>
                        {typeof r.availability === 'number'
                          ? r.availability.toFixed(2)
                          : '—'}
                        %
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
