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
  bands?: { categories?: SpectrumBand[] }
}

export interface ContactPayload {
  name: string
  email: string
  subject: string
  message: string
  'g-recaptcha-response'?: string
}
