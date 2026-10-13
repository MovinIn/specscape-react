import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Sensor } from '../api/types'
import { EsSelFreq } from '../components/decoder/EsSelFreq'
import { UibDatepickerPopup } from '../components/UibDatepickerPopup'

// Port of campaign-management.html / campaign-management.js. Note: on the live
// server GET /api/campaigns/current answers 404 (captured 2026-10-02), so the
// "Recent Campaigns" list is empty there; the legacy page swallowed that error.

type NgNumber = number | null | undefined

type Campaign = {
  id: number | null
  startTime: number
  endTime: number
  status: string
  command: string
  sensors: Sensor['serial'][]
  senseParameters: {
    measurementType: string
    sampRate: NgNumber
    sslCollector: string
    minfreq: number
    maxfreq: number
    /** A Date until the first "Add", then unix seconds (as in the legacy page). */
    absoluteTime: Date | number
    monitorTime: NgNumber
  }
}

/** A campaign as returned by /campaigns/current (no capture exists: shape as read by the template). */
type ServerCampaign = {
  id?: unknown
  status?: unknown
  startTime?: number
  endTime?: number
  sensors?: Sensor['serial'][]
  senseParameters?: Record<string, unknown>
}

function iqTemplate(): Campaign {
  return {
    id: null,
    startTime: new Date().getTime(),
    endTime: 0,
    status: 'Pending',
    command: 'es_sensor',
    sensors: [],
    senseParameters: {
      measurementType: 'IQ',
      sampRate: 2400000,
      sslCollector:
        'collector.specscape.org:5002#certs/CA-Cert.pem#certs/Sensor-SSL-Cert.pem#certs/Sensor-SSL-SK.pem',
      minfreq: 1090000000,
      maxfreq: 1090000000,
      absoluteTime: new Date(),
      monitorTime: 10,
    },
  }
}

/**
 * ngModel value of an <input type="number">: '' -> null, unparsable or outside
 * min/max -> undefined (the field is invalid), otherwise the number.
 */
