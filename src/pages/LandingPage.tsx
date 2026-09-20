import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Sensor } from '../api/types'
import LeafletMap, { type MapMarker } from '../components/LeafletMap'

export default function LandingPage() {
  // /network/stats is public and carries the full sensor list plus the user
  // count, so it alone drives the counters and the map (matching index.js).
  const [allSensors, setAllSensors] = useState<Sensor[]>([])
  const [numUsers, setNumUsers] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .getStats()
      .then((data) => {
        if (cancelled) return
        setAllSensors(Array.isArray(data?.sensors) ? data.sensors : [])
        setNumUsers(
          typeof data?.num_users === 'number' ? data.num_users : null,
        )
      })
      .catch(() => {
        if (cancelled) return
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

  const registered = allSensors.length || '—'
  const online = allSensors.length ? sensingSensors.length : '—'
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
    <>
      <div className="jumbotron row-shadow" id="mainjumbo">
        <div className="jumbotron-full jumbotron-bg" />
        <div
          className="jumbotron-full"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div>
            <h1>Collaborative Spectrum Monitoring</h1>
          </div>
        </div>
      </div>

      <div id="frontpage">
        <div className="container container-row-padding-top container-row-padding-bottom">
          <div className="row">
            <div className="col-sm-12">
              <div className="page-header">
                <h2>What Is SpecScape?</h2>
              </div>
              <div className="col-sm-7 text-justify">
                <p>
                  The SpecScape network is a crowd-sourcing initiative to
                  collect and analyse spectrum data. It uses small radio
                  sensors based on cheap commodity hardware and offers
                  aggregated spectrum information over an open API.
                </p>
                <p>
                  The initiative&apos;s goal is to sense the entire spectrum
                  in populated regions of the world and to make the data
                  available in real-time for different kinds of stakeholders
                  who require a deeper knowledge of the actual spectrum
                  usage.
                </p>
                <p>
                  SpecScape is an open initiative in which everyone can
                  contribute with spectrum measurements and access the
                  collected data. If you want to take part of this
                  initiative, get involved now by setting up a sensor at
                  your place or <Link to="/contact">contact us</Link> to see
                  how our data can help your business.
                </p>
              </div>
              <div className="col-sm-5 text-center center-block">
                <img
                  src="/images/measure_original-300x246.jpg"
                  alt="city scale spectrum measurements"
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div
              className="col-sm-12 text-center"
              style={{
                marginTop: 30,
                borderTop: '1px solid #e3e3e3',
                borderBottom: '1px solid #e3e3e3',
                padding: 19,
              }}
            >
              <Link className="btn btn-lg btn-default" to="/work-with-us">
                Work with Us!
              </Link>{' '}
              <Link className="btn btn-lg btn-primary" to="/join?apply">
                Apply for a Sensor!
              </Link>
            </div>
          </div>
        </div>

        <div className="container-fluid">
          <div className="row row-shadow-top row-color-spectrum">
            <div className="col-xs-12">
              <div className="container">
                <div className="row">
                  <div className="col-sm-12 container-row-padding-top">
                    <div className="row">
                      <div className="text-justify col-sm-12">
                        <div
                          className="page-header"
                          style={{ borderBottom: '1px solid #b3b3b3' }}
                        >
                          <h2>Live Spectrum Monitoring</h2>
                        </div>
                        <p>
                          SpecScape enables you to monitor the spectrum of
                          any sensor in the world with an interactive and
                          live web application:
                        </p>

                        <div className="spectrum-labels">
                          <div>
                            <span
                              className="label label-primary"
                              title="Set multiple parameters such as the center frequency while getting live spectrum monitoring results!"
                            >
                              Interactive Spectrum Monitor
                            </span>
                          </div>
                          <div>
                            <span
                              className="label label-primary"
                              title="Access the historical data base and analyze data from the past!"
                            >
                              Historical Data
                            </span>
                          </div>
                          <div>
                            <span
                              className="label label-primary"
                              title="Access the historical data base and analyze data from the past!"
                            >
                              Spectrum Decoding
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '1em' }}>
                          <img src="/images/schema-network.png" alt="schema" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="col-sm-12 text-center"
                    style={{
                      marginTop: 30,
                      borderTop: '1px solid #b3b3b3',
                      padding: 19,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="row row-shadow-bottom row-color-spectrum">
            &nbsp;
          </div>
        </div>

        <div className="container-fluid">
          <div className="row row-shadow-top-dark row-color">
            <div className="col-xs-12">
              <div className="container">
                <div className="row">
                  <div className="col-xs-12">
                    <div className="page-header">
                      <h2>Our Goal: Worldwide Coverage</h2>
                    </div>
                    <div className="col-sm-8 text-justify">
                      <p>
                        SpecScape already has active sensors all over the
                        world. You can help us to increase coverage and
                        density for better measurements!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row row-background">
            <LeafletMap markers={markers} height={420} />
          </div>

          <div className="row row-color">
            <div className="col-xs-12">
              <div className="container">
                <div className="row" style={{ marginTop: 20 }}>
                  <div className="col-sm-4 counter">
                    <p className="counter-count">{registered}</p>
                    <p className="counter-label">Registered Sensors</p>
                  </div>
                  <div className="col-sm-4 counter">
                    <p className="counter-count">{online}</p>
                    <p className="counter-label">Online Sensors</p>
                  </div>
                  <div className="col-sm-4 counter">
                    <p className="counter-count">{users}</p>
                    <p className="counter-label">Registered Users</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row row-shadow-bottom-dark row-color">
            &nbsp;
          </div>
        </div>

        <div className="container container-row-padding-top container-row-padding-bottom">
          <div className="row">
            <div className="col-sm-12">
              <div className="page-header">
                <h2>Features</h2>
              </div>
            </div>
            <div className="col-sm-6 text-justify center-block">
              <div className="thumbnail" style={{ minHeight: 360 }}>
                <img
                  src="/images/specmon-thumb.png"
                  alt="Monitor"
                  width={300}
                  height={219}
                />
                <div className="caption">
                  <h3>Interactive Web App</h3>
                  <p>
                    Live and historical spectrum data is accessible through
                    an interactive spectrum monitoring web application.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-sm-6 text-justify center-block">
              <div className="thumbnail" style={{ minHeight: 360 }}>
                <img
                  src="/images/blue-lego-block-md.png"
                  alt="API"
                  width={208}
                  height={219}
                />
                <div className="caption">
                  <h3>API</h3>
                  <p>
                    Access real-time spectrum data measurements through an
                    open API. See the{' '}
                    <Link to="/api-spec">specification</Link> fore more
                    details.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-sm-6 text-justify center-block">
              <div className="thumbnail" style={{ minHeight: 360 }}>
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
                    <Link to="/open-source" target="_blank">
                      Open Source page
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container-fluid row-shadow row-color-orange">
          <div className="container container-row-padding-top container-row-padding-bottom">
            <div className="row">
              <div className="col-sm-12">
                <div
                  className="page-header"
                  style={{ borderBottom: '1px solid #b3b3b3' }}
                >
                  <h2>Who Is Behind The Project?</h2>
                </div>
                <p>
                  SpecScape is powered by Electrosense and operated by
                  University of Wisconsin-Madison. ElectroSense is a
                  non-profit organization based in Switzerland which aims at
                  improving the way how the radio frequency spectrum is
                  used.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
