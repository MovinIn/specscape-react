/**
 * In-memory stand-in for the scheduling API (controller /task/* behind the
 * not-yet-built lambda routes). It enforces the same rules as the controller's
 * feature/scheduler branch so every UI path (200, 400, 404, 409, availability)
 * can be exercised without a backend.
 *
 * Tunables (Vite env): VITE_MOCK_SLOT_SECONDS (default 900),
 * VITE_MOCK_MIN_LENGTH_SECONDS (default = slot).
 * State lives in memory only: a page reload resets it.
 */
import { MOCK_SENSORS } from './mock'
import type {
  Availability,
  AvailabilityParams,
  Booking,
  BookingInput,
  Conflict,
  ScheduleError,
} from './scheduleTypes'

const SLOT = Number(import.meta.env.VITE_MOCK_SLOT_SECONDS) || 900
const MIN_LENGTH = Number(import.meta.env.VITE_MOCK_MIN_LENGTH_SECONDS) || SLOT
const MAX_LENGTH = 24 * 3600
const MAX_SENSORS = 5
const DEFAULT_PRIORITY = 5
const SEARCH_LIMIT_MS = 30 * 86400 * 1000
const LATENCY_MS = 250

type Stored = Omit<Booking, 'status'> & { status?: string }

const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, '+00:00')
const ceilSlot = (ms: number) => Math.ceil(ms / (SLOT * 1000)) * SLOT * 1000
const wait = () => new Promise<void>((r) => setTimeout(r, LATENCY_MS))

function fail(status: number, data: unknown): never {
  const err = new Error(`Mock API ${status}`) as ScheduleError
  err.status = status
  err.data = data as ScheduleError['data']
  throw err
}

// ── seed data ────────────────────────────────────────────────────────────────
const base = ceilSlot(Date.now()) + 2 * 3600 * 1000
const [S1] = MOCK_SENSORS.map((s) => String(s.serial))
let nextId = 2

const tasks: Stored[] = [
  // Task 1 is the controller's default background task. Keep it: the page hides it, but the
  // mock must behave like the real controller (it cannot be edited or deleted).
  {
    id: 1,
    sensors: [],
    issuer: 'default',
    start: 'NOW',
    stop: 'US',
    priority: 1,
    status: 'Running',
    parameters: { command: 'es_sensor', minfreq: '24000000', maxfreq: '1766000000' },
  },
  // EXAMPLE DATA, delete this block when you no longer want a sample booking:
  // one booking by the mock user "demo", 2 h from now, 1 h long.
  {
    id: nextId++,
    sensors: [S1],
    issuer: 'demo',
    start: iso(base),
    stop: iso(base + 3600e3),
    priority: 5,
    parameters: { command: 'es_sensor', minfreq: '88000000', maxfreq: '108000000', CampaignId: '2' },
  },
  // END EXAMPLE DATA
]

/** The example booking follows the signed-in user and their first sensor until it is edited. */
let exampleUntouched = true
export interface ViewerHint {
  viewer?: string
  sampleSerial?: string
}
function adoptExample(hint?: ViewerHint) {
  const ex = tasks.find((t) => t.id === 2)
  if (!ex || !exampleUntouched || !hint) return
  if (hint.viewer) ex.issuer = hint.viewer
  if (hint.sampleSerial) ex.sensors = [hint.sampleSerial]
}

// ── helpers ──────────────────────────────────────────────────────────────────
const hasZone = (s: string) => /(Z|[+-]\d{2}:?\d{2})$/i.test(s.trim())
const openEnded = (t: { stop: string }) => t.stop === 'US' || t.stop === 'UE'

function span(t: Stored, now = Date.now()): { start: number; stop: number } {
  return {
    start: t.start === 'NOW' ? now : Date.parse(t.start),
    stop: openEnded(t) ? Infinity : Date.parse(t.stop),
  }
}

function statusOf(t: Stored, now = Date.now()): string {
  if (t.status === 'Done' || t.status === 'Skipped') return t.status
  if (t.id === 1 || t.start === 'NOW') return 'Running'
  const { start, stop } = span(t, now)
  if (now < start) return 'Pending'
  return now < stop ? 'Running' : 'Done'
}

function view(t: Stored): Booking {
  return { ...t, sensors: [...t.sensors], parameters: { ...t.parameters }, status: statusOf(t) }
}

const overlaps = (a: { start: number; stop: number }, b: { start: number; stop: number }) =>
  a.start < b.stop && b.start < a.stop

