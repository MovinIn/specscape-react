import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { HcChart } from '../components/HcChart'

// Port of sensor-donation/statistics (statistics.html / statistics.js), route
// /sensor-application-statistics. moment.js (default "en" locale) is replaced by
// the small local-time helpers below.

type ChartOptions = Record<string, unknown>

/** A sponsoring application as read here: event times are unix seconds. */
type Application = {
  created?: number
  deleted?: number | null
  shipped?: number | null
  sensorType?: string
}

/** GET /sensorDonation/stats/monthly/ — captured as {"monthly":{}} (2026-10-02). */
type MonthlyStats = {
  monthly: Record<
    string,
    Record<
      string,
      { created?: number; deleted?: number; shipped?: number } | undefined
    >
  >
}

const KITS = [
  'ElectroSense Kit (RasPi + Dongle + Board)',
  'ElectroSense Kit (RasPi + Dongle)',
  'Extension Board only',
]
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const WEEKDAYS_MIN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const pad = (n: number, w = 2) => String(n).padStart(w, '0')

const valid = (d: Date) => Number.isFinite(d.getTime())
/** moment format 'YYYY.MM.DD' */
const ymdDots = (d: Date) =>
  valid(d)
    ? `${pad(d.getFullYear(), 4)}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
    : 'Invalid date'
/** moment format 'MMMM YYYY' */
const monthYear = (d: Date) =>
  valid(d)
    ? `${MONTHS[d.getMonth()]} ${pad(d.getFullYear(), 4)}`
    : 'Invalid date'
/** moment(text, 'YYYY.MM.DD') */
function parseDots(text: string | undefined): Date {
  if (text === undefined) return new Date() // moment(undefined, fmt) is "now"
  const m = /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/.exec(text)
  return m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(NaN)
}
/** moment(text): ISO dates are local time, anything else falls back to new Date(text) */
function parseLoose(text: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  return m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(text)
}
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

/** Months for the dropdown: display name -> 'YYYY.MM.DD' of the month start, newest first. */
function monthOptions(apps: Application[]) {
  const months: Record<string, string> = {}
  const add = (secs: number | undefined) => {
    const start = startOfMonth(new Date((secs as number) * 1000))
    const display = monthYear(start)
    if (!months[display]) months[display] = ymdDots(start)
  }
  for (const a of apps) {
    add(a.created)
    if (a.deleted) add(a.deleted)
    if (a.shipped) add(a.shipped)
  }
  const names = Object.keys(months)
  names.sort((a, b) => (months[a] < months[b] ? 1 : -1))
  return { names, toId: months }
}

/** Charts built from /sensorDonation/list/all for one month (drawChartsFromAllSensorApplications). */
function applicationCharts(
  d: Application[],
  selectedMonthId: string | undefined,
) {
  if (!d.length) return null
  const selectedMonth = parseDots(selectedMonthId)
  const inMonth = (secs: number) =>
    monthYear(new Date(secs * 1000)) === monthYear(selectedMonth)
  const daysInMonth = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1,
    0,
  ).getDate()
  const dayKey = (day: number) =>
    ymdDots(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day),
    )

  const count = (field: 'created' | 'deleted' | 'shipped', fill: boolean) => {
    const o: Record<string, number> = {}
    for (const a of d) {
      const secs = a[field]
      if (field !== 'created' && !secs) continue
      if (!inMonth(secs as number)) continue
      const day = ymdDots(new Date((secs as number) * 1000))
      o[day] = (o[day] ?? 0) + 1
    }
    if (fill && valid(selectedMonth)) {
      for (let i = 1; i <= daysInMonth; i++) if (!o[dayKey(i)]) o[dayKey(i)] = 0
    }
    const data = Object.keys(o).map((k) => [k, o[k]] as [string, number])
    data.sort((a, b) => (a[0] > b[0] ? 1 : -1))
    return data
  }
  // legacy fills missing days for created and shipped, not for deleted
  const created = count('created', true)
  const deleted = count('deleted', false)
  const shipped = count('shipped', true)

  const requestsLastMonth: ChartOptions = {
    chart: { reflow: true, height: '400px' },
    title: { text: 'Daily events' },
    xAxis: {
      title: { text: 'Day' },
      categories: created.reduce<string[]>((cat, e) => {
        if (e && e[0]) {
          const date = parseDots(e[0])
          cat.push(
            valid(date)
              ? `${WEEKDAYS_MIN[date.getDay()]}, ${ymdDots(date)}`
              : 'Invalid date',
          )
        }
        return cat
      }, []),
    },
    yAxis: { title: { text: 'Number of Applications' } },
    series: [
      { type: 'column', name: 'Created', data: created },
      { type: 'column', name: 'Deleted', data: deleted },
      { type: 'column', name: 'Shipped', data: shipped },
    ],
  }

  const types = ['pending', 'deleted', 'shipped'] as const
  const matches = (t: (typeof types)[number], a: Application) =>
    t === 'pending'
      ? !a.deleted && !a.shipped
      : t === 'deleted'
        ? Boolean(a.deleted)
        : Boolean(a.shipped)

  const requestStatusDistribution: ChartOptions = {
    chart: { reflow: true, height: '400px', type: 'pie' },
    title: { text: 'Current request status distribution' },
    series: [
      {
        name: 'Requests',
        data: types.map((t) => [t, d.filter((a) => matches(t, a)).length]),
      },
    ],
  }

  const statusByType = types.map((t) => ({
    type: 'column',
    name: t,
    data: KITS.map((kit) => [
      kit,
      d.filter((a) => a.sensorType === kit && matches(t, a)).length,
    ]),
  }))
  const requestStatusByTypeDistribution: ChartOptions = {
    chart: { reflow: true, height: '400px' },
    title: { text: 'Current request status distribution (by hardware type)' },
    xAxis: {
      title: { text: 'Device Type' },
      categories: statusByType[0].data.map((e) => e[0] || e[1] || ''),
    },
    yAxis: { title: { text: 'Number of requests' } },
    series: statusByType,
  }
  console.log('seriesssss', requestStatusByTypeDistribution.series)

  return {
    requestsLastMonth,
    requestStatusDistribution,
    requestStatusByTypeDistribution,
  }
}

/** Charts built from /sensorDonation/stats/monthly/ (drawChartsFromMonthlyStats). */
function monthlyCharts(stats: MonthlyStats) {
  const monthly = stats.monthly
  const keys = Object.keys(monthly)

  const series = KITS.map((kit) => ({
    type: 'column',
    name: kit,
    data: keys.map((key) =>
      monthly[key][kit] ? [key, monthly[key][kit]?.created] : null,
    ),
  }))
  // an undefined category (month without the first kit) is kept, as in the legacy page
  const firstOf = (e: unknown[] | null) =>
    e ? e[0] || e[1] || e[2] || '' : undefined
  const requestsEachMonthByDevice: ChartOptions = {
    chart: { reflow: true, height: '400px' },
    title: { text: 'Requests each month by hardware type' },
    xAxis: {
      title: { text: 'Month' },
      categories: series[0].data.map(firstOf),
    },
    yAxis: { title: { text: 'Created Applications' } },
    series,
  }

  const typeNames = {
    created: 'Created',
    deleted: 'Deleted',
    shipped: 'Shipped',
  } as const
  const series2 = (Object.keys(typeNames) as (keyof typeof typeNames)[]).map(
    (typeName) => ({
      type: 'column',
      name: typeNames[typeName],
      data: keys.map((key) => [
        key,
        KITS.reduce(
          (total, kit) => total + (monthly[key][kit]?.[typeName] || 0),
          0,
        ),
      ]),
    }),
  )
  const shortMonth = (text: string) => {
    const date = parseLoose(text + '-01')
    return valid(date)
      ? `${MONTHS[date.getMonth()].slice(0, 3)} ${pad(date.getFullYear(), 4)}`
      : 'Invalid date'
  }
  const requestsEachMonthByType: ChartOptions = {
    chart: { reflow: true, height: '400px' },
    title: { text: 'Monthly events' },
    xAxis: {
      title: { text: 'Month' },
      categories: series2[0].data.map((e) =>
        e[0] ? shortMonth(String(e[0])) : e[1] ? shortMonth(String(e[1])) : '',
      ),
    },
    yAxis: { title: { text: 'Created Applications' } },
    series: series2,
  }

  const requestHardwareTypeDistribution: ChartOptions = {
    chart: { reflow: true, height: '400px', type: 'pie' },
    title: { text: 'Requested hardware' },
    series: [
      {
        name: 'Kits',
        data: KITS.map((kit) => [
          kit,
          keys.reduce(
            (total, key) => total + (monthly[key][kit]?.created || 0),
            0,
          ),
        ]),
      },
    ],
  }

  return {
    requestsEachMonthByDevice,
    requestsEachMonthByType,
    requestHardwareTypeDistribution,
  }
}

export default function SponsoringStatsPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [dropdownMonths, setDropdownMonths] = useState<string[]>([])
  const [monthToId, setMonthToId] = useState<Record<string, string>>({})
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(
    undefined,
  )
  const [appCharts, setAppCharts] =
    useState<ReturnType<typeof applicationCharts>>(null)
  const [statCharts, setStatCharts] = useState<ReturnType<
    typeof monthlyCharts
  > | null>(null)

  useEffect(() => {
    let cancelled = false
    api.getAllSensorApplications().then(
      (data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? (data as Application[]) : []
        const { names, toId } = monthOptions(list)
        setApps(list)
        setDropdownMonths(names)
        setMonthToId(toId)
        // the dropdown's ng-init selects the newest month and redraws for it
        setSelectedMonth(names[0])
        setAppCharts(applicationCharts(list, toId[names[0]]))
      },
      () => undefined, // the legacy page had no error handler here
    )
    api.getSensorApplicationStatsMonthly().then(
      (data) => {
        if (!cancelled) setStatCharts(monthlyCharts(data as MonthlyStats))
      },
      () => {
        if (!cancelled) alert('Error retrieving stats!')
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  function selectMonth(display: string) {
    setSelectedMonth(display)
    setAppCharts(applicationCharts(apps, monthToId[display]))
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-xs-12">
          <h1>Statistics</h1>
        </div>

        <div className="col-sm-6 col-lg-6">
          <div className="panel panel-default">
            <div className="panel-body">
              <div>
                <HcChart
                  options={appCharts?.requestStatusDistribution ?? null}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-6">
          <div className="panel panel-default">
            <div className="panel-body">
              <div>
                <HcChart
                  options={appCharts?.requestStatusByTypeDistribution ?? null}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-12 col-lg-6">
          <div className="panel panel-default">
            <div className="panel-body" style={{ position: 'relative' }}>
              {selectedMonth ? (
                <div
                  style={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }}
                >
                  <select
                    value={selectedMonth}
                    onChange={(e) => selectMonth(e.target.value)}
                  >
                    {dropdownMonths.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <HcChart options={appCharts?.requestsLastMonth ?? null} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-12 col-lg-6">
          <div className="panel panel-default">
            <div className="panel-body">
              <div>
                <HcChart
                  options={statCharts?.requestsEachMonthByType ?? null}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-12 col-lg-6">
          <div className="panel panel-default">
            <div className="panel-body">
              <div>
                <HcChart
                  options={statCharts?.requestHardwareTypeDistribution ?? null}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-12 col-lg-6">
          <div className="panel panel-default">
            <div className="panel-body">
              <div>
                <HcChart
                  options={statCharts?.requestsEachMonthByDevice ?? null}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
