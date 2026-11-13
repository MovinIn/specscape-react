import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Availability, Booking, BookingInput, Conflict, ScheduleError } from '../api/scheduleTypes'
import type { Sensor } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { EsSelFreq } from '../components/decoder/EsSelFreq'
import {
  AvailabilityTimeline,
  type TimelineBar,
  type TimelineRow,
} from '../components/scheduling/AvailabilityTimeline'
import { useSearchParams } from 'react-router-dom'
import { AreaPicker, parseArea, type Area } from '../components/scheduling/AreaPicker'
import { BookingList } from '../components/scheduling/BookingList'
import { ScheduleTabs } from '../components/scheduling/ScheduleTabs'
import { SensorPicker } from '../components/scheduling/SensorPicker'
import '../components/scheduling/scheduling.css'
import {
  BOOKING_PRIORITY,
  MAX_LENGTH_SECONDS,
  MAX_SENSORS,
  addDays,
  ceilToSlot,
  floorToSlot,
  fmtClock,
  fmtLength,
  fmtRange,
  localMidnight,
  nextLocalMidnight,
  overlaps,
  slotStarts,
  spanOf,
  toUtcIso,
  tzAbbr,
  tzName,
  ymd,
} from '../lib/scheduleTime'

type Preset = 'psd' | 'iq'

/**
 * Where a sensor sends its data. The lambda may overwrite this; until then the
 * values match the existing Campaign page (IQ) and the walkthrough example (PSD).
 */
const COLLECTOR = {
  psd: 'collector.specscape.org:5001#certs/CA-Cert.pem#certs/Sensor-SSL-Cert.pem#certs/Sensor-SSL-SK.pem',
  iq: 'collector.specscape.org:5002#certs/CA-Cert.pem#certs/Sensor-SSL-Cert.pem#certs/Sensor-SSL-SK.pem',
}

const REFRESH_MS = 60_000
const FALLBACK_SLOT_SECONDS = 900 // 15-minute start/length grid
const MAX_SCRIPT_BYTES = 100_000 // shortcut: parameters travel in the booking body, so keep scripts small

const fmtBytes = (n: number) => (n < 1000 ? `${n} B` : `${(n / 1000).toFixed(1)} kB`)

type Notice ={ kind: 'success' | 'danger' | 'warning'; lines: string[] }

function scheduleError(err: unknown): ScheduleError {
  return err as ScheduleError
}

/** Turn a failed call into lines for the user (see walkthrough §5). */
function describe(err: unknown, what: string): { notice: Notice; conflicts: Conflict[] | null } {
  const e = scheduleError(err)
  const data = e.data
  const errors = Array.isArray(data?.errors) ? data.errors : typeof data?.errors === 'string' ? [data.errors] : []
  if (e.status === 409) {
    return {
      notice: { kind: 'danger', lines: ['Those sensors are already booked for that time.'] },
      conflicts: data?.conflicts ?? [],
    }
  }
  if (e.status === 400 && data?.message === 'Invalid booking') {
    return { notice: { kind: 'danger', lines: errors.length ? errors : ['The booking breaks a scheduling rule.'] }, conflicts: null }
  }
  if (e.status === 400) {
    console.error(`${what}: request rejected`, data)
    return {
      notice: { kind: 'danger', lines: ['The request was not accepted. This looks like a bug in the form; the details are in the browser console.'] },
      conflicts: null,
    }
  }
  if (e.status === 404 && data?.message === 'Task not found') {
    return { notice: { kind: 'warning', lines: ['That booking no longer exists. The list has been refreshed.'] }, conflicts: null }
  }
  if (e.status === 404) {
    return {
      notice: {
        kind: 'warning',
        lines: ['Scheduling is not available on this server yet (the booking routes are not deployed). Run with VITE_USE_MOCK_SCHEDULE=true to try it on mock data.'],
      },
      conflicts: null,
    }
  }
  console.error(`${what} failed`, err)
  return { notice: { kind: 'danger', lines: ['Something went wrong. Please try again.'] }, conflicts: null }
}

