import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Sensor } from '../api/types'
import PageHeader from '../components/PageHeader'

type IqDataset = {
  name?: string
  path?: string
  url?: string
  size?: number
  modified?: string | number | Date
  firstMeasurement?: string | number | Date
  lastMeasurement?: string | number | Date
  [key: string]: unknown
}

type DatasetsBySerial = Record<string, IqDataset[]>

function asDate(value: unknown): Date | null {
  if (value == null) return null
  if (value instanceof Date) return value
  const d = new Date(value as string | number)
  return Number.isFinite(d.getTime()) ? d : null
}

function formatWhen(value: unknown): string {
  const d = asDate(value)
  return d ? d.toLocaleString() : '—'
}

function formatBytes(n?: number): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

function normalizeDatasets(raw: unknown): DatasetsBySerial {
  if (!raw) return {}
  if (Array.isArray(raw)) {
    const grouped: DatasetsBySerial = { all: raw as IqDataset[] }
    return grouped
  }
  if (typeof raw === 'object') {
    const out: DatasetsBySerial = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      out[k] = Array.isArray(v) ? (v as IqDataset[]) : []
    }
    return out
  }
  return {}
}

export default function IqDatasetsPage() {
  const [bySerial, setBySerial] = useState<DatasetsBySerial>({})
  const [sensors, setSensors] = useState<Record<string, Sensor>>({})
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [raw, list] = await Promise.all([
          api.getIqDatasets(),
          api.getSensors().catch(() => [] as Sensor[]),
        ])
        if (cancelled) return
        const grouped = normalizeDatasets(raw)
        const info: Record<string, Sensor> = {}
        for (const s of list ?? []) {
          if (s.serial != null) info[String(s.serial)] = s
        }
        setSensors(info)
        setBySerial(grouped)
        const initial: Record<string, boolean> = {}
        for (const [k, sets] of Object.entries(grouped)) {
          if (sets.length) initial[k] = false
        }
        setOpen(initial)
      } catch {
        if (!cancelled) setError('Could not load IQ datasets.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const serials = useMemo(
    () =>
      Object.keys(bySerial)
        .filter((k) => (bySerial[k]?.length ?? 0) > 0)
        .sort(),
    [bySerial],
  )

  const allOpen = serials.length > 0 && serials.every((s) => open[s])

  function toggleAll() {
    const next = !allOpen
    setOpen((prev) => {
      const copy = { ...prev }
      for (const s of serials) copy[s] = next
      return copy
    })
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="I/Q datasets"
        lead="Recorded captures grouped by sensor — download when links are available."
      />
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="muted">Loading datasets…</p> : null}

      {serials.length > 0 ? (
        <div className="stack">
          <button type="button" className="btn btn-ghost" onClick={toggleAll}>
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      ) : null}

      <div className="stack">
        {serials.map((serial) => {
          const sets = bySerial[serial] ?? []
          const sensor = sensors[serial]
          const title = sensor?.name
            ? `${sensor.name} (${serial})`
            : `Sensor ${serial}`
          const isOpen = Boolean(open[serial])
          return (
            <section key={serial} className="panel">
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'space-between' }}
                aria-expanded={isOpen}
                onClick={() =>
                  setOpen((prev) => ({ ...prev, [serial]: !prev[serial] }))
                }
              >
                <span>
                  {title}{' '}
                  <span className="muted">· {sets.length} dataset(s)</span>
                </span>
                <span aria-hidden>{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen ? (
                <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>First</th>
                        <th>Last</th>
                        <th>Modified</th>
                        <th>Size</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sets.map((ds, i) => {
                        const href =
                          typeof ds.url === 'string'
                            ? ds.url
                            : typeof ds.path === 'string'
                              ? ds.path
                              : null
                        return (
                          <tr key={String(ds.name ?? ds.path ?? i)}>
                            <td>{String(ds.name ?? `Dataset ${i + 1}`)}</td>
                            <td className="muted">
                              {formatWhen(ds.firstMeasurement)}
                            </td>
                            <td className="muted">
                              {formatWhen(ds.lastMeasurement)}
                            </td>
                            <td className="muted">{formatWhen(ds.modified)}</td>
                            <td className="muted">
                              {formatBytes(
                                typeof ds.size === 'number' ? ds.size : undefined,
                              )}
                            </td>
                            <td>
                              {href ? (
                                <a
                                  className="btn btn-ghost"
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Download
                                </a>
                              ) : (
                                <Link
                                  className="btn btn-ghost"
                                  to={`/specmon?sensor=${serial}`}
                                >
                                  SpecMon
                                </Link>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          )
        })}
      </div>

      {!loading && serials.length === 0 ? (
        <p className="muted">No I/Q datasets found for your account.</p>
      ) : null}
    </div>
  )
}
