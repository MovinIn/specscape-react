import { fmtRange } from '../../lib/scheduleTime'

export type BarKind = 'mine' | 'other' | 'live'

export interface TimelineBar {
  key: string
  startMs: number
  /** null: open-ended. */
  stopMs: number | null
  kind: BarKind
  label: string
  past?: boolean
}

export interface TimelineRow {
  serial: string
  name: string
  bars: TimelineBar[]
}

export interface Proposed {
  startMs: number
  stopMs: number
  clash: boolean
}

type Props = {
  dayStartMs: number
  dayEndMs: number
  rows: TimelineRow[]
  proposed: Proposed | null
  slotSeconds: number
  onPick: (ms: number) => void
}

const KIND_TEXT: Record<BarKind, string> = {
  mine: 'Your booking',
  other: 'Booked',
  live: 'Live / open-ended',
}

/**
 * One day, one lane per selected sensor. Click a lane to move the start of the
 * new booking there (snapped to a slot). The text list under the lanes carries
 * the same information for keyboard and screen-reader users.
 */
export function AvailabilityTimeline({ dayStartMs, dayEndMs, rows, proposed, slotSeconds, onPick }: Props) {
  const total = dayEndMs - dayStartMs
  const pct = (ms: number) => Math.min(100, Math.max(0, ((ms - dayStartMs) / total) * 100))
  const now = Date.now()
  const showNow = now > dayStartMs && now < dayEndMs

  const ticks: number[] = []
  for (let h = 0; h <= 24; h += 3) ticks.push(dayStartMs + h * 3600000)

  if (rows.length === 0) {
    return <p className="text-muted xs-empty">Pick at least one sensor to see its day.</p>
  }

  return (
    <div className="xs-timeline">
      <div className="xs-axis" aria-hidden="true">
        <span className="xs-label" />
        <div className="xs-track">
          {ticks.map((t, i) => (
            <span key={t} className="xs-tick" style={{ left: `${pct(t)}%` }}>
              {i === 8 ? '24:00' : new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}
            </span>
          ))}
        </div>
      </div>

      {rows.map((row) => (
        <div className="xs-lane" key={row.serial}>
          <span className="xs-label" title={`${row.name} (${row.serial})`}>
            {row.name}
          </span>
          <div
            className="xs-track xs-clickable"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              const ms = dayStartMs + ((e.clientX - r.left) / r.width) * total
              onPick(Math.floor(ms / (slotSeconds * 1000)) * slotSeconds * 1000)
            }}
          >
            {ticks.map((t) => (
              <span key={t} className="xs-grid" style={{ left: `${pct(t)}%` }} />
            ))}
            {row.bars.map((b) => {
              const left = pct(b.startMs)
              const right = b.stopMs === null ? 100 : pct(b.stopMs)
              if (right <= left) return null
              return (
                <span
                  key={b.key}
                  className={`xs-bar xs-${b.kind}${b.past ? ' xs-past' : ''}${b.stopMs === null ? ' xs-open' : ''}`}
                  style={{ left: `${left}%`, width: `${right - left}%` }}
                  title={b.label}
                />
              )
            })}
            {proposed && (
              <span
                className={`xs-bar xs-new${proposed.clash ? ' xs-clash' : ''}`}
                style={{
                  left: `${pct(proposed.startMs)}%`,
                  width: `${Math.max(0.5, pct(proposed.stopMs) - pct(proposed.startMs))}%`,
                }}
                title={`New booking: ${fmtRange(proposed.startMs, proposed.stopMs)}`}
              />
            )}
            {showNow && <span className="xs-now" style={{ left: `${pct(now)}%` }} />}
          </div>
        </div>
      ))}

      <div className="xs-legend" aria-hidden="true">
        <span><i className="xs-key xs-new" /> New booking</span>
        <span><i className="xs-key xs-mine" /> Yours</span>
        <span><i className="xs-key xs-other" /> Booked</span>
        <span><i className="xs-key xs-live" /> Live / open-ended</span>
      </div>

      <details className="xs-text">
        <summary>Busy periods as text</summary>
        {rows.map((row) => (
          <div key={row.serial}>
            <strong>{row.name}</strong>
            {row.bars.length === 0 ? (
              <p className="text-muted">Nothing booked on this day.</p>
            ) : (
              <ul>
                {row.bars.map((b) => (
                  <li key={b.key}>
                    {KIND_TEXT[b.kind]}: {fmtRange(b.startMs, b.stopMs)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </details>
    </div>
  )
}
