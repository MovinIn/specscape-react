import type { Booking } from '../api/scheduleTypes'

/** Priority a normal booking gets from the controller (default_priority). */
export const BOOKING_PRIORITY = 5
export const MAX_SENSORS = 5
export const MAX_LENGTH_SECONDS = 24 * 3600

export interface Span {
  startMs: number
  /** null: open-ended (US / UE). */
  stopMs: number | null
}

export function spanOf(b: Booking, now = Date.now()): Span {
  return {
    startMs: b.start === 'NOW' ? now : Date.parse(b.start),
    stopMs: b.stop === 'US' || b.stop === 'UE' ? null : Date.parse(b.stop),
  }
}

/** Same rule as the controller: ranges are half-open, open-ended tasks block onward. */
export function overlaps(a: Span, b: Span): boolean {
  const aStop = a.stopMs ?? Infinity
  const bStop = b.stopMs ?? Infinity
  return a.startMs < bStop && b.startMs < aStop
}

/** 2026-11-10T14:15:00Z (the form the controller wants: UTC, with a zone). */
export const toUtcIso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day as YYYY-MM-DD (value of <input type="date">). */
export function ymd(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function localMidnight(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

export function nextLocalMidnight(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d + 1).getTime()
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return ymd(new Date(y, m - 1, d + n, 12).getTime())
}

/** Slot starts (epoch-aligned, as the controller measures them) inside one local day. */
export function slotStarts(day: string, slotSeconds: number): number[] {
  const step = slotSeconds * 1000
  const end = nextLocalMidnight(day)
  const out: number[] = []
  for (let t = Math.ceil(localMidnight(day) / step) * step; t < end; t += step) out.push(t)
  return out
}

export const floorToSlot = (ms: number, slotSeconds: number) =>
  Math.floor(ms / (slotSeconds * 1000)) * slotSeconds * 1000

export const ceilToSlot = (ms: number, slotSeconds: number) =>
  Math.ceil(ms / (slotSeconds * 1000)) * slotSeconds * 1000

export function fmtClock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

export function fmtDay(ms: number): string {
  return new Date(ms).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function tzAbbr(ms = Date.now()): string {
  const part = new Intl.DateTimeFormat([], { timeZoneName: 'short' })
    .formatToParts(new Date(ms))
    .find((p) => p.type === 'timeZoneName')
  return part?.value ?? ''
}

export function tzName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return ''
  }
}

export function fmtRange(startMs: number, stopMs: number | null): string {
  if (stopMs === null) return `${fmtDay(startMs)}, ${fmtClock(startMs)} → until stopped ${tzAbbr(startMs)}`
  if (ymd(startMs) === ymd(stopMs - 1)) {
    return `${fmtDay(startMs)}, ${fmtClock(startMs)}–${fmtClock(stopMs)} ${tzAbbr(startMs)}`
  }
  return `${fmtDay(startMs)} ${fmtClock(startMs)} → ${fmtDay(stopMs)} ${fmtClock(stopMs)} ${tzAbbr(startMs)}`
}

export function fmtLength(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** Length choices: every slot up to 4 h, then whole hours that are also slot multiples, up to 24 h. */
export function lengthChoices(slotSeconds: number): number[] {
  const out: number[] = []
  for (let s = slotSeconds; s <= 4 * 3600; s += slotSeconds) out.push(s)
  for (let s = 5 * 3600; s <= MAX_LENGTH_SECONDS; s += 3600) if (s % slotSeconds === 0) out.push(s)
  return out
}