function ngNumber(e: ChangeEvent<HTMLInputElement>, min?: number, max?: number): NgNumber {
  const raw = e.target.value
  if (e.target.validity.badInput) return undefined
  if (raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return undefined
  if ((min != null && n < min) || (max != null && n > max)) return undefined
  return n
}

/** Angular `{{ value }}` interpolation. */
function ngString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/**
 * Angular's date filter for the template's format 'yyyy-MM-dd&nbsp;HH:mm:ss'.
 * Interpolation escapes HTML and `s` is a seconds token, so the legacy page
 * really shows e.g. "2026-10-02&nb5p;14:03:05".
 */
function ngDate(ms: number, format: string): string {
  const d = new Date(ms)
  if (!Number.isFinite(d.getTime())) return String(ms)
  const parts: Record<string, number> = {
    y: d.getFullYear(), M: d.getMonth() + 1, d: d.getDate(),
    H: d.getHours(), m: d.getMinutes(), s: d.getSeconds(),
  }
  return format.replace(/y+|M+|d+|H+|m+|s+/g, (tok) => String(parts[tok[0]]).padStart(tok.length, '0'))
}

/** AngularJS `filter:expression` with a string: case-insensitive match against any (nested) property. */
function ngFilterMatch(item: unknown, expression: string): boolean {
  if (expression.charAt(0) === '!') return !ngFilterMatch(item, expression.substring(1))
  const expected = expression.toLowerCase()
  const deep = (actual: unknown): boolean => {
    if (Array.isArray(actual)) return actual.some(deep)
    if (actual !== null && typeof actual === 'object') {
      return Object.entries(actual).some(([k, v]) => k.charAt(0) !== '$' && deep(v))
    }
    if (actual === undefined || actual === null || typeof actual === 'function') return false
    return String(actual).toLowerCase().includes(expected)
  }
  return deep(item)
}

export default function CampaignPage() {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [filterSensors, setFilterSensors] = useState('')
  const [campaigns, setCampaigns] = useState<ServerCampaign[]>([])
  const [openIds, setOpenIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<unknown>([])
  const [infos, setInfos] = useState<string[]>([])
  const [campaign, setCampaign] = useState<Campaign>(iqTemplate)

  const [dateOptions] = useState(() => ({
    minDate: new Date(),
    maxDate: new Date(new Date().getTime() + 365 * 86400000), // in a year
  }))
  const [date, setDate] = useState<Date | null | undefined>(() => new Date())
  const [dpOpen, setDpOpen] = useState(false)
  const [hour, setHour] = useState<NgNumber>(() => new Date().getHours())
  const [minute, setMinute] = useState<NgNumber>(() => new Date().getMinutes())
  const [second, setSecond] = useState<NgNumber>(0)
  const [raw, setRaw] = useState(() => ({
    hour: String(new Date().getHours()),
    minute: String(new Date().getMinutes()),
    second: '0',
    monitorTime: '10',
    sampRate: '2400000',
  }))

  function updateCampaigns() {
    return api.getCurrentCampaigns().then(
      (data) => {
        setCampaigns(
          (Array.isArray(data) ? (data as ServerCampaign[]) : []).map((c) => ({
            ...c,
            sensors: Array.from(new Set(c.sensors)),
          })),
        )
      },
      // legacy handler was `err => console.error`, i.e. the error was swallowed
      () => undefined,
    )
  }

  useEffect(() => {
    let cancelled = false
    const p = api.getSensors().then(
      (data) => {
        if (!cancelled) setSensors(Array.isArray(data) ? data : [])
      },
      (err) => console.log(err),
    )
    // legacy: Promise.all(this.updateCampaigns(), p) rejects at once (not an
    // iterable), so loading ended with the first response's digest
    Promise.race([updateCampaigns(), p]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleSensors = sensors.filter((s) => ngFilterMatch(s, filterSensors))

  /** New filter text: options it hides drop out of the multi-select model (as in AngularJS). */
  function changeFilter(text: string) {
    const removed = visibleSensors.filter((s) => !ngFilterMatch(s, text)).map((s) => s.serial)
    setFilterSensors(text)
    if (removed.length === 0) return
    setCampaign((c) => {
      const kept = c.sensors.filter((s) => !removed.includes(s))
      return kept.length === c.sensors.length ? c : { ...c, sensors: kept }
    })
  }

  function setParam<K extends keyof Campaign['senseParameters']>(key: K, value: Campaign['senseParameters'][K]) {
    setCampaign((c) => ({ ...c, senseParameters: { ...c.senseParameters, [key]: value } }))
  }

  function addCampaign(e: FormEvent) {
    e.preventDefault()
    setErrors([])
    if (!date) {
      // legacy: this.date.getTime() threw inside ng-submit
      console.error(new TypeError('Cannot read properties of ' + date + " (reading 'getTime')"))
      return
    }
    const errs: string[] = []

    //// set start and end time
    let tmpTime = date.getTime()
    tmpTime -= tmpTime % 86400000
    const abs = new Date(tmpTime)
    abs.setHours(hour as number)
    abs.setMinutes(minute as number)
    abs.setSeconds(second as number)
    const absMs = abs.getTime()
    const sp = campaign.senseParameters
    const next: Campaign = {
      ...campaign,
      startTime: absMs - 30000,
      endTime: absMs + (sp.monitorTime as number) * 1000 + 7200000,
      senseParameters: { ...sp, absoluteTime: absMs / 1000, maxfreq: sp.minfreq },
    }
    setCampaign(next)

    //// sanity checks
    if ((next.senseParameters.absoluteTime as number) * 1000 - new Date().getTime() < 60000) {
      errs.push('Campaign must start at least 1 minute in the future')
    }
    if ((sp.monitorTime as number) > 300) errs.push('Maximum IQ campaign length is five minutes')
    if (next.sensors.length < 1) errs.push('No sensor selected')
    if (errs.length > 0) {
      setErrors(errs)
      return
    }

    // send to server
    setLoading(true)
    api.addCampaign(next).then(
      (c) => {
        updateCampaigns().then(() => setLoading(false))
        setInfos([`Campaign ${(c as { id?: unknown } | undefined)?.id} added successfully`])
        console.log(c)
      },
      (err) => {
        setLoading(false)
        setErrors((err as { data?: unknown } | null)?.data)
      },
    )
  }

  function sensorName(serial: Sensor['serial']) {
    const f = sensors.filter((s) => s.serial === serial)
    return f.length > 0 ? f[0].name : serial
  }

  // ng-repeat="e in $ctrl.errors" shown when errors.length > 0 (an array, or a string's characters)
  const errorItems: unknown[] = Array.isArray(errors)
    ? errors
    : typeof errors === 'string'
      ? errors.split('')
      : []

  return (
    <div className="container">
      <h1>Campaign Management</h1>

      <div className="col-sm-12">
        <h2>Recent Campaigns</h2>

        <div role="tablist" className="panel-group">
          {campaigns.map((c, i) => {
            const isOpen = openIds.has(i)
            const toggle = () =>
              setOpenIds((prev) => {
                const s = new Set(prev)
                if (s.has(i)) s.delete(i)
                else s.add(i)
                return s
              })
            return (
              <div key={i} className="panel panel-default">
                <div
                  role="tab"
                  aria-selected={isOpen}
                  className="panel-heading"
                  onKeyPress={(e) => {
                    if (e.key === ' ') toggle()
                  }}
                >
                  <h4 className="panel-title">
                    <a
                      role="button"
                      data-toggle="collapse"
                      href=""
                      aria-expanded={isOpen}
                      tabIndex={0}
                      className="accordion-toggle"
                      onClick={(e) => {
                        e.preventDefault()
                        toggle()
                      }}
                    >
                      <span className="campaign-list">
                        <span className="campaign-list-id">
                          <small>Id:</small> <br className="hacking-br" />
                          <strong>{ngString(c.id)}</strong>
                        </span>{' '}
                        <span className="campaign-list-type">
                          <small>Type:</small> <br className="hacking-br" />
                          <strong>{c.senseParameters?.measurementType == 'IQ' ? 'IQ' : 'PSD'}</strong>
                        </span>{' '}
                        <span className="campaign-list-state">
                          <small>State:</small> <br className="hacking-br" />
                          <strong>{ngString(c.status)}</strong>
                        </span>{' '}
                        <span className="campaign-list-start">
                          <small>Start Time:</small> <br className="hacking-br" />
                          <strong>{ngDate((c.startTime as number) * 1000, 'yyyy-MM-dd&nbsp;HH:mm:ss')}</strong>
                        </span>{' '}
                        <span className="campaign-list-end">
                          <small>End Time:</small> <br className="hacking-br" />
                          <strong>{ngDate((c.endTime as number) * 1000, 'yyyy-MM-dd&nbsp;HH:mm:ss')}</strong>
                        </span>{' '}
                        <span className="campaign-list-sensors">
                          <small>Sensors:</small> <br className="hacking-br" />
                          <strong>{c.sensors?.length}</strong>
                        </span>
                      </span>
                    </a>
                  </h4>
                </div>
                <div
                  aria-hidden={!isOpen}
                  role="tabpanel"
                  className={`panel-collapse collapse${isOpen ? ' in' : ''}`}
                  aria-expanded={isOpen}
                >
                  <div className="panel-body">
                    <h4>Parameters</h4>
                    <ul style={{ columns: 2 }}>
                      {Object.entries(c.senseParameters ?? {}).map(([k, v]) => (
                        <li key={k}>
                          <strong>{k}</strong> {ngString(v)}
                        </li>
                      ))}
                    </ul>

                    <h4>Sensors</h4>
                    <ul style={{ columns: 2 }}>
                      {(c.sensors ?? []).map((s, j) => (
                        <li key={j}>{ngString(sensorName(s))}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="col-sm-12">
        <h2>Create IQ Campaign</h2>

        {errorItems.length > 0 ? (
          <div className="alert alert-danger">
            <h4>Errors</h4>
            <ul>
              {errorItems.map((e, i) => (
                <li key={i}>{ngString(e)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {infos.length > 0 ? (
          <div className="alert alert-info">
            <h4>Infos</h4>
            <ul>
              {infos.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <form className="form-horizontal" onSubmit={addCampaign} name="sensorForm">
          <fieldset disabled={loading}>
            <div className="col-sm-6">
              <div className="form-group">
                <label className="control-label" htmlFor="sensors">
                  Sensors
                </label>
                <div className="" style={{ width: '80%' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search Sensors"
                    value={filterSensors}
                    onChange={(e) => changeFilter(e.target.value)}
                  />
                  <select
                    multiple
                    className="form-control"
                    name="sensors"
                    id="sensors"
                    style={{ minHeight: 300 }}
                    value={visibleSensors
                      .filter((s) => campaign.sensors.includes(s.serial))
                      .map((s) => String(s.serial))}
                    onChange={(e) => {
                      const picked = Array.from(e.target.selectedOptions, (o) => o.value)
                      setCampaign((c) => ({
                        ...c,
                        sensors: visibleSensors.filter((s) => picked.includes(String(s.serial))).map((s) => s.serial),
                      }))
                    }}
                  >
                    {visibleSensors.map((s) => (
                      <option key={String(s.serial)} value={String(s.serial)}>
                        {s.name} ({s.serial})
                      </option>
                    ))}
                  </select>
                </div>
                <a
                  className="btn btn-default btn-xs"
                  onClick={() => {
                    setCampaign((c) => ({ ...c, sensors: sensors.map((s) => s.serial) }))
                  }}
                >
                  Select All
                </a>
              </div>
            </div>
            {/* col-sm-6 */}

            <div className="col-sm-6">
              <div className="col-sm-6">
                <div className="form-group">
                  <label className="control-label" htmlFor="name">
                    Start Time
                  </label>

                  <div className="input-group">
                    <UibDatepickerPopup
                      id="esdp"
                      value={date}
                      onChange={setDate}
                      isOpen={dpOpen}
                      onOpenChange={setDpOpen}
                      minDate={dateOptions.minDate}
                      maxDate={dateOptions.maxDate}
                      required
                      closeText="Close"
                    />
                    <span className="input-group-btn">
                      <button type="button" className="btn btn-default" onClick={() => setDpOpen(true)}>
                        <i className="glyphicon glyphicon-calendar" />
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              <div className="col-sm-6">
                <div className="form-group">
                  <label className="control-label" htmlFor="name">
                    &nbsp;
                  </label>

                  <div className="input-group">
                    <input
                      type="number" min="0" max="23" name="hour" id="hour" className="form-control"
                      placeholder="hh" style={{ width: '4.5em' }} value={raw.hour}
                      onChange={(e) => {
                        setRaw((r) => ({ ...r, hour: e.target.value }))
                        setHour(ngNumber(e, 0, 23))
                      }}
                    />
                    <input
                      type="number" min="0" max="59" name="minute" id="minute" className="form-control"
                      placeholder="mm" style={{ width: '4.5em' }} value={raw.minute}
                      onChange={(e) => {
                        setRaw((r) => ({ ...r, minute: e.target.value }))
                        setMinute(ngNumber(e, 0, 59))
                      }}
                    />
                    <input
                      type="number" min="0" max="59" name="second" id="second" className="form-control"
                      placeholder="ss" style={{ width: '4.5em' }} value={raw.second}
                      onChange={(e) => {
                        setRaw((r) => ({ ...r, second: e.target.value }))
                        setSecond(ngNumber(e, 0, 59))
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="col-sm-12">
                <div className="form-group">
                  <label className="control-label" htmlFor="name">
                    Duration (seconds)
                  </label>
                  <div className="">
                    <input
                      id="name" name="name" type="number" placeholder="name" min="1" max="300" required
                      className="form-control input-md" value={raw.monitorTime}
                      onChange={(e) => {
                        setRaw((r) => ({ ...r, monitorTime: e.target.value }))
                        setParam('monitorTime', ngNumber(e, 1, 300))
                      }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="control-label" htmlFor="center-freq">
                    Center Frequency
                  </label>
                  <div className="">
                    {/* default-unit="1000000" is a number in the legacy template */}
                    <EsSelFreq
                      nested
                      defaultUnit={1000000}
                      selectedFrequency={campaign.senseParameters.minfreq}
                      onChange={(f) => setParam('minfreq', f)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="control-label" htmlFor="samp-rate">
                    Sampling Rate
                  </label>
                  <div className="">
                    <input
                      id="samp-rate" name="samp-rate" type="number" placeholder="sampling rate" required
                      className="form-control input-md" min="1" value={raw.sampRate}
                      onChange={(e) => {
                        setRaw((r) => ({ ...r, sampRate: e.target.value }))
                        setParam('sampRate', ngNumber(e, 1))
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* col-sm-6 */}
          </fieldset>

          <div className="text-right">
            {loading ? <span className="text-muted">Loading...</span> : null}{' '}
            <input type="submit" className="btn btn-primary" value="Add" disabled={loading} />
          </div>
        </form>

        <div className="alert alert-warning" style={{ marginTop: 50 }}>
          <h4>DEBUG Info</h4>
          {JSON.stringify(campaign)}
        </div>
      </div>
    </div>
  )
}
