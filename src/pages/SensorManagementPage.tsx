import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { ControllerInfo, Sensor, SensorStatusEntry } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { EsLeafletMap, type MapSensor } from '../components/EsLeafletMap'
import { sensorPosition } from '../lib/sensors'

function coordsOf(s: Sensor): { lat: number; lon: number } | null {
  const point = sensorPosition(s)
  return point ? { lat: point[0], lon: point[1] } : null
}

function fmtDate(epochSeconds?: number | string | null): string {
  if (!epochSeconds) return ''
  const d = new Date(Number(epochSeconds) * 1000)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function fmtDateTime(epochSeconds?: number | string | null): string {
  if (!epochSeconds) return ''
  const d = new Date(Number(epochSeconds) * 1000)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  )
}

/** Mirrors the label markup of the original sensormap template. */
function StatusLabel({
  sensor,
  controller,
}: {
  sensor: Sensor
  controller?: ControllerInfo
}) {
  if (sensor.sensing && !sensor.liveDecoding) {
    return (
      <span
        className="label label-success"
        title="Sensor is sending data for a campaign"
      >
        sensing
      </span>
    )
  }
  if (sensor.sensing && sensor.liveDecoding) {
    return (
      <span className="label label-info" title="Sensor is live decoding">
        sensing
      </span>
    )
  }
  if (!controller || controller.Status === 'OFF') {
    return (
      <span className="label label-danger" title="Sensor is not connected">
        offline
      </span>
    )
  }
  if (controller.Status === 'ERROR') {
    return (
      <span className="label label-danger" title="Sensor is in an error state">
        ERROR
      </span>
    )
  }
  return <span className="label label-info">{controller.Status}</span>
}

function LastStatusCell({ sensor }: { sensor: Sensor }) {
  if (!sensor.lastConnectionEvent) {
    return <i title="Sensor has never sent any data">unknown</i>
  }
  return (
    <span
      title={
        sensor.sensing
          ? 'Time since sensor is sending data'
          : 'Last time sensor sent data'
      }
    >
      {fmtDateTime(sensor.lastConnectionEvent)}
    </span>
  )
}

function PositionBadge({ sensor, short }: { sensor: Sensor; short?: boolean }) {
  const indoor = Boolean(sensor.position?.indoor)
  if (short) return <span className="badge">{indoor ? 'IN' : 'OUT'}</span>
  return <span className="badge">{indoor ? 'INDOOR' : 'OUTDOOR'}</span>
}