function shared(a: string[], b: string[]): string[] {
  return a.filter((s) => b.includes(s)).sort()
}

// ── validation (same order as the controller) ────────────────────────────────
function parseBody(body: unknown): { task: Omit<Stored, 'id'>; start: number; stop: number } {
  const bad = (errors: string[]): never => fail(400, { message: 'Incorrect task decleration', errors })
  if (!body || typeof body !== 'object') return bad(['Invalid JSON for the task: not an object'])
  const b = body as Record<string, unknown>
  for (const k of ['sensors', 'issuer', 'start', 'stop', 'parameters']) {
    if (!(k in b)) return bad([`Task JSON not well defined, lacking: '${k}'.`])
  }
  const errs: string[] = []
  if (!Array.isArray(b.sensors)) errs.push('sensors must be a list')
  if (typeof b.issuer !== 'string' || !/^\w+$/.test(b.issuer)) errs.push('issuer may only contain letters, digits and _')
  const params = b.parameters as Record<string, unknown> | null
  if (!params || typeof params !== 'object' || !('command' in params)) errs.push('parameters must contain command')
  if (typeof b.start !== 'string' || typeof b.stop !== 'string') errs.push('start and stop must be strings')
  if (errs.length) return bad(errs)

  const startS = b.start as string
  const stopS = b.stop as string
  if (!hasZone(startS)) errs.push(`Start time is not timezone-aware: ${startS}`)
  if (!hasZone(stopS)) errs.push(`Stop time is not timezone-aware: ${stopS}`)
  const start = Date.parse(startS)
  const stop = Date.parse(stopS)
  if (errs.length === 0) {
    if (!Number.isFinite(start) || !Number.isFinite(stop)) errs.push('Start or stop time is not a valid ISO-8601 time')
    else {
      if (start > stop) errs.push('Start time is after stop time')
      if (stop < Date.now()) errs.push('Stop time is in the past')
    }
  }
  if (errs.length) return bad(errs)

  const strParams: Record<string, string> = {}
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) strParams[k] = String(v)
  return {
    start,
    stop,
    task: {
      sensors: (b.sensors as unknown[]).map(String),
      issuer: b.issuer as string,
      start: iso(start),
      stop: iso(stop),
      priority: typeof b.priority === 'number' ? b.priority : DEFAULT_PRIORITY,
      parameters: strParams,
    },
  }
}

function bookingRuleErrors(task: Omit<Stored, 'id'>, start: number, stop: number): string[] {
  const errs: string[] = []
  const slotMs = SLOT * 1000
  if (start % slotMs !== 0)
    errs.push(`Start time ${iso(start)} is not aligned to the slot size of ${SLOT} seconds (${SLOT / 60} minutes)`)
  const length = (stop - start) / 1000
  if (length % SLOT !== 0)
    errs.push(`Length of ${length} seconds (${length / 60} minutes) is not a multiple of the slot size of ${SLOT} seconds (${SLOT / 60} minutes)`)
  if (length < MIN_LENGTH || length > MAX_LENGTH)
    errs.push(`Length of ${length} seconds is outside the allowed range of ${MIN_LENGTH} to ${MAX_LENGTH} seconds`)
  if (task.sensors.length > MAX_SENSORS)
    errs.push(`${task.sensors.length} sensors selected, at most ${MAX_SENSORS} are allowed per booking`)
  if (task.sensors.length === 0)
    errs.push('A booking must name at least one sensor. An empty sensor list means all sensors, which cannot be booked')
  return errs
}

function findConflicts(task: Omit<Stored, 'id'>, start: number, stop: number, ignoreId?: number): Conflict[] {
  const mine = { start, stop }
  const out: Conflict[] = []
  for (const t of tasks) {
    if (t.id === ignoreId || t.priority !== task.priority) continue
    if (statusOf(t) === 'Done' || statusOf(t) === 'Skipped') continue
    const common = shared(t.sensors, task.sensors)
    if (common.length === 0) continue
    if (!overlaps(mine, span(t))) continue
    const c: Conflict = {
      taskId: t.id,
      sensors: common,
      stop: openEnded(t) ? null : iso(Date.parse(t.stop)),
    }
    if (openEnded(t)) c.stopReason = `Task runs until ${t.stop === 'US' ? 'it is stopped (US)' : 'its command finishes (UE)'}`
    out.push(c)
  }
  return out
}

