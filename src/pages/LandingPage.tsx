import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { NetworkStats, Sensor } from '../api/types'
import LeafletMap, { type MapMarker } from '../components/LeafletMap'

export default function LandingPage() {
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [sensors, setSensors] = useState<Sensor[]>([])

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
    api
      .getSensors()
      .then((list) => {
        if (!cancelled) setSensors(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) setSensors([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const registered =
    typeof stats?.sensors === 'number' ? stats.sensors : sensors.length || '—'
  const users = typeof stats?.users === 'number' ? stats.users : '—'
  const online =
    typeof stats?.online === 'number'
      ? stats.online
      : typeof stats?.sensorsOnline === 'number'
        ? stats.sensorsOnline
        : '—'

  const markers = useMemo(() => {
    const out: MapMarker[] = []
    for (const s of sensors) {
      const lat = Number(s.latitude ?? s.lat)
      const lon = Number(s.longitude ?? s.lon)
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
  }, [sensors])

  return (
    <div className="landing">
      <section className="hero-jumbo" aria-label="Hero">
        <div className="hero-jumbo__bg" aria-hidden />
        <div className="hero-jumbo__content">
          <h1>Collaborative Spectrum Monitoring</h1>
        </div>
      </section>

      <section className="landing-section">
        <div className="page-header">
          <h2>What Is SpecScape?</h2>
        </div>
        <div className="landing-split">
          <div className="prose">
            <p>
              The SpecScape network is a crowd-sourcing initiative to collect and
              analyse spectrum data. It uses small radio sensors based on cheap
              commodity hardware and offers aggregated spectrum information over
              an open API.
            </p>
            <p>
              The initiative&apos;s goal is to sense the entire spectrum in
              populated regions of the world and to make the data available in
              real-time for different kinds of stakeholders who require a deeper
              knowledge of the actual spectrum usage.
            </p>
            <p>
              SpecScape is an open initiative in which everyone can contribute
              with spectrum measurements and access the collected data. If you
              want to take part of this initiative, get involved now by setting
              up a sensor at your place or{' '}
              <Link to="/contact">contact us</Link> to see how our data can help
              your business.
            </p>
          </div>
          <div className="text-center">
            <img
              src="/images/measure_original-300x246.jpg"
              alt="city scale spectrum measurements"
            />
          </div>
        </div>

        <div className="landing-cta-row">
          <Link className="btn btn-lg btn-default" to="/work-with-us">
            Work with Us!
          </Link>
          <Link className="btn btn-lg btn-primary" to="/join?apply">
            Apply for a Sensor!
          </Link>
        </div>
      </section>

      <section className="band-lavender">
        <div className="band-lavender-inner">
          <div className="page-header strong-rule">
            <h2>Live Spectrum Monitoring</h2>
          </div>
          <p>
            SpecScape enables you to monitor the spectrum of any sensor in the
            world with an interactive and live web application:
          </p>
          <div className="spectrum-labels">
            <span className="label-pill">Interactive Spectrum Monitor</span>
            <span className="label-pill">Historical Data</span>
            <span className="label-pill">Spectrum Decoding</span>
          </div>
          <div className="schema-figure">
            <img src="/images/schema-network.png" alt="schema" />
          </div>
        </div>
      </section>

      <section className="band-teal">
        <div className="band-teal-inner">
          <div className="page-header">
            <h2>Our Goal: Worldwide Coverage</h2>
          </div>
          <p>
            SpecScape already has active sensors all over the world. You can help
            us to increase coverage and density for better measurements!
          </p>
        </div>
      </section>

      <section className="landing-map" aria-label="Sensor map">
        <LeafletMap markers={markers} height={420} />
      </section>

      <section className="band-teal">
        <div className="counters">
          <div>
            <p className="counter-count">{registered}</p>
            <p className="counter-label">Registered Sensors</p>
          </div>
          <div>
            <p className="counter-count">{online}</p>
            <p className="counter-label">Online Sensors</p>
          </div>
          <div>
            <p className="counter-count">{users}</p>
            <p className="counter-label">Registered Users</p>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="page-header">
          <h2>Features</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <img
              src="/images/specmon-thumb.png"
              alt="Monitor"
              width={300}
              height={219}
            />
            <div className="caption">
              <h3>Interactive Web App</h3>
              <p>
                Live and historical spectrum data is accessible through an
                interactive spectrum monitoring web application.
              </p>
            </div>
          </article>
          <article className="feature-card">
            <img
              src="/images/blue-lego-block-md.png"
              alt="API"
              width={208}
              height={219}
            />
            <div className="caption">
              <h3>API</h3>
              <p>
                Access real-time spectrum data measurements through an open API.
                See the <Link to="/api-spec">specification</Link> fore more
                details.
              </p>
            </div>
          </article>
          <article className="feature-card">
            <img
              src="/images/github-lg.png"
              alt="Github"
              width={225}
              height={219}
            />
            <div className="caption">
              <h3>Open Source</h3>
              <p>
                We publish open source software and hardware. For more
                information on our code and hardware, see the{' '}
                <Link to="/open-source">Open Source page</Link>.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="band-lavender footer-band">
        <div className="landing-section">
          <div className="page-header strong-rule">
            <h2>Who Is Behind The Project?</h2>
          </div>
          <p>
            SpecScape is powered by Electrosense and operated by University of
            Wisconsin-Madison. ElectroSense is a non-profit organization based in
            Switzerland which aims at improving the way how the radio frequency
            spectrum is used.
          </p>
        </div>
      </section>
    </div>
  )
}
