export interface Principal {
  username: string
  admin?: boolean
}

export interface NetworkStats {
  sensors?: number
  users?: number
  online?: number
  sensorsOnline?: number
  [key: string]: unknown
}

export interface Sensor {
  id?: number | string
  serial?: number | string
  name?: string
  sensing?: boolean
  liveDecoding?: boolean
  latitude?: number
  longitude?: number
  lat?: number
  lon?: number
  owner?: string
  hardware?: string
  lastConnectionEvent?: string | number
  [key: string]: unknown
}

export interface SensorStatusEntry {
  staticInfo?: Sensor
  controllerInfo?: {
    Status?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface ContactPayload {
  name: string
  email: string
  subject: string
  message: string
  'g-recaptcha-response'?: string
}
