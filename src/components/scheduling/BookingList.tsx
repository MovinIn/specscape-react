import { useState } from 'react'
import type { Booking } from '../../api/scheduleTypes'
import { fmtLength, fmtRange, spanOf } from '../../lib/scheduleTime'

type Props = {
  bookings: Booking[]
  sensorName: (serial: string) => string
  showIssuer: boolean
  editingId: number | null
  busyId: number | null
  onEdit: (b: Booking) => void
  onCancel: (b: Booking) => void
}

const isUpcoming = (b: Booking) => b.status === 'Pending' || b.status === 'Running'

export function BookingList({ bookings, sensorName, showIssuer, editingId, busyId, onEdit, onCancel }: Props) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const upcoming = bookings.filter(isUpcoming).sort((a, b) => spanOf(a).startMs - spanOf(b).startMs)
  const past = bookings.filter((b) => !isUpcoming(b)).sort((a, b) => spanOf(b).startMs - spanOf(a).startMs)
  const rows = tab === 'upcoming' ? upcoming : past

  return (
    <div>
      <ul className="nav nav-pills" style={{ marginBottom: 10 }}>
        <li className={tab === 'upcoming' ? 'active' : undefined}>
          <a href="#upcoming" onClick={(e) => { e.preventDefault(); setTab('upcoming') }}>
            Upcoming <span className="badge">{upcoming.length}</span>
          </a>
        </li>
        <li className={tab === 'past' ? 'active' : undefined}>
          <a href="#past" onClick={(e) => { e.preventDefault(); setTab('past') }}>
            Past <span className="badge">{past.length}</span>
          </a>
        </li>
      </ul>

      {rows.length === 0 ? (
        <p className="text-muted">{tab === 'upcoming' ? 'No upcoming bookings.' : 'No past bookings.'}</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-condensed table-striped">
            <thead>
              <tr>
                <th>#</th>
                {showIssuer && <th>Booked by</th>}
                <th>Sensors</th>
                <th>When</th>
                <th>Length</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const { startMs, stopMs } = spanOf(b)
                const mutable = b.status === 'Pending' || b.status === 'Running'
                return (
                  <tr key={b.id} className={editingId === b.id ? 'info' : undefined}>
                    <td>{b.id}</td>
                    {showIssuer && <td>{b.issuer}</td>}
                    <td>{b.sensors.length === 0 ? 'All sensors' : b.sensors.map(sensorName).join(', ')}</td>
                    <td>{fmtRange(startMs, stopMs)}</td>
                    <td>{stopMs === null ? '—' : fmtLength((stopMs - startMs) / 1000)}</td>
                    <td><span className={`xs-status is-${b.status}`}>{b.status}</span></td>
                    <td className="xs-actions">
                      {mutable && confirmId === b.id ? (
                        <>
                          <span className="text-muted">Cancel this booking?</span>{' '}
                          <button type="button" className="btn btn-danger btn-xs" disabled={busyId === b.id}
                            onClick={() => { setConfirmId(null); onCancel(b) }}>
                            Yes, cancel
                          </button>
                          <button type="button" className="btn btn-default btn-xs" onClick={() => setConfirmId(null)}>
                            Keep
                          </button>
                        </>
                      ) : mutable ? (
                        <>
                          {b.status === 'Pending' && (
                            <button type="button" className="btn btn-default btn-xs" disabled={busyId === b.id}
                              onClick={() => onEdit(b)}>
                              Edit
                            </button>
                          )}
                          <button type="button" className="btn btn-default btn-xs" disabled={busyId === b.id}
                            onClick={() => setConfirmId(b.id)}>
                            Cancel
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
