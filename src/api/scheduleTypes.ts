/**
 * Shapes of the experiment-scheduling (booking) API.
 *
 * These mirror the controller's /task endpoints (feature/scheduler,
 * doc/Scheduling.md). The browser never calls the controller directly: it goes
 * through lambda routes (/api/schedule/...), which pass bodies and replies
 * through unchanged.
 */

export type BookingStatus = 'Uninitialized' | 'Pending' | 'Running' | 'Done' | 'Skipped'

/** A task as returned by GET /task/list and GET /task/<id>. */
export interface Booking {
  id: number
  /** Serial numbers as strings. An empty list means "all sensors". */
  sensors: string[]
  issuer: string
  /** ISO-8601 with offset, or "NOW" until a task has begun. */
  start: string
  /** ISO-8601 with offset, "US" (until stopped) or "UE" (until the command ends). */
  stop: string
  priority: number
  status: BookingStatus | string
  parameters: Record<string, string>
}

/** Body of POST /task/add and PUT /task/<id>. `priority` is left out on purpose. */
export interface BookingInput {
  sensors: string[]
  issuer: string
  /** ISO-8601 with a time zone, e.g. 2026-11-10T14:15:00Z. */
  start: string
  stop: string
  parameters: Record<string, string>
}

export interface Conflict {
  taskId: number
  sensors: string[]
  /** null: the other task has no end time. */
  stop: string | null
  stopReason?: string
}

export interface AvailabilitySensor {
  serial: string
  free: boolean
  taskId?: number
  freeFrom?: string | null
}

export interface Availability {
  from: string
  length: number
  slotSeconds: number
  priority?: number
  /** null: nothing fits in 30 days, or an open-ended task is in the way. */
  earliestStart: string | null
  earliestStop: string | null
  sensors: AvailabilitySensor[]
}

export interface AvailabilityParams {
  sensors: string[]
  /** Seconds. */
  length: number
  /** ISO-8601 with a time zone. Default: now. */
  from?: string
  priority?: number
}

/** The JSON body of a failed scheduling call (400 / 404 / 409 / 500). */
export interface ScheduleErrorBody {
  message?: string
  errors?: string[] | string
  conflicts?: Conflict[]
}

/** What `request()` throws for a non-2xx answer. */
export type ScheduleError = Error & { status?: number; data?: ScheduleErrorBody }
