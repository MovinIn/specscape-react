export interface Principal {
  username: string
  admin?: boolean
}

/** GET /network/stats — public; the landing page's only data source. */
export interface NetworkStats {
  sensors?: Sensor[]
  num_users?: number
  [key: string]: unknown
}

export interface SensorPosition {
  longitude?: number
  latitude?: number
  altitude?: number
  indoor?: boolean
}

export interface SensorAntenna {
  directional?: boolean
  angle?: number
  gain?: number
  minFreq?: number
  maxFreq?: number
}

/** Shape returned by /sensor/list and /sensor/status/list -> staticInfo. */
export interface Sensor {
  id?: number | string
  type?: string
  serial?: number | string
  name?: string
  /** Owning account's username; drives the My/Other sensors split. */
  uid?: string
  operator?: string | null
  address?: string | null
  country?: string | null
  contact?: string | null
  position?: SensorPosition
  /** Unix seconds. */
  deployed?: number
  model?: string | null
  frontend?: string | null
  sensing?: boolean
  /** Unix seconds. */
  lastConnectionEvent?: number
  anonymized?: boolean
  antenna?: SensorAntenna | null
  electrosmogEnabled?: boolean
  electrosmogSensor?: boolean
  liveDecoding?: boolean
  /** Legacy flat coordinates; real API nests them under `position`. */
  latitude?: number
  longitude?: number
  lat?: number
  lon?: number
  [key: string]: unknown
}

export interface ControllerInfo {
  Serial?: string | null
  ErrorThreshold?: number
  ProcessCPU?: number | null
  ErrorCounter?: number
  /** e.g. "SENSING", "IDLE", "OFF", "ERROR". */
  Status?: string
  Task?: number
  Target?: number
  TimeError?: boolean
  LastError?: string | null
  Temperature?: number | null
  ProcessMemory?: number | null
  ProcessID?: number | null
  Timing?: unknown
  SoftwareInfo?: { ElectrosensePackage?: string } | null
  [key: string]: unknown
}

export interface SensorStatusEntry {
  staticInfo?: Sensor
  controllerInfo?: ControllerInfo
  [key: string]: unknown
}

/** GET /network/ranking?timestamp=YYYYMM */
export interface RankingEntry {
  timestamp?: number
  serial?: number
  name?: string
  uid?: string
  rankAvailability?: number
  /** Percentage, 0-100. */
  availability?: number
  onlineMinutes?: number
}

/** One ITU frequency allocation, from the `bands.categories` overlay. */
export interface SpectrumBand {
  country?: string
  freqMin?: number
  freqMax?: number
  label?: string
}

/**
 * GET /spectrum/aggregated
 *
 * `values` is a time x frequency matrix of SNR in dB; `null` means no
 * measurement for that cell. Row i has time `startTime + i * timeRes`,
 * column j has frequency `startFreq + j * freqRes`. `interpolated` is a
 * matrix of the same shape (not a boolean) marking filled-in cells.
 */
export interface AggregatedSpectrum {
  startFreq?: number
  startTime?: number
  freqRes?: number
  timeRes?: number
  values?: (number | null)[][]
  interpolated?: (number | null)[][]
  noiseFloor?: number
  bands?: { categories?: SpectrumBand[]; applications?: SpectrumBand[] }
}

export interface ContactPayload {
  name: string
  email: string
  subject: string
  message: string
  'g-recaptcha-response'?: string
}

/** One entry of GET /user/list (admin only). Shape confirmed from a real capture. */
export interface AdminUser {
  uid: string
  username: string
  surname: string
  fullName: string
  mail: string
  organization: string
  postalAddress: string | null
  telephoneNumber: string | null
  postalCode: null
  city: string | null
  country: string | null
  enabled: boolean
  authorities: unknown[]
  /**
   * NOT populated by /user/list: it is false for every user in the capture,
   * including known admins. Do not use it to show or decide roles.
   */
  admin: boolean
  accountNonExpired: boolean
  accountNonLocked: boolean
  credentialsNonExpired: boolean
}

// Signaling stats (admin). Shapes confirmed from a capture (2026-10-02), except
// the `rtc` entries: no session was active, so they come from what the legacy
// streaming-status.html reads.

/** GET /signaling/status */
export interface SignalingStatus {
  /** Sensor serials as strings; a sensor without an id appears as "None". */
  connectedSensors?: string[]
  connectedClients?: string[]
  /** Active WebRTC sessions; `start` is in epoch seconds. */
  rtc?: { clientUid: string; sensorId: string | number; start: number }[]
}

/** GET /signaling/time/user — `duration` in seconds. */
export interface SignalingUserTime {
  uid: string
  duration: number
}

/** GET /signaling/time/sensor — `duration` in seconds. */
export interface SignalingSensorTime {
  sensorId: number
  duration: number
}

/** GET /signaling/time/hours */
export interface SignalingUsageHour {
  hour: number
  startedSessions: number
}