function checkAndStore(body: unknown, id?: number): Stored {
  const { task, start, stop } = parseBody(body)
  const errors = bookingRuleErrors(task, start, stop)
  if (errors.length) fail(400, { message: 'Invalid booking', errors })
  const conflicts = findConflicts(task, start, stop, id)
  if (conflicts.length) fail(409, { message: 'Failed to add task', errors: 'Clashes with other task', conflicts })
  const stored: Stored = { ...task, id: id ?? nextId++ }
  stored.parameters.CampaignId = String(stored.id)
  return stored
}

// ── public API (same surface as the lambda routes) ───────────────────────────
export async function list(sensor?: string, hint?: ViewerHint): Promise<Booking[]> {
  await wait()
  adoptExample(hint)
  if (sensor !== undefined && sensor.trim() === '') {
    fail(400, { message: 'Invalid request', errors: ['sensor must be a sensor serial number'] })
  }
  return tasks
    .filter((t) => sensor === undefined || t.sensors.length === 0 || t.sensors.includes(sensor))
    .map(view)
}

export async function get(id: number): Promise<Booking> {
  await wait()
  const t = tasks.find((x) => x.id === id)
  if (!t) fail(404, { message: 'Task not found' })
  return view(t)
}

export async function add(body: BookingInput): Promise<{ message: string; id: number }> {
  await wait()
  const stored = checkAndStore(body)
  tasks.push(stored)
  return { message: 'OK', id: stored.id }
}

export async function update(id: number, body: BookingInput): Promise<{ message: string; id: number }> {
  await wait()
  const i = tasks.findIndex((x) => x.id === id)
  if (i < 0) fail(404, { message: 'Task not found' })
  if (id === 1) fail(400, { message: 'You cannot delete the default task' })
  tasks[i] = checkAndStore(body, id)
  if (id === 2) exampleUntouched = false
  return { message: 'OK', id }
}

export async function remove(id: number): Promise<{ message: string }> {
  await wait()
  const i = tasks.findIndex((x) => x.id === id)
  if (i < 0) fail(404, { message: 'Task not found' })
  if (id === 1) fail(400, { message: 'You cannot delete the default task' })
  tasks.splice(i, 1)
  return { message: 'OK' }
}

export async function availability(p: AvailabilityParams): Promise<Availability> {
  await wait()
  const errors: string[] = []
  if (p.sensors.length === 0) errors.push('sensors must name at least one sensor')
  if (!Number.isInteger(p.length) || p.length <= 0) errors.push('length must be a positive number of seconds')
  if (p.from !== undefined && (!hasZone(p.from) || !Number.isFinite(Date.parse(p.from)))) {
    errors.push('from must be an ISO-8601 time with a time zone')
  }
  if (errors.length) fail(400, { message: 'Invalid availability request', errors })

  const now = Date.now()
  const fromMs = p.from ? Date.parse(p.from) : now
  const lengthMs = p.length * 1000
  const blocking = tasks.filter(
    (t) =>
      t.sensors.length > 0 &&
      statusOf(t, now) !== 'Done' &&
      statusOf(t, now) !== 'Skipped' &&
      (p.priority === undefined || t.priority === p.priority) &&
      t.sensors.some((s) => p.sensors.includes(s)),
  )

  let earliest: number | null = null
  let cand = ceilSlot(fromMs)
  const limit = cand + SEARCH_LIMIT_MS
  while (cand <= limit) {
    const window = { start: cand, stop: cand + lengthMs }
    const hit = blocking.filter((t) => overlaps(window, span(t, now)))
    if (hit.length === 0) {
      earliest = cand
      break
    }
    const nextFree = Math.max(...hit.map((t) => span(t, now).stop))
    if (!Number.isFinite(nextFree)) break // an open-ended task is in the way
    cand = ceilSlot(nextFree)
  }

  return {
    from: iso(fromMs),
    length: p.length,
    slotSeconds: SLOT,
    ...(p.priority !== undefined ? { priority: p.priority } : {}),
    earliestStart: earliest === null ? null : iso(earliest),
    earliestStop: earliest === null ? null : iso(earliest + lengthMs),
    sensors: p.sensors.map((serial) => {
      const t = blocking.find((x) => x.sensors.includes(serial) && span(x, now).start <= fromMs && fromMs < span(x, now).stop)
      if (!t) return { serial, free: true }
      return {
        serial,
        free: false,
        taskId: t.id,
        freeFrom: openEnded(t) ? null : iso(Date.parse(t.stop)),
      }
    }),
  }
}
