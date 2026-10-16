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
  /** Accept a vessel, an array of vessels or a ships envelope. */
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
  string,
  string | undefined,
  string,
  number,
  number,
  number | undefined,
  number | undefined,
  number | undefined,
  boolean,
  number,
  number | undefined,
  number | undefined,
  null,
  number | undefined,
  string | undefined,
  boolean,
  number,
  number,
]

function transportIcon(heading: number, ship = false): L.DivIcon {
  const path = ship
    ? 'M12 2 19 18l-7-4-7 4Z'
    : 'm12 2 2 7 7 4v2l-7-2v5l3 2v1l-5-1-5 1v-1l3-2v-5l-7 2v-2l7-4Z'
  return L.divIcon({
    className: 'lx-transport-icon',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" style="transform:rotate(${Number.isFinite(heading) ? heading : 0}deg)"><path d="${path}" fill="${ship ? '#65a7ba' : '#9875c5'}" stroke="white" stroke-width="1.2"/></svg>`,
    iconSize: [25, 25],
    iconAnchor: [12, 12],
  })
}

function escapeHtml(value: unknown) {
  return String(value).replace(
    /[&<>"']/g,
    (character) => `&#${character.charCodeAt(0)};`,
  )
}

function popupHtml(s: StateVector) {
  const row = (k: string, v: unknown) =>
    v == null || v === ''
      ? ''
      : `<tr><td class="text-primary">${k}</td><td>${escapeHtml(v)}</td></tr>`
  return `<table class="table table-condensed" style="margin:0">
    ${row('Callsign', s[1]?.trim())}${row('ICAO24', s[0])}${row('Altitude', s[7] != null ? `${s[7]} ft` : null)}
    ${row('Speed', s[9] ? `${Math.round(s[9] * 1.9438)} kt` : null)}${row('Track', s[10] != null ? `${s[10]}°` : null)}
    ${row('Vertical rate', s[11] != null ? `${s[11]} ft/min` : null)}${row('Squawk', s[14])}</table>`
}

/** Port of the flightmap component (OpenSky HybridMap on Leaflet) for ADS-B/AIS. */
export function Flightmap({
  ref,
  aircraft = false,
  ships = false,
  center,
  refresh,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const flights = useRef<Record<string, StateVector>>({})
  const markers = useRef<Record<string, L.Marker>>({})
  const shipMarkers = useRef<Record<string, L.Marker>>({})

  function render() {
    const map = mapRef.current
    if (!map) return
    for (const [icao, s] of Object.entries(flights.current)) {
      if (s[5] == null || s[6] == null) continue
      const ll: L.LatLngExpression = [s[6], s[5]]
      const icon = transportIcon(s[10] ?? 0)
      const m = markers.current[icao]
      if (m) {
        m.setLatLng(ll)
        m.setIcon(icon)
        m.setPopupContent(popupHtml(s))
      } else {
        markers.current[icao] = L.marker(ll, { icon })
          .bindPopup(popupHtml(s))
          .addTo(map)
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
        s.icao24,
        s.flight,
        '',
        s.now,
        s.now,
        s.lon,
        s.lat,
        s.altitude,
        false,
        (s.speed ?? 0) / 1.9438,
        s.track,
        s.vert_rate,
        null,
        s.altitude,
        s.squawk,
        false,
        1,
        0,
      ]
      render()
    },
    aisState(payload: unknown) {
      if (!ships || !mapRef.current || !payload) return
      const raw = payload as Record<string, unknown>
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(raw.ships)
          ? raw.ships
          : [payload]
      for (const entry of rows) {
        if (!entry || typeof entry !== 'object') continue
        const vessel = entry as Record<string, unknown>
        const latitude = vessel.lat ?? vessel.latitude
        const longitude = vessel.lon ?? vessel.longitude
        if (latitude == null || longitude == null) continue
        const lat = Number(latitude),
          lon = Number(longitude)
        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lon) ||
          Math.abs(lat) > 90 ||
          Math.abs(lon) > 180
        )
          continue
        const id = String(
          vessel.mmsi ?? vessel.MMSI ?? vessel.id ?? `${lat},${lon}`,
        )
        const name = vessel.name ?? vessel.shipname ?? id
        const heading = Number(vessel.heading ?? vessel.course ?? 0)
        const popup = `<strong>${escapeHtml(name)}</strong><br/>MMSI ${escapeHtml(id)}<br/>Speed ${escapeHtml(vessel.speed ?? 'Unknown')} kt`
        const existing = shipMarkers.current[id]
        if (existing)
          existing
            .setLatLng([lat, lon])
            .setIcon(transportIcon(heading, true))
            .setPopupContent(popup)
        else
          shipMarkers.current[id] = L.marker([lat, lon], {
            icon: transportIcon(heading, true),
            title: String(name),
          })
            .bindPopup(popup)
            .addTo(mapRef.current)
      }
    },
  }))

  useEffect(() => {
    const el = divRef.current
    if (!el) return
    const map = L.map(el, {
      zoom: 8,
      center: [38.69508190866783, 0.12657142515286068],
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
      shipMarkers.current = {}
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
      <div
        ref={divRef}
        style={{ width: '100%', height: 420, position: 'relative' }}
      />
      <div id="infomarkerTriggerContainer" style={{ display: 'none' }} />
    </>
  )
}
