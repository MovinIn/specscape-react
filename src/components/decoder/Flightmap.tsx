import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import L from 'leaflet'

/** dump1090-style aircraft state carried by data-channel message id 2. */
export type AircraftState = {
  icao24: string
  flight?: string
  now: number
  lat?: number
  lon?: number
  altitude?: number
  speed?: number
  track?: number
  vert_rate?: number
  squawk?: string
}

export type FlightmapHandle = {
  acState: (s: AircraftState) => void
  /** Ships: the legacy handler throws before drawing anything, so none are shown. */
  aisState: (payload: unknown) => void
}

type Props = {
  ref?: Ref<FlightmapHandle>
  aircraft?: boolean
  ships?: boolean
  /** Pan target, set when connecting to a sensor ('panTo' broadcast). */
  center?: [number, number] | null
  /** Changing this re-measures the map (tab switch). */
  refresh?: unknown
}

// OpenSky state vector: [icao24, callsign, country, timePos, lastContact, lon, lat, baroAlt,
//   onGround, velocity, track, vertRate, sensors, geoAlt, squawk, spi, posSource, category]
type StateVector = [
  string, string | undefined, string, number, number, number | undefined, number | undefined,
  number | undefined, boolean, number, number | undefined, number | undefined, null,
  number | undefined, string | undefined, boolean, number, number,
]

const SPRITE_ROWS: Record<string, number> = { w: 1, g: 3, w_qm: 7, g_qm: 7 }
const QM_COLUMN: Record<string, number> = { w_qm: 1, g_qm: 3 }

const sprites: Record<string, HTMLImageElement> = {}
function sprite(name: string) {
  if (!sprites[name]) {
    const img = new Image()
    img.src = `/images/planes/planes${name}.png`
    sprites[name] = img
  }
  return sprites[name]
}

const iconCache: Record<string, L.Icon> = {}

/** HybridMap.getFlightmarkerImageId: 12° heading steps, 3 sizes by zoom, white/grey by ground state. */
function planeIcon(state: StateVector, zoom: number): L.Icon {
  const heading0 = state[10]
  const leftFactor = Number((((heading0 ?? 0) + 360) % 360 / 12).toFixed(0)) % 30
  let heading = leftFactor * 12
  let name = '_small'
  let size = 20
  let spriteWidth = 600
  if (zoom >= 10) {
    name = ''
    size = 40
    spriteWidth = 1200
  } else if (zoom >= 8) {
    name = '_medium'
    size = 30
    spriteWidth = 900
  }
  let left = size * leftFactor
  if (left > spriteWidth - size) left = 0

  let color = state[8] ? 'g' : 'w'
  if (heading0 == null) {
    color = `${color}_qm`
    heading = 0
    left = size * QM_COLUMN[color]
  }
  const top = size * SPRITE_ROWS[color]
  const id = `plane${name}${color}${heading}`
  const img = sprite(name)
  if (iconCache[id]) return iconCache[id]

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const loaded = img.complete && img.naturalWidth > 0
  if (loaded) canvas.getContext('2d')!.drawImage(img, left, top, size, size, 0, 0, size, size)
  const icon = L.icon({ iconUrl: canvas.toDataURL(), iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
  if (loaded) iconCache[id] = icon
  return icon
}

function popupHtml(s: StateVector) {
  const row = (k: string, v: unknown) =>
    v == null || v === '' ? '' : `<tr><td class="text-primary">${k}</td><td>${String(v)}</td></tr>`
  return `<table class="table table-condensed" style="margin:0">
    ${row('Callsign', s[1]?.trim())}${row('ICAO24', s[0])}${row('Altitude', s[7] != null ? `${s[7]} ft` : null)}
    ${row('Speed', s[9] ? `${Math.round(s[9] * 1.9438)} kt` : null)}${row('Track', s[10] != null ? `${s[10]}°` : null)}
    ${row('Vertical rate', s[11] != null ? `${s[11]} ft/min` : null)}${row('Squawk', s[14])}</table>`
}

/** Port of the flightmap component (OpenSky HybridMap on Leaflet) for ADS-B/AIS. */
export function Flightmap({ ref, aircraft = false, center, refresh }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const flights = useRef<Record<string, StateVector>>({})
  const markers = useRef<Record<string, L.Marker>>({})

  function render() {
    const map = mapRef.current
    if (!map) return
    const zoom = map.getZoom()
    for (const [icao, s] of Object.entries(flights.current)) {
      if (s[5] == null || s[6] == null) continue
      const ll: L.LatLngExpression = [s[6], s[5]]
      const icon = planeIcon(s, zoom)
      const m = markers.current[icao]
      if (m) {
        m.setLatLng(ll)
        m.setIcon(icon)
        m.setPopupContent(popupHtml(s))
      } else {
        markers.current[icao] = L.marker(ll, { icon }).bindPopup(popupHtml(s)).addTo(map)
      }
    }
    for (const icao of Object.keys(markers.current)) {
      if (!flights.current[icao]) {
        markers.current[icao].remove()
        delete markers.current[icao]
      }
    }
  }

  useImperativeHandle(ref, () => ({
    acState(s: AircraftState) {
      if (!aircraft) return
      flights.current[s.icao24] = [
        s.icao24, s.flight, '', s.now, s.now, s.lon, s.lat, s.altitude, false,
        (s.speed ?? 0) / 1.9438, s.track, s.vert_rate, null, s.altitude, s.squawk, false, 1, 0,
      ]
      render()
    },
    aisState() {
      // legacy newShipState references an undefined variable and throws before drawing
    },
  }))

  useEffect(() => {
    const el = divRef.current
    if (!el) return
    const map = L.map(el, {
      zoom: 8,
      center: [38.69508190866783, 0.12657142515286068],
      renderer: L.canvas(),
      scrollWheelZoom: false,
      dragging: true,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        'Data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
      maxZoom: 18,
    }).addTo(map)
    map.on('zoomend', render)
    mapRef.current = map
    // preload sprites so icons are ready by the first message
    ;['_small', '_medium', ''].forEach(sprite)

    const cleanup = window.setInterval(() => {
      const now = Date.now() / 1000
      for (const icao of Object.keys(flights.current)) {
        if (now - flights.current[icao][3] >= 30) delete flights.current[icao]
      }
      render()
    }, 15000)
    return () => {
      window.clearInterval(cleanup)
      map.remove()
      mapRef.current = null
      markers.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (center && mapRef.current) mapRef.current.panTo(center)
  }, [center])

  useEffect(() => {
    const t = window.setTimeout(() => mapRef.current?.invalidateSize())
    return () => window.clearTimeout(t)
  }, [refresh])

  return (
    <>
      <div ref={divRef} style={{ width: '100%', height: 420, position: 'relative' }} />
      <div id="infomarkerTriggerContainer" style={{ display: 'none' }} />
    </>
  )
}
