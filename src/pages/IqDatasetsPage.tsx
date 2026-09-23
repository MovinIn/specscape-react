import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { Sensor } from '../api/types'
import { AccordionPanel } from '../components/AccordionPanel'

type Dataset = {
  id?: string | number
  modified?: string | number
  firstMeasurement?: string | number | null
  lastMeasurement?: string | number | null
  centerFrequency?: number
  antennaGain?: number
  samplingRate?: number
  size?: number
}

const UNITS = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB']

/** Exact port of `filesize` filter in iq-datasets.js. */
function filesize(bytes: number | undefined): string {
  if (bytes == null || Number.isNaN(bytes) || !Number.isFinite(bytes)) return '?'
  let unit = 0
  let b = bytes
  while (b >= 1024) {
    b /= 1024
    unit++
  }
  return `${b.toFixed(0)} ${UNITS[unit]}`
}

function formatDate(value: string | number | null | undefined, withMs: boolean): string {
  if (value == null) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  return withMs ? `${base}.${pad(d.getMilliseconds(), 3)}` : base
}

/** Exact port of iq-datasets.html / iq-datasets.js (IqDatasetsController). */
export default function IqDatasetsPage() {
  const [datasets, setDatasets] = useState<Record<string, Dataset[]>>({})
  const [senInfo, setSenInfo] = useState<Record<string, Sensor>>({})
  const [accordion, setAccordion] = useState<Record<string, boolean>>({})
  const [collapsed, setCollapsed] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [rawDatasets, sensors] = await Promise.all([
          api.getIqDatasets(),
          api.getSensors(),
        ])
        if (cancelled) return

        const info: Record<string, Sensor> = {}
        for (const s of sensors ?? []) {
          if (s.serial != null) info[String(s.serial)] = s
        }
        setSenInfo(info)

        const raw = (rawDatasets ?? {}) as Record<string, Dataset[]>
        const nextAccordion: Record<string, boolean> = {}
        const grouped: Record<string, Dataset[]> = {}
        for (const [serial, sets] of Object.entries(raw)) {
          const list = Array.isArray(sets) ? sets : []
          if (list.length > 0) nextAccordion[serial] = false
          grouped[serial] = list
        }
        setDatasets(grouped)
        setAccordion(nextAccordion)
      } catch (err) {
        console.error(err)
        if (!cancelled) setError('Could not retrieve data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const serials = useMemo(
    () => Object.keys(datasets).filter((k) => (datasets[k]?.length ?? 0) > 0),
    [datasets],
  )
  const hasData = serials.length > 0

  function toggleAccordion() {
    setAccordion((prev) => {
      const next: Record<string, boolean> = {}
      for (const k of Object.keys(prev)) next[k] = collapsed
      return next
    })
    setCollapsed((c) => !c)
  }

  function setOpen(serial: string, open: boolean) {
    setAccordion((prev) => {
      const next = { ...prev, [serial]: open }
      const allOpen = Object.values(next).every(Boolean)
      const allClosed = Object.values(next).every((v) => !v)
      if (allOpen) setCollapsed(false)
      if (allClosed) setCollapsed(true)
      return next
    })
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-12">
          <h1>IQ Data Sets</h1>

          <p>
            Here you can find all accessible I/Q measurements for your
            sensors. You can download them in two different formats:
          </p>
          <ul>
            <li>
              <strong>Avro</strong> - contains meta-information and
              measurement data. Avro is a widely-used binary serialization
              format which became popular within the Hadoop eco-system.
            </li>
            <li>
              <strong>Raw</strong> - contains only I/Q samples as a sequence
              of 32bit float values (little endian). If your processing
              pipeline or analysis tool cannot deal with Avro, this might be
              a good fit.
            </li>
          </ul>

          {!hasData && !loading ? (
            <p
              className="text-center text-muted"
              style={{ margin: '2em', fontSize: '14pt' }}
            >
              No measurements available ☹
            </p>
          ) : null}
          {loading ? (
            <p
              className="text-center text-muted"
              style={{ margin: '2em', fontSize: '14pt' }}
            >
              Loading...
            </p>
          ) : null}

          {error ? <div className="alert alert-danger">☹ {error}</div> : null}

          {hasData ? (
            <p className="text-right">
              <button
                className="btn btn-default btn-xs"
                type="button"
                onClick={toggleAccordion}
              >
                <span
                  className={`glyphicon ${
                    !collapsed ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right'
                  }`}
                />
                &nbsp;
                {collapsed ? 'Expand' : 'Collapse'} all
              </button>
            </p>
          ) : null}

          {serials.map((serial) => {
            const measurements = datasets[serial] ?? []
            const info = senInfo[serial]
            return (
              <AccordionPanel
                key={serial}
                heading={`Sensor ${info?.name ?? serial}`}
                open={accordion[serial] ?? false}
                onToggle={(open) => setOpen(serial, open)}
              >
                {info ? (
                  <dl className="dl-horizontal">
                    <dt>Serial/MAC</dt>
                    <dd>{String(info.serial)}</dd>
                    <dt>User</dt>
                    <dd>{info.uid}</dd>
                    <dt>Address</dt>
                    <dd>{info.address}</dd>
                    <dt>Country</dt>
                    <dd>{info.country}</dd>
                  </dl>
                ) : null}

                <table className="table table-condensed table-striped">
                  <thead>
                    <tr>
                      <th>First Measurement</th>
                      <th>Last Measurement</th>
                      <th>Center Frequency</th>
                      <th>Antenna Gain</th>
                      <th>Sampling Rate</th>
                      <th>File Size</th>
                      <th>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((m, i) => (
                      <tr key={String(m.id ?? i)}>
                        {m.firstMeasurement ? (
                          <td>{formatDate(m.firstMeasurement, true)}</td>
                        ) : (
                          <td>
                            <span className="text-muted">unknown</span>
                          </td>
                        )}

                        {m.lastMeasurement ? (
                          <td>{formatDate(m.lastMeasurement, true)}</td>
                        ) : (
                          <td>{formatDate(m.modified, false)}</td>
                        )}

                        {m.centerFrequency ? (
                          <td>{m.centerFrequency / 1_000_000}MHz</td>
                        ) : (
                          <td>
                            <span className="text-muted">unknown</span>
                          </td>
                        )}

                        {m.antennaGain ? (
                          <td>{m.antennaGain}dB</td>
                        ) : (
                          <td>
                            <span className="text-muted">unknown</span>
                          </td>
                        )}

                        {m.samplingRate ? (
                          <td>
                            {m.samplingRate >= 1_000_000 ? (
                              <span>{(m.samplingRate / 1_000_000).toFixed(3)}MS</span>
                            ) : (
                              <span>{m.samplingRate}/s</span>
                            )}
                          </td>
                        ) : (
                          <td>
                            <span className="text-muted">unknown</span>
                          </td>
                        )}

                        <td>{filesize(m.size)}</td>
                        <td>
                          <a
                            className="btn btn-sm btn-default"
                            title="Download as Raw File. Please be patient. The download might need a few seconds to start."
                            href={`/api/iq/download/raw?serial=${serial}&dataset=${m.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span className="glyphicon glyphicon-floppy-save" />
                            &nbsp;Raw
                          </a>{' '}
                          <a
                            className="btn btn-sm btn-primary"
                            title="Download as Avro"
                            href={`/api/iq/download/avro?serial=${serial}&dataset=${m.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span className="glyphicon glyphicon-floppy-save" />
                            &nbsp;Avro
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AccordionPanel>
            )
          })}
        </div>
      </div>
    </div>
  )
}
