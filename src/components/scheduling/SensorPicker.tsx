import { useState } from 'react'
import type { Sensor } from '../../api/types'
import { MAX_SENSORS } from '../../lib/scheduleTime'

type Props = {
  sensors: Sensor[]
  selected: string[]
  onChange: (serials: string[]) => void
  username: string | undefined
  disabled?: boolean
}

const serialOf = (s: Sensor) => String(s.serial)
const ownerOf = (s: Sensor) => String(s.uid ?? s.owner ?? '')

/** Searchable checklist, capped at MAX_SENSORS (a booking cannot name more, and "all" is refused). */
export function SensorPicker({ sensors, selected, onChange, username, disabled }: Props) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const matches = (s: Sensor) =>
    q === '' || `${s.name ?? ''} ${s.serial ?? ''}`.toLowerCase().includes(q)

  const mine = sensors.filter((s) => username && ownerOf(s) === username && matches(s))
  const others = sensors.filter((s) => !(username && ownerOf(s) === username) && matches(s))
  const full = selected.length >= MAX_SENSORS

  function toggle(serial: string) {
    onChange(selected.includes(serial) ? selected.filter((x) => x !== serial) : [...selected, serial])
  }

  function group(title: string, list: Sensor[]) {
    if (list.length === 0) return null
    return (
      <li key={title}>
        <div className="xs-sensor-group">{title}</div>
        {list.map((s) => {
          const serial = serialOf(s)
          const checked = selected.includes(serial)
          const blocked = !checked && full
          return (
            <label key={serial} className={`xs-sensor${blocked ? ' is-disabled' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled || blocked}
                onChange={() => toggle(serial)}
              />
              <span className={`xs-dot${s.sensing ? ' is-on' : ''}`} title={s.sensing ? 'Sensing now' : 'Not sensing now'} />
              {s.name ?? serial}
              <small>({serial})</small>
            </label>
          )
        })}
      </li>
    )
  }

  return (
    <div>
      <label className="control-label" htmlFor="xs-sensor-search">
        Sensors{' '}
        <span className={`xs-count${full ? ' is-full' : ''}`}>
          {selected.length}/{MAX_SENSORS} selected
        </span>
      </label>
      <input
        id="xs-sensor-search"
        type="search"
        className="form-control"
        placeholder="Search sensors"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul className="xs-sensor-list">
        {group('My sensors', mine)}
        {group(mine.length > 0 ? 'Other sensors' : 'Sensors', others)}
        {mine.length + others.length === 0 && (
          <li className="text-muted" style={{ padding: 10 }}>
            {sensors.length === 0 ? 'No sensors loaded.' : 'No sensors match.'}
          </li>
        )}
      </ul>
      {full && <p className="help-block">A booking can include at most {MAX_SENSORS} sensors.</p>}
    </div>
  )
}
