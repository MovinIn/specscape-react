import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Sensor } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import LeafletMap, { type MapMarker } from '../components/LeafletMap'
import PageHeader from '../components/PageHeader'

type ControllerInfo = {
  Status?: string
  [key: string]: unknown
}

function sensorCoords(s: Sensor): { lat: number; lon: number } | null {
  const lat = Number(s.latitude ?? s.lat)
  const lon = Number(s.longitude ?? s.lon)
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon }
  return null
}

function statusLabel(
  sensor: Sensor,
  controller?: ControllerInfo,
): { text: string; kind: 'online' | 'offline' | 'info' } {
  if (sensor.sensing) {
    return { text: 'sensing', kind: 'online' }
  }
  const status = controller?.Status
  if (!controller || status === 'OFF') {
    return { text: 'offline', kind: 'offline' }
  }
  if (status === 'ERROR') {
    return { text: 'error', kind: 'offline' }
  }
  return { text: String(status ?? 'unknown'), kind: 'info' }
}

export default function SensorsPage() {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [ownSerials, setOwnSerials] = useState<Set<string>>(new Set())
  const [statusMap, setStatusMap] = useState<Record<string, ControllerInfo>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSensors = useCallback(async () => {
    try {
      const [list, own] = await Promise.all([
        api.getSensors(),
        api.getOwnSensors().catch(() => [] as Sensor[]),
      ])
      setSensors(Array.isArray(list) ? list : [])
      setOwnSerials(
        new Set(
          (Array.isArray(own) ? own : [])
            .map((s) => s.serial)
            .filter((s) => s !== undefined && s !== null)
            .map(String),
        ),
      )
      setError(null)
    } catch {
      setError('Could not load sensors.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      const list = await api.getSensorStatus()
      const map: Record<string, ControllerInfo> = {}
      for (const entry of list ?? []) {
        const serial = entry.staticInfo?.serial
        if (serial !== undefined && serial !== null) {
          map[String(serial)] = (entry.controllerInfo ?? {}) as ControllerInfo
        }
      }
      setStatusMap(map)
    } catch {
      // keep last known status on poll failure
    }
  }, [])

  useEffect(() => {
    void loadSensors()
    void loadStatus()
  }, [loadSensors, loadStatus])

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadStatus()
    }, 10_000)
    return () => window.clearInterval(id)
  }, [loadStatus])

  const markers: MapMarker[] = useMemo(() => {
    const result: MapMarker[] = []
    for (const s of sensors) {
      const coords = sensorCoords(s)
      if (!coords || s.serial === undefined) continue
      const label = statusLabel(s, statusMap[String(s.serial)])
      result.push({
        id: s.serial,
        lat: coords.lat,
        lon: coords.lon,
        label: s.name ?? String(s.serial),
        online: label.kind === 'online',
      })
    }
    return result
  }, [sensors, statusMap])

  function canManage(s: Sensor) {
    if (isAdmin) return true
    if (s.serial !== undefined && ownSerials.has(String(s.serial))) return true
    if (user?.username && s.owner === user.username) return true
    return false
  }

  async function onDelete(id: string | number, name?: string) {
    const label = name ?? String(id)
    if (!window.confirm(`Delete sensor “${label}”? This cannot be undone.`)) return
    try {
      await api.deleteSensor(id)
      setSensors((prev) =>
        prev.filter((s) => String(s.id ?? s.serial) !== String(id)),
      )
    } catch {
      setError(`Could not delete sensor ${label}.`)
    }
  }

  return (
    <div className="page page-wide">
      <PageHeader title="Sensors" lead="Network sensors and live status." />
      <div className="stack">
        <Link className="btn btn-primary" to="/sensors/add">
          Add sensor
        </Link>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="muted">Loading sensors…</p> : null}

      <div className="panel">
        <LeafletMap
          markers={markers}
          onMarkerClick={(m) => navigate(`/sensors/${m.id}`)}
        />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Serial</th>
              <th>Status</th>
              <th>Location</th>
              <th>Hardware</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sensors.map((s) => {
              const serial = s.serial
              const key = String(serial ?? s.id ?? s.name)
              const label = statusLabel(
                s,
                serial !== undefined ? statusMap[String(serial)] : undefined,
              )
              const coords = sensorCoords(s)
              const manage = canManage(s)
              return (
                <tr key={key}>
                  <td>
                    {serial !== undefined ? (
                      <Link to={`/sensors/${serial}`}>{s.name ?? serial}</Link>
                    ) : (
                      (s.name ?? '—')
                    )}
                  </td>
                  <td className="muted">{serial ?? '—'}</td>
                  <td>
                    <span
                      className={
                        label.kind === 'online'
                          ? 'badge badge-online'
                          : label.kind === 'offline'
                            ? 'badge badge-offline'
                            : 'badge'
                      }
                    >
                      {label.text}
                    </span>
                  </td>
                  <td className="muted">
                    {coords
                      ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`
                      : '—'}
                  </td>
                  <td>{s.hardware ?? '—'}</td>
                  <td>
                    {serial !== undefined ? (
                      <>
                        <Link
                          className="btn btn-ghost"
                          to={`/specmon?sensor=${serial}`}
                        >
                          SpecMon
                        </Link>{' '}
                        {manage ? (
                          <>
                            <Link
                              className="btn btn-ghost"
                              to={`/sensors/${serial}`}
                            >
                              Edit
                            </Link>{' '}
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() =>
                                void onDelete(s.id ?? serial, s.name)
                              }
                            >
                              Delete
                            </button>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </td>
                </tr>
              )
            })}
            {!loading && sensors.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No sensors found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
