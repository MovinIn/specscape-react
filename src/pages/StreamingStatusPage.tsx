import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type {
  SignalingSensorTime,
  SignalingStatus,
  SignalingUsageHour,
  SignalingUserTime,
} from '../api/types'
import { HcChart } from '../components/HcChart'

type ChartOptions = Record<string, unknown>

const pad = (n: number) => String(n).padStart(2, '0')

/** Angular `date: 'yyyy-MM-dd HH:mm:ss'` (local time). */
function dateTime(ms: number): string {
  const d = new Date(ms)
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

/** Angular `date: 'HH:mm:ss': 'UTC'` — like the legacy page, wraps after 24h. */
function hms(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

/** Shared y axis of the two duration bar charts. */
const DURATION_AXIS = {
  type: 'datetime',
  dateTimeLabelFormats: {
    second: '%H:%M',
    minute: '%H:%M',
    hour: '%H:%M',
    day: '%H:%M',
    week: '%H:%M',
    month: '%H:%M',
    year: '%H:%M',
  },
  title: { text: 'Duration [hours]' },
}

/** `reflow`: the legacy sensor chart sets chart.reflow, the user chart does not. */
function durationChart(
  title: string,
  categories: unknown[],
  durations: number[],
  reflow: boolean,
): ChartOptions {
  return {
    ...(reflow ? { chart: { reflow: true } } : {}),
    title: { text: title },
    xAxis: { categories },
    yAxis: DURATION_AXIS,
    tooltip: { pointFormat: '{point.y:%H:%M:%S}' },
    series: [
      {
        name: 'Usage Time',
        type: 'bar',
        showInLegend: false,
        data: durations.map((d) => [d * 1000]),
      },
    ],
  }
}

/** Port of streaming-status.html / streaming-status.js (route /spectrum-decoder-status). */
export default function StreamingStatusPage() {
  const [loading, setLoading] = useState(true)
  const [sensors, setSensors] = useState<Record<string, string | undefined>>({})
  const [status, setStatus] = useState<SignalingStatus>({})
  const [userTimes, setUserTimes] = useState<SignalingUserTime[]>([])
  const [sensorTimes, setSensorTimes] = useState<SignalingSensorTime[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [activePill, setActivePill] = useState(0)
  const [charts, setCharts] = useState<{
    byUser: ChartOptions
    bySensor: ChartOptions
    byHour: ChartOptions
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    let interval: number | undefined

    const sensorsReq = api.getSensors()
    sensorsReq.catch(() => {
      if (!cancelled) alert('Failed to load data')
    })

    Promise.all([
      sensorsReq,
      api.getSignalingStatus(),
      api.getSignalingSensorTimes(),
      api.getSignalingUserTimes(),
      api.getSignalingUsageTimes(),
    ]).then(
      ([sensorList, st, sTimes, uTimes, hours]) => {
        if (cancelled) return
        const names: Record<string, string | undefined> = {}
        for (const s of sensorList ?? []) names[String(s.serial)] = s.name
        const sensorTimesList = sTimes ?? []
        const userTimesList = uTimes ?? []
        const usageHours: SignalingUsageHour[] = hours ?? []

        setSensors(names)
        setStatus(st ?? {})
        setSensorTimes(sensorTimesList)
        setUserTimes(userTimesList)

        const totalUsage = usageHours.reduce((p, c) => c.startedSessions + p, 0)
        setCharts({
          byUser: durationChart(
            'Most Active Users',
            userTimesList.map((ut) => ut.uid),
            userTimesList.map((ut) => ut.duration),
            false,
          ),
          bySensor: durationChart(
            'Most Famous Sensors',
            sensorTimesList.map((ut) => names[String(ut.sensorId)]),
            sensorTimesList.map((ut) => ut.duration),
            true,
          ),
          byHour: {
            chart: { reflow: true },
            title: { text: 'Usage by Hour' },
            xAxis: {
              title: { text: 'Hour of Day (UTC)' },
              // legacy: [...Array(23).keys()], i.e. 0..22
              categories: [...Array(24).keys()],
            },
            yAxis: { title: { text: 'Started Sessions [%]' } },
            tooltip: {
              headerFormat:
                '<span style="font-size: 10px">{point.key}:</span> ',
              pointFormat: '{point.y}%',
              valueDecimals: 0,
            },
            series: [
              {
                type: 'column',
                showInLegend: false,
                data: usageHours.map((uh) => [
                  uh.hour,
                  totalUsage > 0 ? (uh.startedSessions / totalUsage) * 100 : 0,
                ]),
              },
            ],
          },
        })
        setLoading(false)

        interval = window.setInterval(() => {
          api.getSignalingStatus().then(
            (s) => {
              if (cancelled) return
              setStatus(s ?? {})
              setNow(Date.now())
            },
            (err) => console.log(err),
          )
        }, 5000)
      },
      () => {
        if (!cancelled) alert('Error retrieving stats!')
      },
    )

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const tabs: {
    heading: string
    count: number | undefined
    body: ReactNode
  }[] = [
    {
      heading: 'Connected Sensors',
      count: status.connectedSensors?.length,
      body: (
        <ul>
          {(status.connectedSensors ?? []).map((c) => (
            <li key={String(c)}>
              {sensors[String(c)]} <small>{c}</small>
            </li>
          ))}
        </ul>
      ),
    },
    {
      heading: 'Connected Clients',
      count: status.connectedClients?.length,
      body: (
        <ul>
          {(status.connectedClients ?? []).map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ),
    },
    {
      heading: 'Active RTC Sessions',
      count: status.rtc?.length,
      body: (
        <table className="table table-condensed table-striped">
          <thead>
            <tr>
              <th>User</th>
              <th>Sensor</th>
              <th>Start</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {(status.rtc ?? []).map((c, i) => (
              <tr key={i}>
                <td>{c.clientUid}</td>
                <td>{sensors[String(c.sensorId)]}</td>
                <td>{dateTime(c.start * 1000)}</td>
                <td>{hms(now - c.start * 1000)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
  ]

  return (
    <div className="container">
      <header className="lx-admin-heading">
        <div>
          <h1>Streaming operations</h1>
          <p>Connected sensors, active sessions and network usage.</p>
        </div>
      </header>
      <div className="row">
        {loading ? (
          <div>
            <p className="text-muted">Loading...</p>
          </div>
        ) : null}

        <div className="col-sm-12">
          <div className="panel panel-default">
            <div className="panel-heading">Signaling Server Status</div>
            <div className="panel-body">
              {/* uib-tabset vertical pills, with the page's custom tabset template */}
              <div className="row" style={{ margin: 10 }}>
                <ul className="nav nav-pills nav-stacked col-sm-4">
                  {tabs.map((t, i) => (
                    <li
                      key={t.heading}
                      className={`uib-tab nav-item${activePill === i ? ' active' : ''}`}
                    >
                      <a
                        href=""
                        className="nav-link"
                        onClick={(e) => {
                          e.preventDefault()
                          setActivePill(i)
                        }}
                      >
                        {t.heading}{' '}
                        <span className="label label-default pull-right">
                          {t.count}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="tab-content col-sm-8">
                  {tabs.map((t, i) => (
                    <div
                      key={t.heading}
                      className={`tab-pane${activePill === i ? ' active' : ''}`}
                    >
                      {t.body}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-sm-12">
          <div className="panel panel-default">
            <div className="panel-heading">Most Active Users</div>
            <div className="panel-body">
              <div className="row">
                <div className="col-sm-6">
                  <HcChart options={charts?.byUser ?? null} />
                </div>
                <div className="col-sm-6">
                  <table className="table table-striped table-condensed">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Duration (HH:mm:ss)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userTimes.map((d, i) => (
                        <tr key={i}>
                          <td>{d.uid}</td>
                          <td>{hms(d.duration * 1000)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-12">
          <div className="panel panel-default">
            <div className="panel-heading">Most Famous Sensors</div>
            <div className="panel-body">
              <div className="row">
                <div className="col-sm-6">
                  <HcChart options={charts?.bySensor ?? null} />
                </div>
                <div className="col-sm-6">
                  <table className="table table-striped table-condensed">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Serial</th>
                        <th>Duration (HH:mm:ss)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensorTimes.map((d, i) => (
                        <tr key={i}>
                          <td>{sensors[String(d.sensorId)]}</td>
                          <td>
                            <small>{d.sensorId}</small>
                          </td>
                          <td>{hms(d.duration * 1000)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-12">
          <div className="panel panel-default">
            <div className="panel-body">
              <div>
                <HcChart options={charts?.byHour ?? null} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
