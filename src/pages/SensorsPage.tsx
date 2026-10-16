import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { SensorStatusEntry } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import LeafletMap from '../components/LeafletMap'
import { WorkspaceHeading } from '../components/WorkspaceHeading'
import { isPreview } from '../config/navigation'
import { sensorMarkers, sensorMatches, sensorPosition } from '../lib/sensors'

export default function SensorsPage() {
  const { user, isAdmin } = useAuth()
  const [entries, setEntries] = useState<SensorStatusEntry[]>([])
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'sensing' | 'mine'>('all')
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const list = await api.getSensorStatus()
        if (!cancelled) {
          setEntries(Array.isArray(list) ? list : [])
          setStatus('ready')
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    void load()
    const timer = window.setInterval(() => void load(), 10_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [attempt])

  const sensors = useMemo(
    () => entries.flatMap((e) => (e.staticInfo ? [e.staticInfo] : [])),
    [entries],
  )
  const filtered = useMemo(
    () =>
      sensors.filter(
        (s) =>
          sensorMatches(s, query) &&
          (filter === 'all' ||
            (filter === 'sensing' ? s.sensing : s.uid === user?.username)),
      ),
    [sensors, query, filter, user?.username],
  )
  const markers = useMemo(() => sensorMarkers(filtered), [filtered])
  const selected =
    filtered.find((s) => String(s.serial) === selectedSerial) ?? filtered[0]
  const selectedStatus = entries.find(
    (e) => e.staticInfo?.serial === selected?.serial,
  )?.controllerInfo
  const position = selected ? sensorPosition(selected) : null
  const sensing = sensors.filter((s) => s.sensing).length
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !(
          e.target instanceof HTMLElement &&
          (e.target.closest('input, textarea, select') ||
            e.target.isContentEditable)
        )
      ) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', shortcut)
    return () => document.removeEventListener('keydown', shortcut)
  }, [])

  const selectFilter = (next: typeof filter) => {
    setFilter(next)
    setSelectedSerial(null)
  }

  return (
    <div className="lx-explorer">
      <WorkspaceHeading
        eyebrow="THE NETWORK, UP CLOSE"
        title="Find your perspective."
        description="A distributed network of sensors. One shared view of the spectrum."
      >
        <Link to="/sensors/add" className="lx-button lx-button-primary">
          <span aria-hidden="true">+</span> Add a sensor
        </Link>
      </WorkspaceHeading>
      <div className="lx-explorer-toolbar">
        <div className="lx-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            aria-label="Search sensors"
            placeholder="Search name, location or serial…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd>/</kbd>
        </div>
        <div className="lx-segment" role="group" aria-label="Filter sensors">
          <button
            type="button"
            aria-pressed={filter === 'all'}
            onClick={() => selectFilter('all')}
          >
            All <span>{sensors.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={filter === 'sensing'}
            onClick={() => selectFilter('sensing')}
          >
            Sensing <span>{sensing}</span>
          </button>
          <button
            type="button"
            aria-pressed={filter === 'mine'}
            onClick={() => selectFilter('mine')}
          >
            My sensors
          </button>
        </div>
      </div>
      {status === 'error' && (
        <div className="lx-notice" role="alert">
          Could not refresh the sensor network.{' '}
          <button
            type="button"
            onClick={() => {
              setStatus('loading')
              setAttempt((n) => n + 1)
            }}
          >
            Try again
          </button>
        </div>
      )}
      <div className="lx-explorer-grid">
        <section className="lx-sensor-list-panel" aria-label="Sensor results">
          <div className="lx-panel-topline">
            <span aria-live="polite">
              {status === 'loading'
                ? 'Loading sensors…'
                : `${filtered.length} sensor${filtered.length === 1 ? '' : 's'} found`}
            </span>
            <i className="fa-solid fa-list-ul" aria-hidden="true" />
          </div>
          <div className="lx-sensor-results">
            {filtered.map((s) => (
              <button
                type="button"
                key={String(s.serial)}
                aria-pressed={String(s.serial) === String(selected?.serial)}
                onClick={() => setSelectedSerial(String(s.serial))}
                className="lx-sensor-result"
              >
                <div className="lx-result-top">
                  <span className="lx-sensor-symbol">
                    <i
                      className="fa-solid fa-tower-broadcast"
                      aria-hidden="true"
                    />
                  </span>
                  <span
                    className={`lx-status-pill${s.sensing ? ' is-sensing' : ''}`}
                  >
                    <span />
                    {s.sensing ? 'Sensing' : 'Offline'}
                  </span>
                </div>
                <strong>{s.name ?? `Sensor ${s.serial}`}</strong>
                <span>{s.country ?? s.address ?? 'Location not provided'}</span>
                <small>
                  <span>#{s.serial}</span>
                  <span aria-hidden="true">↗</span>
                </small>
              </button>
            ))}
            {status !== 'loading' && !filtered.length && (
              <div className="lx-empty">
                <i className="fa-solid fa-binoculars" aria-hidden="true" />
                <h3>No sensors found.</h3>
                <p>Try a different search or explore the full network.</p>
                <button
                  type="button"
                  className="lx-button"
                  onClick={() => {
                    setQuery('')
                    selectFilter('all')
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </section>
        <section
          className="lx-map-panel lx-explorer-map"
          aria-label="Sensor locations"
        >
          <div className="lx-panel-topline">
            <span>
              <span className="lx-pulse-dot" />{' '}
              {isPreview ? 'Sample sensor network' : 'Sensor network'}
            </span>
            <span className="lx-mini-label">SELECT A MARKER TO EXPLORE</span>
          </div>
          <LeafletMap
            markers={markers}
            fitToMarkers
            selectedId={selected ? String(selected.serial) : undefined}
            height={420}
            onMarkerClick={(m) => setSelectedSerial(String(m.id))}
          />
          <div className="lx-map-caption">
            <span>
              {markers.length} of {filtered.length} sensors have a reported
              location
            </span>
            <span>© OpenStreetMap contributors</span>
          </div>
        </section>
      </div>
      {selected && (
        <section
          className="lx-sensor-detail"
          aria-labelledby="selected-sensor-heading"
        >
          <div className="lx-detail-intro">
            <p className="lx-eyebrow">SELECTED SENSOR</p>
            <h2 id="selected-sensor-heading">
              {selected.name ?? selected.serial}
            </h2>
            <span
              className={`lx-status-pill${selected.sensing ? ' is-sensing' : ''}`}
            >
              <span />
              {selected.sensing ? 'Sensing' : 'Offline'}
            </span>
          </div>
          <dl className="lx-detail-facts">
            <div>
              <dt>Location</dt>
              <dd>{selected.country ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt>Coordinates</dt>
              <dd>
                {position
                  ? `${position[0].toFixed(3)}°, ${position[1].toFixed(3)}°`
                  : 'Not provided'}
              </dd>
            </div>
            <div>
              <dt>Hardware</dt>
              <dd>{selected.model ?? selected.type ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd>
                {selected.position?.indoor == null
                  ? 'Not provided'
                  : selected.position.indoor
                    ? 'Indoor'
                    : 'Outdoor'}
              </dd>
            </div>
          </dl>
          <div className="lx-detail-actions">
            <Link
              className="lx-button lx-button-primary"
              to={`/specmon?sensor=${encodeURIComponent(String(selected.serial))}`}
            >
              View spectrum <span aria-hidden="true">↗</span>
            </Link>
            <Link
              className="lx-button"
              to={`/specmon?view=map&sensor=${encodeURIComponent(String(selected.serial))}`}
            >
              Spatial view
            </Link>
            <Link
              className="lx-text-link"
              to={`/spectrum-decoder?sensor=${encodeURIComponent(String(selected.serial))}`}
            >
              Open decoder <span aria-hidden="true">↗</span>
            </Link>
            {(isAdmin || selected.uid === user?.username) && (
              <Link className="lx-text-link" to={`/sensors/${selected.id}`}>
                Edit sensor
              </Link>
            )}
          </div>
          {selectedStatus && (
            <details className="lx-technical-details">
              <summary>Sensor & controller details</summary>
              <pre>
                {JSON.stringify(
                  { sensor: selected, controller: selectedStatus },
                  null,
                  2,
                )}
              </pre>
            </details>
          )}
        </section>
      )}
      <div className="lx-explorer-footnote">
        <span>
          Sensor status refreshes every 10 seconds.
          {isPreview && ' All sensors shown are illustrative sample data.'}
        </span>
        <Link to="/sensors/manage">
          Advanced sensor management <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </div>
  )
}
