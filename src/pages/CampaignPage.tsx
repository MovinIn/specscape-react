import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Sensor } from '../api/types'
import PageHeader from '../components/PageHeader'
import { useNotify } from '../components/Notifier'

type Campaign = {
  id?: string | number
  sensors?: (string | number)[]
  startTime?: number
  endTime?: number
  senseParameters?: {
    absoluteTime?: number
    monitorTime?: number
    minfreq?: number
    maxfreq?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

function iqTemplate(sensorIds: (string | number)[] = []): Campaign {
  return {
    status: 'Pending',
    command: 'es_sensor',
    sensors: sensorIds,
    senseParameters: {
      measurementType: 'IQ',
      sampRate: 2_400_000,
      sslCollector:
        'collector.specscape.org:5002#certs/CA-Cert.pem#certs/Sensor-SSL-Cert.pem#certs/Sensor-SSL-SK.pem',
      absoluteTime: 0,
      monitorTime: 60,
      minfreq: 100_000_000,
      maxfreq: 100_000_000,
    },
  }
}

export default function CampaignPage() {
  const { show } = useNotify()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [startLocal, setStartLocal] = useState(() => {
    const d = new Date(Date.now() + 5 * 60_000)
    d.setSeconds(0, 0)
    return d.toISOString().slice(0, 16)
  })
  const [monitorTime, setMonitorTime] = useState('60')
  const [freqHz, setFreqHz] = useState('100000000')
  const [error, setError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    const list = await api.getCurrentCampaigns()
    const normalized = (Array.isArray(list) ? list : []).map((c) => {
      const camp = c as Campaign
      if (Array.isArray(camp.sensors)) {
        camp.sensors = Array.from(new Set(camp.sensors))
      }
      return camp
    })
    setCampaigns(normalized)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [_, list] = await Promise.all([
          refresh(),
          api.getSensors().catch(() => [] as Sensor[]),
        ])
        if (cancelled) return
        setSensors(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setError('Could not load campaigns.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  const filteredSensors = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return sensors
    return sensors.filter((s) => {
      const hay = `${s.name ?? ''} ${s.serial ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [sensors, filter])

  function toggleSensor(serial: string) {
    setSelected((prev) =>
      prev.includes(serial) ? prev.filter((s) => s !== serial) : [...prev, serial],
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const errors: string[] = []
    const absoluteMs = new Date(startLocal).getTime()
    const duration = Number(monitorTime)
    const freq = Number(freqHz)

    if (!Number.isFinite(absoluteMs)) errors.push('Invalid start time.')
    if (absoluteMs - Date.now() < 60_000) {
      errors.push('Campaign must start at least 1 minute in the future.')
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      errors.push('Monitor time must be a positive number of seconds.')
    }
    if (duration > 300) errors.push('Maximum IQ campaign length is five minutes.')
    if (selected.length < 1) errors.push('Select at least one sensor.')
    if (!Number.isFinite(freq) || freq <= 0) errors.push('Frequency must be a positive Hz value.')

    setFormErrors(errors)
    if (errors.length) return

    const campaign = iqTemplate(selected)
    campaign.senseParameters = {
      ...campaign.senseParameters,
      absoluteTime: Math.floor(absoluteMs / 1000),
      monitorTime: duration,
      minfreq: freq,
      maxfreq: freq,
    }
    campaign.startTime = absoluteMs - 30_000
    campaign.endTime = absoluteMs + duration * 1000 + 7_200_000

    setSubmitting(true)
    setError(null)
    try {
      await api.addCampaign(campaign)
      show('Campaign created', 'success')
      await refresh()
    } catch {
      setError('Could not create campaign.')
      show('Campaign create failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="Campaign management"
        lead="Experimental — schedule short I/Q capture campaigns on selected sensors."
      />
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="muted">Loading…</p> : null}

      <section className="stack">
        <h2>Current campaigns</h2>
        {campaigns.map((c, i) => {
          const title = String(c.name ?? c.title ?? c.id ?? `Campaign ${i + 1}`)
          const sensorsLabel = Array.isArray(c.sensors)
            ? c.sensors.join(', ')
            : '—'
          const when = c.senseParameters?.absoluteTime
            ? new Date(Number(c.senseParameters.absoluteTime) * 1000).toLocaleString()
            : '—'
          return (
            <div className="panel" key={String(c.id ?? i)}>
              <strong>{title}</strong>
              <p className="muted">Start: {when}</p>
              <p className="muted">Sensors: {sensorsLabel}</p>
              <p className="muted">
                Duration: {c.senseParameters?.monitorTime ?? '—'}s · Freq:{' '}
                {c.senseParameters?.minfreq ?? '—'} Hz
              </p>
            </div>
          )
        })}
        {!loading && campaigns.length === 0 ? (
          <p className="muted">No current campaigns.</p>
        ) : null}
      </section>

      <section className="stack">
        <h2>Schedule I/Q campaign</h2>
        {formErrors.length ? (
          <div className="error-banner" role="alert">
            <ul>
              {formErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <form className="panel stack form-grid" onSubmit={onSubmit}>
          <div className="field">
            <label className="label" htmlFor="camp-start">
              Start (local)
            </label>
            <input
              id="camp-start"
              className="input"
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="camp-duration">
              Duration (seconds, max 300)
            </label>
            <input
              id="camp-duration"
              className="input"
              inputMode="numeric"
              value={monitorTime}
              onChange={(e) => setMonitorTime(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="camp-freq">
              Center frequency (Hz)
            </label>
            <input
              id="camp-freq"
              className="input"
              inputMode="numeric"
              value={freqHz}
              onChange={(e) => setFreqHz(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="camp-filter">
              Filter sensors
            </label>
            <input
              id="camp-filter"
              className="input"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="name or serial"
            />
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Serial</th>
                </tr>
              </thead>
              <tbody>
                {filteredSensors.map((s) => {
                  const serial = String(s.serial ?? s.id ?? '')
                  if (!serial) return null
                  return (
                    <tr key={serial}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(serial)}
                          onChange={() => toggleSensor(serial)}
                          aria-label={`Select ${s.name ?? serial}`}
                        />
                      </td>
                      <td>{s.name ?? '—'}</td>
                      <td className="muted">{serial}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Scheduling…' : 'Create campaign'}
          </button>
        </form>
      </section>
    </div>
  )
}
