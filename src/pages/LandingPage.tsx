import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { NetworkStats } from '../api/types'

export default function LandingPage() {
  const [stats, setStats] = useState<NetworkStats | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .getStats()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sensors = typeof stats?.sensors === 'number' ? stats.sensors : '—'
  const users = typeof stats?.users === 'number' ? stats.users : '—'
  const online =
    typeof stats?.online === 'number'
      ? stats.online
      : typeof stats?.sensorsOnline === 'number'
        ? stats.sensorsOnline
        : '—'

  return (
    <div className="page">
      <section className="hero hero-glow">
        <p className="brand reveal">SpecScape</p>
        <h1 className="reveal">
          Collaborative spectrum monitoring for the real radio environment
        </h1>
        <p className="reveal">
          Crowdsourced sensors, open data, and an API that make spectrum usage
          visible in real time.
        </p>
        <div className="reveal" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" to="/join">
            Join
          </Link>
          <Link className="btn btn-ghost" to="/sensors">
            Explore sensors
          </Link>
        </div>
      </section>

      <section className="stack reveal">
        <h2>Network at a glance</h2>
        <div className="grid-2">
          <div className="panel">
            <p className="muted">Registered sensors</p>
            <p>
              <strong>{sensors}</strong>
            </p>
          </div>
          <div className="panel">
            <p className="muted">Online sensors</p>
            <p>
              <strong>{online}</strong>
            </p>
          </div>
          <div className="panel">
            <p className="muted">Registered users</p>
            <p>
              <strong>{users}</strong>
            </p>
          </div>
        </div>
      </section>

      <section className="stack reveal">
        <h2>What you can do</h2>
        <div className="grid-2">
          <div className="stack">
            <h3>Live &amp; historical monitoring</h3>
            <p className="muted">
              Inspect occupancy and power across the network with interactive
              spectrum tools.
            </p>
          </div>
          <div className="stack">
            <h3>Open API</h3>
            <p className="muted">
              Pull aggregated measurements for research and products—see the{' '}
              <Link to="/api-spec">API overview</Link>.
            </p>
          </div>
          <div className="stack">
            <h3>Open hardware</h3>
            <p className="muted">
              Flash a Pi image, attach an RTL-SDR, and contribute—{' '}
              <Link to="/open-source">source and designs</Link>.
            </p>
          </div>
          <div className="stack">
            <h3>Worldwide coverage</h3>
            <p className="muted">
              Grow density where it matters by hosting a node near you.
            </p>
          </div>
        </div>
      </section>

      <section className="panel stack reveal">
        <h2>See the map</h2>
        <p>
          SpecScape already spans sensors across continents. Explore live nodes,
          then add yours to fill the gaps.
        </p>
        <p>
          <Link className="btn btn-primary" to="/sensors">
            Open sensor map
          </Link>
        </p>
      </section>
    </div>
  )
}
