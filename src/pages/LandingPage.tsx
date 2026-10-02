import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { researchTools } from '../config/navigation'
import type { Sensor } from '../api/types'
import LeafletMap, { type MapMarker } from '../components/LeafletMap'

export default function LandingPage() {
  // /network/stats is public and carries the full sensor list plus the user
  // count, so it alone drives the counters and the map (matching index.js).
  const [allSensors, setAllSensors] = useState<Sensor[]>([])
  const [numUsers, setNumUsers] = useState<number | null>(null)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    api
      .getStats()
      .then((data) => {
        if (cancelled) return
        setStatus('ready')
        setAllSensors(Array.isArray(data?.sensors) ? data.sensors : [])
        setNumUsers(
          typeof data?.num_users === 'number' ? data.num_users : null,
        )
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
        setAllSensors([])
        setNumUsers(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sensingSensors = useMemo(
    () => allSensors.filter((s) => s.sensing),
    [allSensors],
  )

  const registered = status === 'ready' ? allSensors.length : '—'
  const online = status === 'ready' ? sensingSensors.length : '—'
  const users = numUsers ?? '—'

  const markers = useMemo(() => {
    const out: MapMarker[] = []
    for (const s of sensingSensors) {
      const pos = s.position as
        | { latitude?: number; longitude?: number }
        | undefined
      const lat = Number(pos?.latitude ?? s.latitude ?? s.lat)
      const lon = Number(pos?.longitude ?? s.longitude ?? s.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
      out.push({
        id: String(s.serial ?? s.id ?? `${lat},${lon}`),
        lat,
        lon,
        label: s.name ?? String(s.serial ?? ''),
        online: Boolean(s.sensing),
      })
    }
    return out
  }, [sensingSensors])

  return (
    <div className="home-backdrop">
      <header className="home-hero">
        <div className="overview-heading">
        <div><h1>Collaborative Spectrum Monitoring</h1></div>
        <Link to="/api-spec" className="btn btn-default"><i className="fa-solid fa-code" aria-hidden="true" /> Explore the API <span aria-hidden="true">↗</span></Link>
        </div>
      </header>
    <div className="research-home">
      <section aria-labelledby="tools-heading">
        <div className="section-heading"><div><h2 id="tools-heading">Research tools</h2></div></div>
        <div className="research-tools-grid">
          {researchTools.map((tool, index) => <Link to={tool.to} key={tool.to} className="research-tool-card">
            <div className="tool-card-top"><span className="tool-icon"><i className={`fa-solid fa-${tool.icon}`} aria-hidden="true" /></span><span className="tool-category">{tool.label}</span></div>
            <h3>{tool.title}</h3><p>{tool.description}</p>
            <div className="tool-card-bottom"><span>Open {index === 0 ? 'monitor' : index === 1 ? 'decoder' : index === 2 ? 'dashboard' : index === 3 ? 'datasets' : 'ranking'}</span><i className="fa-solid fa-arrow-right" aria-hidden="true" /></div>
          </Link>)}
          <div className="contribute-card"><span className="tool-icon"><i className="fa-solid fa-tower-broadcast" aria-hidden="true" /></span><h3>Better research starts<br />with broader coverage.</h3><p>Host a sensor and contribute measurements to an open research network.</p><Link to="/join">Contribute to the network <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div>
        </div>
      </section>
      <section className="network-section" aria-labelledby="network-heading">
        <div className="section-heading"><div><h2 id="network-heading">Add to a connected spectrum network.</h2></div><Link to="/sensors">View sensors <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div>
        <div className="network-panel">
          <div className="network-statistics" aria-live="polite">
            <div><span className="stat-label"><span className="status-dot" /> Online sensors</span><strong>{online}</strong></div>
            <div><span className="stat-label">Registered sensors</span><strong>{registered}</strong></div>
            <div><span className="stat-label">Registered users</span><strong>{users}</strong></div>
          </div>
          <LeafletMap markers={markers} height={330} center={[35, 10]} zoom={2} fitToMarkers />
        </div>
      </section>
      <section className="resource-section" aria-labelledby="resources-heading">
        <div className="section-heading"><h2 id="resources-heading">Build on shared knowledge.</h2></div>
        <div className="connected-resource-card">
          <Link to="/api-spec">
            <span className="tool-icon"><i className="fa-solid fa-code" aria-hidden="true" /></span>
            <span>API documentation</span>
            <i className="fa-solid fa-arrow-right resource-arrow" aria-hidden="true" />
          </Link>
          <Link to="/publications">
            <span className="tool-icon"><i className="fa-regular fa-file-lines" aria-hidden="true" /></span>
            <span>Publications</span>
            <i className="fa-solid fa-arrow-right resource-arrow" aria-hidden="true" />
          </Link>
          <Link to="/open-source">
            <span className="tool-icon"><i className="fa-brands fa-github" aria-hidden="true" /></span>
            <span>Open source</span>
            <i className="fa-solid fa-arrow-right resource-arrow" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
    </div>
  )
}