export default function ExperimentSchedulingPage() {
  const { user, isAdmin } = useAuth()
  const issuer = (user?.username ?? '').replace(/\W/g, '_')

  // data
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [listNotice, setListNotice] = useState<Notice | null>(null)
  const slotSec = FALLBACK_SLOT_SECONDS
  const [slotKnown, setSlotKnown] = useState(false)

  // form
  const [serials, setSerials] = useState<string[]>([])
  const [startMs, setStartMs] = useState<number | null>(null)
  const [lengthSec, setLengthSec] = useState(900)
  const [touched, setTouched] = useState(false)
  const [preset, setPreset] = useState<Preset>('psd')
  const [psdMin, setPsdMin] = useState(88_000_000)
  const [psdMax, setPsdMax] = useState(108_000_000)
  const [iqFreq, setIqFreq] = useState(1_090_000_000)
  const [sampRate, setSampRate] = useState('2400000')
  const [monitorTime, setMonitorTime] = useState('10')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [script, setScript] = useState<{ name: string; size: number; text: string } | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const byArea = searchParams.get('by') === 'area'
  const [area, setArea] = useState<Area | null>(null)

  /** Switching tabs starts the sensor choice over: the two tabs pick sensors differently. */
  function switchMode(toArea: boolean) {
    setSearchParams(toArea ? { by: 'area' } : {}, { replace: true })
    setSerials([])
    setArea(null)
    setConflicts(null)
  }

  // feedback
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [availLoading, setAvailLoading] = useState(false)
  const [availFailed, setAvailFailed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null)
  const [showAll, setShowAll] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const sensorName = useCallback(
    (serial: string) => {
      const s = sensors.find((x) => String(x.serial) === serial)
      return s?.name ? String(s.name) : serial
    },
    [sensors],
  )

  // ── loading ────────────────────────────────────────────────────────────────
  const firstSerial = sensors.length > 0 ? String(sensors[0].serial) : undefined
  const loadBookings = useCallback(async () => {
    try {
      const list = await api.listBookings(undefined, { viewer: issuer, sampleSerial: firstSerial })
      setBookings(list)
      setListNotice(null)
    } catch (err) {
      setBookings((prev) => prev ?? [])
      setListNotice(describe(err, 'Loading bookings').notice)
    }
  }, [issuer, firstSerial])

  useEffect(() => {
    let cancelled = false
    api.getSensors().then(
      (data) => {
        if (!cancelled) setSensors(Array.isArray(data) ? data : [])
      },
      (err) => console.error('Loading sensors failed', err),
    )
    void loadBookings()
    const timer = window.setInterval(() => void loadBookings(), REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [loadBookings])

  // The slot size is only reported by the availability call, so ask once for any sensor.
  useEffect(() => {
    if (slotKnown || sensors.length === 0) return
    let cancelled = false
    api
      .getAvailability({ sensors: [String(sensors[0].serial)], length: 3600, priority: BOOKING_PRIORITY })
      .then(
        () => {
          if (cancelled) return
          setSlotKnown(true)
        },
        () => undefined,
      )
    return () => {
      cancelled = true
    }
  }, [sensors, slotKnown])

  // Keep start and length on the slot grid whenever the slot size changes.
  useEffect(() => {
    setStartMs((s) => (s === null || s % (slotSec * 1000) === 0 ? s : ceilToSlot(s, slotSec)))
    setLengthSec((l) => (l % slotSec === 0 ? l : Math.min(MAX_LENGTH_SECONDS, Math.ceil(l / slotSec) * slotSec)))
  }, [slotSec])

  // Default start: the next slot.
  useEffect(() => {
    setStartMs((s) => s ?? ceilToSlot(Date.now() + 1, slotSec))
  }, [slotSec])

  // ── availability ───────────────────────────────────────────────────────────
  const serialsKey = serials.join(',')
  // Until the user picks a time, look from "now"; afterwards from the chosen day.
  const fromKey = touched && startMs !== null ? ymd(startMs) : 'now'

  useEffect(() => {
    if (serials.length === 0) {
      setAvailability(null)
      setAvailFailed(false)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      setAvailLoading(true)
      const from = fromKey === 'now' ? undefined : toUtcIso(Math.max(Date.now(), localMidnight(fromKey)))
      api
        .getAvailability({ sensors: serials, length: lengthSec, from, priority: BOOKING_PRIORITY })
        .then(
          (res) => {
            if (cancelled) return
            setAvailability(res)
            setAvailFailed(false)
            setSlotKnown(true)
            if (!touched && editingId === null && res.earliestStart) {
              setStartMs(Date.parse(res.earliestStart))
            }
          },
          (err) => {
            if (cancelled) return
            console.error('Availability failed', err)
            setAvailFailed(true)
          },
        )
        .finally(() => {
          if (!cancelled) setAvailLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialsKey, lengthSec, fromKey, bookings])

  // ── derived ────────────────────────────────────────────────────────────────
  const stopMs = startMs === null ? null : startMs + lengthSec * 1000
  const day = ymd(startMs ?? Date.now())
  const startOptions = useMemo(() => slotStarts(day, slotSec), [day, slotSec])
  const lenH = Math.floor(lengthSec / 3600)
  const lenM = Math.floor((lengthSec % 3600) / 60)

  /** Hours + minutes → seconds, kept between one slot and the 24 h maximum. */
  function changeLength(h: number, m: number) {
    const sec = Math.min(MAX_LENGTH_SECONDS, Math.max(slotSec, h * 3600 + m * 60))
    setLengthSec(sec)
    setConflicts(null)
  }
  const now = Date.now()

  /** Overlaps with already-listed same-priority bookings: an early warning, the server still decides. */
  const localClashes = useMemo(() => {
    if (startMs === null || stopMs === null || !bookings) return []
    const mine = { startMs, stopMs }
    return bookings.filter(
      (b) =>
        b.id !== 1 &&
        b.id !== editingId &&
        b.priority === BOOKING_PRIORITY &&
        (b.status === 'Pending' || b.status === 'Running') &&
        b.sensors.some((s) => serials.includes(s)) &&
        overlaps(mine, spanOf(b)),
    )
  }, [bookings, startMs, stopMs, serials, editingId])

  /** Sensors already booked (same priority) during the chosen window; the area tab leaves these out. */
  const busySerials = useMemo(() => {
    const out = new Set<string>()
    if (startMs === null || stopMs === null || !bookings) return out
    for (const b of bookings) {
      if (b.id === 1 || b.id === editingId || b.priority !== BOOKING_PRIORITY) continue
      if (b.status !== 'Pending' && b.status !== 'Running') continue
      if (overlaps({ startMs, stopMs }, spanOf(b))) b.sensors.forEach((s) => out.add(s))
    }
    return out
  }, [bookings, startMs, stopMs, editingId])

  const sensorRows: TimelineRow[] = useMemo(() => {
    const dayStart = localMidnight(day)
    const dayEnd = nextLocalMidnight(day)
    return serials.map((serial) => {
      const bars: TimelineBar[] = []
      for (const b of bookings ?? []) {
        if (b.id === 1 || b.id === editingId) continue
        if (b.status === 'Skipped') continue
        if (b.sensors.length > 0 && !b.sensors.includes(serial)) continue
        const { startMs: s, stopMs: e } = spanOf(b)
        if (s >= dayEnd || (e !== null && e <= dayStart)) continue
        const open = e === null
        const kind = open || b.priority > BOOKING_PRIORITY ? 'live' : b.issuer === issuer ? 'mine' : 'other'
        const who = isAdmin || kind === 'mine' ? ` · ${b.issuer}` : ''
        bars.push({
          key: String(b.id),
          startMs: s,
          stopMs: e,
          kind,
          label: `${kind === 'live' ? 'Live / open-ended' : kind === 'mine' ? 'Your booking' : 'Booked'}${who} · ${fmtRange(s, e)}`,
          past: b.status === 'Done',
        })
      }
      return { serial, name: sensorName(serial), bars }
    })
  }, [serials, bookings, day, editingId, issuer, isAdmin, sensorName])

  // An area booking can hold dozens of sensors, so the timeline shows them as one merged lane.
  const rows: TimelineRow[] = useMemo(() => {
    if (!byArea || sensorRows.length === 0) return sensorRows
    const seen = new Set<string>()
    const bars = sensorRows.flatMap((r) => r.bars).filter((b) => !seen.has(b.key) && seen.add(b.key))
    return [{ serial: 'area', name: `Area · ${sensorRows.length} sensors`, bars }]
  }, [byArea, sensorRows])

  const params = useMemo((): Record<string, string> => {
    const extra: Record<string, string> = script ? { scriptName: script.name, script: script.text } : {}
    if (byArea && area) extra.area = area.map((v) => v.toFixed(5)).join(',')
    if (preset === 'iq') {
      return {
        ...extra,
        command: 'es_sensor',
        measurementType: 'IQ',
        sampRate,
        minfreq: String(iqFreq),
        maxfreq: String(iqFreq),
        monitorTime,
        sslCollector: COLLECTOR.iq,
      }
    }
    return { ...extra, command: 'es_sensor', minfreq: String(psdMin), maxfreq: String(psdMax), sslCollector: COLLECTOR.psd }
  }, [preset, sampRate, iqFreq, monitorTime, psdMin, psdMax, script, byArea, area])

  async function chooseScript(f: File | undefined) {
    if (!f) return setScript(null)
    if (f.size > MAX_SCRIPT_BYTES) {
      setNotice({ kind: 'danger', lines: [`The script is too large (max ${MAX_SCRIPT_BYTES / 1000} kB).`] })
      return
    }
    setScript({ name: f.name, size: f.size, text: await f.text() })
    setNotice(null)
  }

  const visibleBookings = useMemo(
    () => (bookings ?? []).filter((b) => b.id !== 1 && (b.issuer === issuer || (isAdmin && showAll))),
    [bookings, issuer, isAdmin, showAll],
  )

  // ── actions ────────────────────────────────────────────────────────────────
  function chooseStart(ms: number) {
    setTouched(true)
    setStartMs(ms)
    setConflicts(null)
  }

  function changeDay(newDay: string) {
    if (!newDay) return
    const ref = new Date(startMs ?? Date.now())
    const target = localMidnight(newDay) + (ref.getHours() * 60 + ref.getMinutes()) * 60000
    let ms = floorToSlot(target, slotSec)
    if (ymd(ms) !== newDay) ms = ceilToSlot(target, slotSec)
    chooseStart(ms)
  }

  function clearForm() {
    setEditingId(null)
    setTouched(false)
    setStartMs(ceilToSlot(Date.now() + 1, slotSec))
    setConflicts(null)
  }

  function startEdit(b: Booking) {
    const { startMs: s, stopMs: e } = spanOf(b)
    if (e === null) return
    setEditingId(b.id)
    setSerials(b.sensors)
    setStartMs(s)
    setLengthSec(Math.round((e - s) / 1000))
    setTouched(true)
    const p = b.parameters
    const savedArea = parseArea(p.area)
    setSearchParams(savedArea ? { by: 'area' } : {}, { replace: true })
    setArea(savedArea)
    if (p.measurementType === 'IQ') {
      setPreset('iq')
      setIqFreq(Number(p.minfreq) || 1_090_000_000)
      setSampRate(p.sampRate ?? '2400000')
      setMonitorTime(p.monitorTime ?? '10')
    } else {
      setPreset('psd')
      setPsdMin(Number(p.minfreq) || 88_000_000)
      setPsdMax(Number(p.maxfreq) || 108_000_000)
    }
    setNotice(null)
    setConflicts(null)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /** After a clash: ask for the first free window at or after the chosen start. */
  async function useNextFreeSlot() {
    if (startMs === null) return
    try {
      const res = await api.getAvailability({
        sensors: serials,
        length: lengthSec,
        from: toUtcIso(Math.max(Date.now(), startMs)),
        priority: BOOKING_PRIORITY,
      })
      if (res.earliestStart) {
        chooseStart(Date.parse(res.earliestStart))
        setNotice({ kind: 'success', lines: [`Moved to the next free slot: ${fmtRange(Date.parse(res.earliestStart), Date.parse(res.earliestStop ?? res.earliestStart))}. Review it and book.`] })
      } else {
        setNotice({
          kind: 'warning',
          lines: ['No free slot was found in the next 30 days for all of these sensors (or a task with no end time is in the way). Try fewer sensors or a shorter length.'],
        })
      }
    } catch (err) {
      setNotice(describe(err, 'Finding a free slot').notice)
    }
  }

  function validate(): string[] {
    const errs: string[] = []
    // shortcut: an empty list means "all sensors" to the controller, so mobile-only area bookings wait for the backend (MobileAreaBookings.md).
    if (serials.length < 1) errs.push(byArea && area ? 'The area needs at least one free fixed sensor for now.' : 'Pick at least one sensor.')
    if (byArea && !area) errs.push('Draw an area on the map.')
    if (!byArea && serials.length > MAX_SENSORS) errs.push(`Pick at most ${MAX_SENSORS} sensors.`)
    if (startMs === null) errs.push('Pick a start time.')
    else if (startMs < Date.now()) errs.push('The start time is in the past.')
    if (preset === 'psd') {
      if (!(psdMin > 0) || !(psdMax > 0)) errs.push('Enter a frequency range.')
      else if (psdMin >= psdMax) errs.push('The start frequency must be below the end frequency.')
    } else {
      if (!(iqFreq > 0)) errs.push('Enter a centre frequency.')
      if (!(Number(sampRate) >= 1)) errs.push('Enter a sampling rate.')
      const m = Number(monitorTime)
      if (!(m >= 1 && m <= 300)) errs.push('The recording length must be between 1 and 300 seconds.')
    }
    return errs
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setConflicts(null)
    const errs = validate()
    if (errs.length > 0 || startMs === null || stopMs === null) {
      setNotice({ kind: 'danger', lines: errs })
      return
    }
    const body: BookingInput = {
      sensors: serials,
      issuer, // the lambda will overwrite this with the logged-in user
      start: toUtcIso(startMs),
      stop: toUtcIso(stopMs),
      parameters: params,
    }
    setSubmitting(true)
    setNotice(null)
    try {
      const res = editingId === null ? await api.addBooking(body) : await api.updateBooking(editingId, body)
      setNotice({
        kind: 'success',
        lines: [
          `${editingId === null ? 'Booked' : 'Updated'} booking #${res.id}: ${serials.map(sensorName).join(', ')}, ${fmtRange(startMs, stopMs)}.`,
        ],
      })
      setEditingId(null)
      await loadBookings()
    } catch (err) {
      const d = describe(err, editingId === null ? 'Booking' : 'Updating the booking')
      setNotice(d.notice)
      setConflicts(d.conflicts)
      if (scheduleError(err).status === 409 || scheduleError(err).status === 404) void loadBookings()
    } finally {
      setSubmitting(false)
    }
  }

  async function cancelBooking(b: Booking) {
    setBusyId(b.id)
    setNotice(null)
    try {
      await api.deleteBooking(b.id)
      setNotice({ kind: 'success', lines: [`Booking #${b.id} was cancelled.`] })
      if (editingId === b.id) clearForm()
    } catch (err) {
      setNotice(describe(err, 'Cancelling').notice)
    } finally {
      setBusyId(null)
      await loadBookings()
    }
  }

  const tz = `${tzName()} (${tzAbbr(startMs ?? now)})`
  const busySensors = availability?.sensors.filter((s) => !s.free) ?? []

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="container">
      <h1>Experiment Scheduling</h1>
      <ScheduleTabs byArea={byArea} onChange={switchMode} />
      <p className="xs-intro">
        Reserve sensors for a block of time. Bookings run on a fixed slot grid, so the earliest free time is
        suggested for you. Anything you book starts and stops on its own.
      </p>

      {listNotice && (
        <div className={`alert alert-${listNotice.kind}`} role="alert">
          {listNotice.lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      <div ref={formRef} />
      {notice && (
        <div className={`alert alert-${notice.kind}`} role={notice.kind === 'success' ? 'status' : 'alert'}>
          {notice.lines.length > 1 ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {notice.lines.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          ) : (
            notice.lines[0]
          )}
          {conflicts && conflicts.length > 0 && (
            <div className="xs-conflicts">
              <ul>
                {conflicts.map((c) => (
                  <li key={c.taskId}>
                    {(c.sensors.length ? c.sensors : serials).map(sensorName).join(', ')} —{' '}
                    {c.stop ? `booked until ${fmtClock(Date.parse(c.stop))} ${tzAbbr(Date.parse(c.stop))} (booking #${c.taskId})` : `${c.stopReason ?? 'no end time'} (task #${c.taskId})`}
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn-default btn-sm" onClick={useNextFreeSlot}>
                Use next free slot
              </button>
              {byArea && conflicts.some((c) => c.sensors.length > 0) && (
                <button type="button" className="btn btn-default btn-sm" style={{ marginLeft: 8 }}
                  onClick={() => {
                    const taken = new Set(conflicts.flatMap((c) => c.sensors))
                    setSerials((s) => s.filter((x) => !taken.has(x)))
                    setConflicts(null)
                    setNotice({ kind: 'success', lines: ['The booked sensors were dropped. Book again to reserve the rest.'] })
                  }}>
                  Drop the booked sensors
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={submit}>
        {byArea && (
          <div className="panel panel-default">
            <div className="panel-heading">Area</div>
            <div className="panel-body">
              <AreaPicker sensors={sensors} busy={busySerials} area={area} onArea={setArea} selected={serials}
                onChange={(s) => { setSerials(s); setConflicts(null) }} disabled={submitting} />
            </div>
          </div>
        )}
        <div className="row">
          <div className="col-md-5">
            {!byArea && (
              <div className="panel panel-default">
                <div className="panel-heading">Sensors</div>
                <div className="panel-body">
                  <SensorPicker sensors={sensors} selected={serials} onChange={(s) => { setSerials(s); setConflicts(null) }} username={user?.username} disabled={submitting} />
                </div>
              </div>
            )}

            <div className="panel panel-default">
              <div className="panel-heading">Measurement</div>
              <div className="panel-body">
                <div className="xs-preset" role="radiogroup" aria-label="Measurement type">
                  <label className={preset === 'psd' ? 'is-on' : undefined}>
                    <input type="radio" name="preset" checked={preset === 'psd'} onChange={() => setPreset('psd')} />
                    Spectrum scan
                    <small>Scans a frequency range</small>
                  </label>
                  <label className={preset === 'iq' ? 'is-on' : undefined}>
                    <input type="radio" name="preset" checked={preset === 'iq'} onChange={() => setPreset('iq')} />
                    I/Q recording
                    <small>Raw samples at one frequency</small>
                  </label>
                </div>

                {preset === 'psd' ? (
                  <>
                    <div className="form-group">
                      <label className="control-label">From frequency</label>
                      <EsSelFreq nested defaultUnit="1000000" selectedFrequency={psdMin} onChange={setPsdMin} isDisabled={submitting} />
                    </div>
                    <div className="form-group">
                      <label className="control-label">To frequency</label>
                      <EsSelFreq nested defaultUnit="1000000" selectedFrequency={psdMax} onChange={setPsdMax} isDisabled={submitting} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="control-label">Centre frequency</label>
                      <EsSelFreq nested defaultUnit="1000000" selectedFrequency={iqFreq} onChange={setIqFreq} isDisabled={submitting} />
                    </div>
                    <div className="form-group">
                      <label className="control-label" htmlFor="xs-samp">Sampling rate (Hz)</label>
                      <input id="xs-samp" type="number" min="1" className="form-control" value={sampRate}
                        onChange={(e) => setSampRate(e.target.value)} disabled={submitting} />
                    </div>
                    <div className="form-group">
                      <label className="control-label" htmlFor="xs-mon">Recording length (seconds)</label>
                      <input id="xs-mon" type="number" min="1" max="300" className="form-control" value={monitorTime}
                        onChange={(e) => setMonitorTime(e.target.value)} disabled={submitting} />
                      <p className="help-block">Same 1–300 s limit as campaigns. I/Q files are large.</p>
                    </div>
                  </>
                )}

                <details className="xs-params">
                  <summary className="text-muted">Parameters sent to the sensor</summary>
                  <pre>{JSON.stringify(params, null, 2)}</pre>
                </details>
              </div>
            </div>
          </div>

          <div className="col-md-7">
            <div className="panel panel-default">
              <div className="panel-heading">
                When
                {editingId !== null && <span className="label label-info" style={{ marginLeft: 8 }}>Editing booking #{editingId}</span>}
              </div>
              <div className="panel-body">
                <div className="xs-when">
                  <div className="form-group">
                    <label htmlFor="xs-date">Date</label>
                    <div className="xs-daynav">
                      <button type="button" className="btn btn-default" aria-label="Previous day"
                        disabled={submitting || nextLocalMidnight(addDays(day, -1)) <= now}
                        onClick={() => changeDay(addDays(day, -1))}>‹</button>
                      <input id="xs-date" type="date" className="form-control" value={day} min={ymd(now)}
                        onChange={(e) => changeDay(e.target.value)} disabled={submitting} style={{ width: 'auto' }} />
                      <button type="button" className="btn btn-default" aria-label="Next day" disabled={submitting}
                        onClick={() => changeDay(addDays(day, 1))}>›</button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="xs-start">Start</label>
                    <select id="xs-start" className="form-control" value={startMs ?? ''} disabled={submitting}
                      onChange={(e) => chooseStart(Number(e.target.value))}>
                      {startOptions.map((t) => (
                        <option key={t} value={t} disabled={t < now}>{fmtClock(t)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="xs-len-h">Length</label>
                    <div className="xs-len">
                      <select id="xs-len-h" className="form-control" aria-label="Hours" value={lenH} disabled={submitting}
                        onChange={(e) => changeLength(Number(e.target.value), lenM)}>
                        {Array.from({ length: 25 }, (_, h) => <option key={h} value={h}>{h} h</option>)}
                      </select>
                      <select id="xs-len-m" className="form-control" aria-label="Minutes" value={lenM} disabled={submitting || lenH === 24}
                        onChange={(e) => changeLength(lenH, Number(e.target.value))}>
                        {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m} min</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <p className="xs-tz">
                  Times are in your time zone, {tz}, and sent as UTC. Slots are {fmtLength(slotSec)} long
                  {slotKnown ? '' : ' (assumed until the server answers)'}.
                  {startMs !== null && stopMs !== null && <> Ends {fmtClock(stopMs)}{ymd(stopMs - 1) !== ymd(startMs) ? ' next day' : ''}.</>}
                </p>

                <AvailabilityTimeline
                  dayStartMs={localMidnight(day)}
                  dayEndMs={nextLocalMidnight(day)}
                  rows={rows}
                  slotSeconds={slotSec}
                  proposed={startMs !== null && stopMs !== null && serials.length > 0 ? { startMs, stopMs, clash: localClashes.length > 0 } : null}
                  onPick={(ms) => chooseStart(Math.max(ms, ceilToSlot(Date.now(), slotSec)))}
                />

                {serials.length > 0 && (
                  <>
                    {localClashes.length > 0 && (
                      <div className="xs-hint is-warn" role="status">
                        This overlaps {localClashes.length === 1 ? 'booking' : 'bookings'}{' '}
                        {localClashes.map((b) => `#${b.id}`).join(', ')} on a selected sensor.
                      </div>
                    )}
                    <div className={`xs-hint${availFailed || (availability && !availability.earliestStart) ? ' is-warn' : ''}`} role="status">
                      {availLoading && !availability ? (
                        'Checking availability…'
                      ) : availFailed ? (
                        'Could not check availability. You can still book; the server will reject a clash.'
                      ) : availability?.earliestStart ? (
                        <>
                          Earliest free for all {serials.length === 1 ? 'selected sensor' : `${serials.length} sensors`}:{' '}
                          <strong>{fmtRange(Date.parse(availability.earliestStart), Date.parse(availability.earliestStop ?? availability.earliestStart))}</strong>
                          {startMs !== Date.parse(availability.earliestStart) && (
                            <button type="button" className="btn btn-default btn-xs"
                              onClick={() => chooseStart(Date.parse(availability.earliestStart as string))}>
                              Use this slot
                            </button>
                          )}
                        </>
                      ) : availability ? (
                        'No free slot in the next 30 days for all of these sensors together (or a task with no end time is in the way).'
                      ) : null}
                      {busySensors.length > 0 && (
                        <ul className="xs-busy">
                          {busySensors.map((s) => (
                            <li key={s.serial}>
                              {sensorName(s.serial)} is busy{s.freeFrom ? ` until ${fmtClock(Date.parse(s.freeFrom))} ${tzAbbr(Date.parse(s.freeFrom))}` : ' until its current task is stopped'}
                              {' '}at the start of this search
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}

                <div className="xs-submit">
                  {editingId !== null && (
                    <button type="button" className="btn btn-default" onClick={clearForm} disabled={submitting}>
                      Stop editing
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary" disabled={submitting || serials.length === 0}>
                    {submitting ? 'Saving…' : editingId === null ? 'Book sensors' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>

            <div className="panel panel-default">
              <div className="panel-heading">Script</div>
              <div className="panel-body">
                {script ? (
                  <div className="xs-file is-set">
                    
                    <span className="xs-file-name" title={script.name}>{script.name}</span>
                    <span className="xs-file-size">{fmtBytes(script.size)}</span>
                    <button type="button" className="xs-file-x" aria-label={`Remove ${script.name}`}
                      disabled={submitting} onClick={() => setScript(null)}>×</button>
                  </div>
                ) : (
                  <div className="xs-file">
                    {/* hidden input; remounts after Remove since it only renders when no script is set */}
                    <label className="xs-file-btn">
                      Choose file
                      <input type="file" style={{ display: 'none' }} disabled={submitting} onChange={(e) => void chooseScript(e.target.files?.[0])} />
                    </label>
                    <span className="xs-file-name">No file chosen<small>Up to {MAX_SCRIPT_BYTES / 1000} kB</small></span>
                  </div>
                )}
                <p className="help-block">Sent with the booking and run on the sensors when it starts.</p>
              </div>
            </div>
          </div>
        </div>
      </form>

      <div className="panel panel-default">
        <div className="panel-heading">
          {isAdmin && showAll ? 'All bookings' : 'My bookings'}
          {isAdmin && (
            <label className="pull-right" style={{ margin: 0, fontWeight: 400 }}>
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show everyone's
            </label>
          )}
        </div>
        <div className="panel-body">
          {bookings === null ? (
            <p className="text-muted">Loading bookings…</p>
          ) : (
            <BookingList
              bookings={visibleBookings}
              sensorName={sensorName}
              showIssuer={isAdmin && showAll}
              editingId={editingId}
              busyId={busyId}
              onEdit={startEdit}
              onCancel={cancelBooking}
            />
          )}
        </div>
      </div>
    </div>
  )
}