export default function SensorsPage() {
  const { user, isAdmin } = useAuth()
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [statusMap, setStatusMap] = useState<Record<string, ControllerInfo>>({})
  const [selected, setSelected] = useState<Sensor | null>(null)
  const [search, setSearch] = useState('')
  const [statusDialog, setStatusDialog] = useState<Sensor | null>(null)
  const [mapOpen, setMapOpen] = useState(false)

  // /sensor/status/list carries both the sensor metadata and the controller
  // status, so it is the single source for this page (as in sensormap.js).
  const load = useCallback(async () => {
    try {
      const list = (await api.getSensorStatus()) as SensorStatusEntry[]
      if (!Array.isArray(list)) return
      const map: Record<string, ControllerInfo> = {}
      for (const entry of list) {
        const serial = entry.staticInfo?.serial
        if (serial !== undefined && serial !== null) {
          map[String(serial)] = (entry.controllerInfo ?? {}) as ControllerInfo
        }
      }
      setStatusMap(map)
      setSensors(list.map((e) => e.staticInfo).filter(Boolean) as Sensor[])
    } catch {
      // keep the previous list on a failed poll
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => void load(), 10_000)
    return () => window.clearInterval(id)
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sensors
    return sensors.filter((s) => JSON.stringify(s).toLowerCase().includes(q))
  }, [sensors, search])

  const mySensors = useMemo(
    () => filtered.filter((s) => s.uid === user?.username),
    [filtered, user],
  )
  const otherSensors = useMemo(
    () => filtered.filter((s) => s.uid !== user?.username),
    [filtered, user],
  )

  const mapSensors: MapSensor[] = useMemo(() => {
    const out: MapSensor[] = []
    for (const s of sensors) {
      const c = coordsOf(s)
      if (!c || s.serial === undefined) continue
      // EsLeafletMap reads position.latitude/longitude
      out.push({
        ...s,
        position: { ...(s.position ?? {}), latitude: c.lat, longitude: c.lon },
      })
    }
    return out
  }, [sensors])

  const statusRows = statusDialog
    ? statusMap[String(statusDialog.serial)]
    : undefined

  return (
    <div className="container-fluid">
      <header className="lx-admin-heading">
        <div>
          <h1>Sensor management</h1>
          <p>Hardware, controller status and configuration in one place.</p>
        </div>
        <Link to="/sensors" className="lx-button lx-button-secondary">
          Open sensor explorer <span aria-hidden="true">↗</span>
        </Link>
      </header>
      {selected && (
        <div className="alert alert-info">
          Selected: <strong>{selected.name ?? selected.serial}</strong> ·{' '}
          <Link to={`/specmon?sensor=${selected.serial}`}>Open spectrum</Link>
        </div>
      )}
      <div className="lx-management-grid">
        <details
          className="lx-management-location"
          onToggle={(e) => setMapOpen(e.currentTarget.open)}
        >
          <summary>
            Locate sensors on the map{' '}
            <span>{mapSensors.length} mapped sensors</span>
          </summary>
          <div className="lx-management-map">
            {mapOpen && (
              <EsLeafletMap
                sensors={mapSensors}
                scrolling
                height="100%"
                onSelect={(serial) => {
                  const found = sensors.find((s) => String(s.serial) === serial)
                  setSelected(found ?? null)
                }}
              />
            )}
          </div>
        </details>

        <div className="lx-management-table">
          <div className="row">
            <div className="col-sm-9">
              <Link to="/sensors/add" className="btn btn-success btn-sm">
                <span className="glyphicon glyphicon-plus-sign" />
                &nbsp;Add Sensor
              </Link>
            </div>
            <div className="col-sm-3">
              <div className="input-group input-group-sm">
                <span className="input-group-addon">
                  <span className="glyphicon glyphicon-search" />
                </span>
                <input
                  type="search"
                  aria-label="Search sensor management"
                  className="form-control"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {!isAdmin && (
            <>
              <div className="row">
                <div className="col-sm-12">
                  <h2>My Sensors</h2>
                  <table
                    className="table table-striped table-condensed table-pointer"
                    width="100%"
                  >
                    <thead>
                      <tr>
                        <th>Serial</th>
                        <th>Name</th>
                        <th>Position</th>
                        <th>Deployed</th>
                        <th>Status</th>
                        <th>Last Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {mySensors.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center">
                            No items
                          </td>
                        </tr>
                      ) : (
                        mySensors.map((s) => (
                          <tr
                            key={String(s.serial)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td onClick={() => setSelected(s)}>{s.serial}</td>
                            <td onClick={() => setSelected(s)}>{s.name}</td>
                            <td onClick={() => setSelected(s)}>
                              <PositionBadge sensor={s} short />
                            </td>
                            <td onClick={() => setSelected(s)}>
                              {fmtDate(s.deployed)}
                            </td>
                            <td onClick={() => setStatusDialog(s)}>
                              <StatusLabel
                                sensor={s}
                                controller={statusMap[String(s.serial)]}
                              />
                            </td>
                            <td onClick={() => setSelected(s)}>
                              <LastStatusCell sensor={s} />
                            </td>
                            <td className="text-right">
                              <Link
                                to={`/sensors/${s.id}`}
                                className="btn btn-default btn-xs"
                                title="Edit Sensor"
                              >
                                <span className="glyphicon glyphicon-edit" />
                              </Link>{' '}
                              <Link
                                to={`/specmon?sensor=${s.serial}`}
                                className="btn btn-primary btn-xs"
                                title="Show Spectrum"
                              >
                                <span className="glyphicon glyphicon-signal" />
                              </Link>{' '}
                              <Link
                                to={`/spectrum-decoder?sensor=${s.serial}`}
                                className="btn btn-xs"
                                style={{
                                  backgroundColor: '#7b3fb5',
                                  color: '#fff',
                                }}
                                title="Open Spectrum Decoder"
                              >
                                <span className="glyphicon glyphicon-headphones" />
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="row">
                <div className="col-sm-12">
                  <h2>Other Sensors</h2>
                  <table
                    className="table table-striped table-condensed table-pointer"
                    width="100%"
                  >
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Position</th>
                        <th>Deployed</th>
                        <th>Status</th>
                        <th>Last Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {otherSensors.map((s) => (
                        <tr
                          key={String(s.serial)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td onClick={() => setSelected(s)}>{s.name}</td>
                          <td onClick={() => setSelected(s)}>
                            <PositionBadge sensor={s} />
                          </td>
                          <td onClick={() => setSelected(s)}>
                            {fmtDate(s.deployed)}
                          </td>
                          <td onClick={() => setStatusDialog(s)}>
                            <StatusLabel
                              sensor={s}
                              controller={statusMap[String(s.serial)]}
                            />
                          </td>
                          <td onClick={() => setSelected(s)}>
                            <LastStatusCell sensor={s} />
                          </td>
                          <td
                            className="text-right"
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            <Link
                              to={`/specmon?sensor=${s.serial}`}
                              className="btn btn-primary btn-xs"
                              title="Show Spectrum"
                            >
                              <span className="glyphicon glyphicon-signal" />
                              &nbsp;Spectrum
                            </Link>{' '}
                            <Link
                              to={`/spectrum-decoder?sensor=${s.serial}`}
                              className="btn btn-xs"
                              style={{
                                backgroundColor: '#7b3fb5',
                                color: '#fff',
                              }}
                              title="Open Spectrum Decoder"
                            >
                              <span className="glyphicon glyphicon-headphones" />
                              &nbsp;Decoder
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {isAdmin && (
            <div className="row">
              <div className="col-sm-12">
                <table
                  className="table table-striped table-condensed table-pointer"
                  width="100%"
                >
                  <thead>
                    <tr>
                      <th>Serial</th>
                      <th>Name</th>
                      <th>Operator</th>
                      <th>Position</th>
                      <th>Deployed</th>
                      <th>F/W</th>
                      <th>Status</th>
                      <th>Last Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={String(s.serial)} style={{ cursor: 'pointer' }}>
                        <td onClick={() => setSelected(s)}>{s.serial}</td>
                        <td onClick={() => setSelected(s)}>{s.name}</td>
                        <td onClick={() => setSelected(s)}>
                          <span title={s.operator ?? undefined}>{s.uid}</span>
                        </td>
                        <td onClick={() => setSelected(s)}>
                          <PositionBadge sensor={s} />
                        </td>
                        <td onClick={() => setSelected(s)}>
                          {fmtDate(s.deployed)}
                        </td>
                        <td onClick={() => setSelected(s)}>
                          {statusMap[String(s.serial)]?.SoftwareInfo
                            ?.ElectrosensePackage ?? ''}
                        </td>
                        <td onClick={() => setStatusDialog(s)}>
                          <StatusLabel
                            sensor={s}
                            controller={statusMap[String(s.serial)]}
                          />
                        </td>
                        <td onClick={() => setSelected(s)}>
                          <LastStatusCell sensor={s} />
                        </td>
                        <td className="text-right">
                          <Link
                            to={`/sensors/${s.id}`}
                            className="btn btn-default btn-xs"
                            title="Edit Sensor"
                          >
                            <span className="glyphicon glyphicon-edit" />
                          </Link>{' '}
                          <Link
                            to={`/specmon?sensor=${s.serial}`}
                            className="btn btn-primary btn-xs"
                            title="Show Spectrum"
                          >
                            <span className="glyphicon glyphicon-signal" />
                          </Link>{' '}
                          <Link
                            to={`/spectrum-decoder?sensor=${s.serial}`}
                            className="btn btn-xs"
                            style={{
                              backgroundColor: '#7b3fb5',
                              color: '#fff',
                            }}
                            title="Open Spectrum Decoder"
                          >
                            <span className="glyphicon glyphicon-headphones" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {statusDialog && statusRows && (
        <div
          className="modal-backdrop-custom"
          onClick={() => setStatusDialog(null)}
        >
          <div
            className="modal-dialog-custom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Administrative Details</h3>
            </div>
            <div className="modal-body">
              <h4>Status</h4>
              <table className="table table-condensed">
                <tbody>
                  {Object.entries(statusRows).map(([k, v]) => (
                    <tr key={k}>
                      <td>
                        <strong>{k}</strong>
                      </td>
                      <td>{v === null || v === undefined ? '' : String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4>Information</h4>
              <table className="table table-condensed">
                <tbody>
                  {Object.entries(statusDialog).map(([k, v]) => (
                    <tr key={k}>
                      <td>
                        <strong>{k}</strong>
                      </td>
                      <td>
                        {v === null || v === undefined
                          ? ''
                          : typeof v === 'object'
                            ? JSON.stringify(v)
                            : String(v)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => setStatusDialog(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
