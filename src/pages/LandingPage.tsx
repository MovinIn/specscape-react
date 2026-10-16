import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { NetworkStats } from '../api/types'
import LeafletMap from '../components/LeafletMap'
import { isPreview } from '../config/navigation'
import { sensorMarkers } from '../lib/sensors'

export default function LandingPage() {
  const [data, setData] = useState<NetworkStats | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [onlineOnly, setOnlineOnly] = useState(false)
  useEffect(() => {
    let cancelled = false
    api
      .getStats()
      .then((stats) => {
        if (!cancelled) {
          setData(stats)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [attempt])
  const sensors = useMemo(() => data?.sensors ?? [], [data])
  const online = sensors.filter((sensor) => sensor.sensing)
  const visible = onlineOnly ? online : sensors
  const markers = useMemo(
    () =>
      sensorMarkers(onlineOnly ? sensors.filter((s) => s.sensing) : sensors),
    [sensors, onlineOnly],
  )
  const count = (value: number | undefined) =>
    status === 'ready' && value != null ? value.toLocaleString() : '—'

  return (
    <div className="lx-overview">
      <section className="lx-hero" aria-labelledby="overview-heading">
        <div className="lx-hero-copy">
          <p className="lx-eyebrow">
            <span className="lx-pulse-dot" /> THE OPEN SPECTRUM NETWORK
          </p>
          <h1 id="overview-heading">
            A world of signals.
            <br />
            <span>A new perspective.</span>
          </h1>
          <p>
            Explore the invisible. Turn shared spectrum measurements into your
            next discovery.
          </p>
          <div className="lx-hero-actions">
            <Link to="/specmon" className="lx-button lx-button-primary">
              Explore the spectrum <span aria-hidden="true">↗</span>
            </Link>
            <Link to="/sensors" className="lx-text-link">
              Find a sensor <span aria-hidden="true">→</span>
            </Link>
          </div>
          <span className="lx-hero-footnote">
            OPEN DATA. COLLABORATIVE SCIENCE. REAL POSSIBILITIES.
          </span>
        </div>
        <div className="lx-signal-art" aria-hidden="true">
          <div className="lx-orbit lx-orbit-one" />
          <div className="lx-orbit lx-orbit-two" />
          <div className="lx-orbit lx-orbit-three" />
          <svg viewBox="0 0 420 260">
            <defs>
              <linearGradient
                id="signal-gradient"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="420"
                y2="0"
              >
                <stop stopColor="#9168e2" />
                <stop offset="1" stopColor="#57b5da" />
              </linearGradient>
            </defs>
            {Array.from({ length: 51 }, (_, i) => {
              const x = 32 + i * 7
              const h =
                15 +
                Math.pow(Math.sin(i * 0.43), 6) * 105 +
                Math.pow(Math.sin(i * 0.17), 12) * 64
              return (
                <path
                  key={i}
                  d={`M${x} ${145 - h / 2}v${h}`}
                  stroke="url(#signal-gradient)"
                  strokeWidth="2"
                  opacity={0.3 + (i % 5) * 0.13}
                />
              )
            })}
            <path
              d="M20 220h380M210 20v215"
              stroke="#a598bf"
              strokeOpacity=".1"
              strokeDasharray="3 5"
            />
            <circle
              cx="210"
              cy="145"
              r="100"
              fill="none"
              stroke="#9168e2"
              strokeOpacity=".2"
            />
          </svg>
          <span className="lx-art-coordinate lx-art-top">RF / EXPLORATION</span>
          <span className="lx-art-coordinate lx-art-bottom">
            20 MHz — 11.8 GHz <span>↗</span>
          </span>
        </div>
      </section>

      <section
        className="lx-stats"
        aria-label="Network snapshot"
        aria-live="polite"
      >
        <div className="lx-stat">
          <div>
            <span className="lx-stat-label">
              <span className="lx-pulse-dot" /> Sensing now
            </span>
            <strong>{count(online.length)}</strong>
          </div>
          <span className="lx-stat-caption">
            Sensors contributing measurements
          </span>
          <div className="lx-stat-meter">
            <span
              style={{
                width: sensors.length
                  ? `${(online.length / sensors.length) * 100}%`
                  : '0%',
              }}
            />
          </div>
        </div>
        <div className="lx-stat">
          <div>
            <span className="lx-stat-label">Connected by curiosity</span>
            <strong>{count(sensors.length)}</strong>
          </div>
          <span className="lx-stat-caption">
            Registered sensors across the network
          </span>
          <span className="lx-stat-index">01 / DISTRIBUTED SENSING</span>
        </div>
        <div className="lx-stat">
          <div>
            <span className="lx-stat-label">Research without borders</span>
            <strong>{count(data?.num_users)}</strong>
          </div>
          <span className="lx-stat-caption">Registered community members</span>
          <span className="lx-stat-index">02 / SHARED DISCOVERY</span>
        </div>
      </section>

      <section className="lx-network-section" aria-labelledby="network-heading">
        <div className="lx-section-heading">
          <div>
            <p className="lx-eyebrow">A GLOBAL PERSPECTIVE</p>
            <h2 id="network-heading">Every sensor opens a window.</h2>
          </div>
          <Link to="/sensors" className="lx-text-link">
            Explore the network <span aria-hidden="true">↗</span>
          </Link>
        </div>
        {status === 'error' && (
          <div className="lx-notice" role="alert">
            Network data is unavailable.{' '}
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
        <div className="lx-network-grid">
          <div className="lx-map-panel">
            <div className="lx-panel-topline">
              <span>
                <span className="lx-pulse-dot" />{' '}
                {isPreview ? 'Sample network' : 'Network snapshot'}
              </span>
              <div
                className="lx-segment"
                role="group"
                aria-label="Map sensor filter"
              >
                <button
                  type="button"
                  aria-pressed={!onlineOnly}
                  onClick={() => setOnlineOnly(false)}
                >
                  All sensors
                </button>
                <button
                  type="button"
                  aria-pressed={onlineOnly}
                  onClick={() => setOnlineOnly(true)}
                >
                  Sensing only
                </button>
              </div>
            </div>
            <LeafletMap
              markers={markers}
              center={[43, 5]}
              zoom={3}
              height={330}
              fitToMarkers
            />
            <div className="lx-map-caption">
              <span>
                {status === 'loading'
                  ? 'Loading network…'
                  : `${markers.length} sensors with a reported location`}
              </span>
              <span>
                <span className="lx-map-key" /> Sensing{' '}
                <span className="lx-map-key is-idle" /> Offline
              </span>
            </div>
          </div>
          <aside className="lx-start-panel">
            <span className="lx-mini-label">YOUR NEXT EXPERIMENT</span>
            <h3>
              From signal
              <br />
              to insight.
            </h3>
            <p>A connected workflow for open spectrum research.</p>
            <Link to="/sensors">
              <span>01</span>
              <div>
                Choose your viewpoint<small>Browse sensors by location</small>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
            <Link to="/specmon">
              <span>02</span>
              <div>
                Look a little closer<small>Inspect frequency and time</small>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
            <Link to="/specmon?view=map">
              <span>03</span>
              <div>
                Connect the dots<small>Explore the spatial lab</small>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
          </aside>
        </div>
      </section>

      <section
        className="lx-research-section"
        aria-labelledby="research-heading"
      >
        <div className="lx-section-heading">
          <div>
            <p className="lx-eyebrow">BUILT FOR THE CURIOUS</p>
            <h2 id="research-heading">Go beyond the surface.</h2>
          </div>
          <span className="lx-section-meta">
            ONE NETWORK. MANY POSSIBILITIES.
          </span>
        </div>
        <div className="lx-feature-grid">
          <Link to="/specmon" className="lx-feature">
            <span className="lx-feature-number">01 / OBSERVE</span>
            <i className="fa-solid fa-wave-square" aria-hidden="true" />
            <h3>
              The spectrum,
              <br />
              in full detail.
            </h3>
            <p>
              Move through time. Zoom into a band. See the measurements behind
              every signal.
            </p>
            <span className="lx-feature-link">
              Open spectrum monitor <span aria-hidden="true">↗</span>
            </span>
          </Link>
          <Link
            to="/specmon?view=map"
            className="lx-feature lx-feature-spatial"
          >
            <span className="lx-feature-number">
              02 / DISCOVER <small>LAB</small>
            </span>
            <i className="fa-solid fa-layer-group" aria-hidden="true" />
            <h3>
              A different
              <br />
              dimension of data.
            </h3>
            <p>
              Compare spectrum across H3 hexagons with tracks, band filters and
              spatial metrics.
            </p>
            <span className="lx-feature-link">
              Enter the spatial lab <span aria-hidden="true">↗</span>
            </span>
          </Link>
          <Link to="/api-spec" className="lx-feature">
            <span className="lx-feature-number">03 / BUILD</span>
            <i className="fa-solid fa-code" aria-hidden="true" />
            <h3>
              Your questions.
              <br />
              Open possibilities.
            </h3>
            <p>
              Bring spectrum data into your own experiments with the open
              research API.
            </p>
            <span className="lx-feature-link">
              Explore the API <span aria-hidden="true">↗</span>
            </span>
          </Link>
        </div>
      </section>
      <section
        className="lx-sensor-strip"
        aria-labelledby="sensor-strip-heading"
      >
        <div className="lx-section-heading">
          <h2 id="sensor-strip-heading">Start with a sensor.</h2>
          <Link to="/sensors" className="lx-text-link">
            View all <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="lx-sensor-shortlist">
          {visible.slice(0, 3).map((s) => (
            <Link
              to={`/specmon?sensor=${encodeURIComponent(String(s.serial))}`}
              key={String(s.serial)}
            >
              <span
                className={`lx-sensor-dot${s.sensing ? ' is-sensing' : ''}`}
              />
              <div>
                <strong>{s.name ?? s.serial}</strong>
                <small>
                  {s.sensing ? 'Sensing' : 'Offline'} ·{' '}
                  {s.model ?? s.type ?? 'Spectrum sensor'}
                </small>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
          {status === 'ready' && !visible.length && (
            <p>No sensors in this selection. Try the full network.</p>
          )}
        </div>
      </section>
      <section className="lx-community">
        <div>
          <p className="lx-eyebrow">BETTER TOGETHER</p>
          <h2>
            Make the invisible
            <br />
            accessible to everyone.
          </h2>
          <p>
            SpecScape is an open initiative to collect and understand spectrum
            data. Every sensor adds a new perspective.
          </p>
        </div>
        <Link to="/join" className="lx-button lx-button-primary">
          Contribute to the network <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </div>
  )
}
