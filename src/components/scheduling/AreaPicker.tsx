import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import type { Sensor } from '../../api/types'
import { sensorCluster } from '../../lib/sensorGeo'
import { sensorIcon, type SensorState } from '../../lib/sensorIcon'

/** [south, west, north, east] in degrees. */
export type Area = [number, number, number, number]

export const MAX_AREA_MILES = 50
const MILES_PER_DEG_LAT = 69

const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

type Located = { serial: string; name: string; lat: number; lon: number; online: boolean; mobile: boolean }
type Group = 'free' | 'busy' | 'offline'

/** Width and height of an area in miles. */
export function areaMiles([s, w, n, e]: Area): [number, number] {
  const midLat = ((s + n) / 2) * (Math.PI / 180)
  return [(e - w) * MILES_PER_DEG_LAT * Math.cos(midLat), (n - s) * MILES_PER_DEG_LAT]
}

export const parseArea = (v: string | undefined): Area | null => {
  const a = (v ?? '').split(',').map(Number)
  return a.length === 4 && a.every(Number.isFinite) ? (a as Area) : null
}

function locate(sensors: Sensor[]): Located[] {
  return sensors.flatMap((s) => {
    const lat = Number(s.position?.latitude ?? s.latitude ?? s.lat)
    const lon = Number(s.position?.longitude ?? s.longitude ?? s.lon)
    if (s.serial == null || !Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return []
    const serial = String(s.serial)
    return [{ serial, name: s.name ? String(s.name) : serial, lat, lon, online: Boolean(s.sensing), mobile: Boolean(s.mobile) }]
  })
}

const inside = ([s, w, n, e]: Area, p: Located) => p.lat >= s && p.lat <= n && p.lon >= w && p.lon <= e

/** Keep the dragged corner within MAX_AREA_MILES of the anchor on both axes. */
function clampCorner(anchor: L.LatLng, corner: L.LatLng): L.LatLng {
  const maxDLat = MAX_AREA_MILES / MILES_PER_DEG_LAT
  const lat = anchor.lat + Math.max(-maxDLat, Math.min(maxDLat, corner.lat - anchor.lat))
  const cos = Math.max(0.01, Math.cos((((anchor.lat + lat) / 2) * Math.PI) / 180))
  const maxDLon = maxDLat / cos
  return L.latLng(lat, anchor.lng + Math.max(-maxDLon, Math.min(maxDLon, corner.lng - anchor.lng)))
}

const toArea = (b: L.LatLngBounds): Area => [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]

type Props = {
  sensors: Sensor[]
  /** Serials already booked for the chosen time. */
  busy: Set<string>
  area: Area | null
  onArea: (a: Area | null) => void
  selected: string[]
  onChange: (serials: string[]) => void
  disabled?: boolean
}

/**
 * Map + list for booking every free sensor inside a drawn rectangle. Drawing
 * (or a new time) selects the free, online sensors in the area; the list lets
 * the user untick some or add an offline one.
 */
export function AreaPicker({ sensors, busy, area, onArea, selected, onChange, disabled }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const rectRef = useRef<L.Rectangle | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [liveSize, setLiveSize] = useState<[number, number] | null>(null)

  const located = locate(sensors)
  // Mobile sensors are never booked by serial: the controller adds them while they are inside the area.
  const inArea = area ? located.filter((p) => !p.mobile && inside(area, p)) : []
  const mobileInArea = area ? located.filter((p) => p.mobile && inside(area, p)) : []
  const mobileCount = located.filter((p) => p.mobile).length
  const groupOf = (p: Located): Group => (!p.online ? 'offline' : busy.has(p.serial) ? 'busy' : 'free')
  const busyKey = [...busy].sort().join(',')
  const areaKey = area?.join(',') ?? ''
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // A new area or a new time re-selects the free, online sensors inside it.
  // shortcut: this also replaces manual ticks after a time change; keep ticks per area if users complain.
  useEffect(() => {
    if (!area) return
    onChangeRef.current(inArea.filter((p) => groupOf(p) === 'free').map((p) => p.serial))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaKey, busyKey, sensors])

  // map setup
  useEffect(() => {
    const el = divRef.current
    if (!el) return
    const map = L.map(el, { center: [43.0722, -89.4008], zoom: 4, zoomControl: false, maxZoom: 18 })
    new L.Control.Zoom({ position: 'topright' }).addTo(map)
    L.tileLayer(TILES, { maxZoom: 18, attribution: ATTRIBUTION }).addTo(map)
    markersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      rectRef.current = null
    }
  }, [])

  // first view: the saved area, else where most sensors are
  const fittedRef = useRef(false)
  useEffect(() => {
    const map = mapRef.current
    if (!map || fittedRef.current || located.length === 0) return
    fittedRef.current = true
    if (area) map.fitBounds([[area[0], area[1]], [area[2], area[3]]], { padding: [30, 30] })
    else {
      const c = sensorCluster(sensors)
      if (c) map.fitBounds(L.latLngBounds(c.points), { padding: [40, 40], maxZoom: 11 })
    }
  })

  // markers: green free, amber busy, red offline; halo = selected
  useEffect(() => {
    const layer = markersRef.current
    if (!layer) return
    layer.clearLayers()
    const state: Record<Group, SensorState> = { free: 'online', busy: 'idle', offline: 'offline' }
    const text: Record<Group, string> = { free: 'free', busy: 'booked at this time', offline: 'offline' }
    for (const p of located) {
      const g = groupOf(p)
      const tip = document.createElement('span')
      tip.textContent = p.mobile
        ? `${p.name} (${p.serial}) · mobile, last seen here · joins while inside the area`
        : `${p.name} (${p.serial}) · ${text[g]}`
      const icon = p.mobile ? sensorIcon('unknown') : sensorIcon(state[g], selected.includes(p.serial))
      L.marker([p.lat, p.lon], { icon, keyboard: false })
        .bindTooltip(tip, { direction: 'top', offset: [0, -16] })
        .addTo(layer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensors, busyKey, selected])

  // rectangle follows `area`
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!area) {
      rectRef.current?.remove()
      rectRef.current = null
      return
    }
    const b = L.latLngBounds([area[0], area[1]], [area[2], area[3]])
    if (rectRef.current) rectRef.current.setBounds(b)
    else rectRef.current = L.rectangle(b, { color: '#2780e3', weight: 2, fillOpacity: 0.08, interactive: false }).addTo(map)
  }, [areaKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // draw mode: press, drag, release
  useEffect(() => {
    const map = mapRef.current
    if (!map || !drawing) return
    map.dragging.disable()
    map.getContainer().style.cursor = 'crosshair'
    let anchor: L.LatLng | null = null
    let temp: L.Rectangle | null = null

    const down = (e: L.LeafletMouseEvent) => {
      anchor = e.latlng
      temp = L.rectangle(L.latLngBounds(anchor, anchor), { color: '#2780e3', weight: 2, dashArray: '4', fillOpacity: 0.08, interactive: false }).addTo(map)
    }
    const move = (e: L.LeafletMouseEvent) => {
      if (!anchor || !temp) return
      const b = L.latLngBounds(anchor, clampCorner(anchor, e.latlng))
      temp.setBounds(b)
      setLiveSize(areaMiles(toArea(b)))
    }
    const up = () => {
      if (!anchor || !temp) return
      const a = toArea(temp.getBounds())
      temp.remove()
      anchor = temp = null
      setLiveSize(null)
      setDrawing(false)
      if (a[2] - a[0] > 1e-5 && a[3] - a[1] > 1e-5) onArea(a) // ignore a click without a drag
    }
    map.on('mousedown', down)
    map.on('mousemove', move)
    map.on('mouseup', up)
    return () => {
      temp?.remove()
      map.off('mousedown', down)
      map.off('mousemove', move)
      map.off('mouseup', up)
      map.dragging.enable()
      map.getContainer().style.cursor = ''
    }
  }, [drawing, onArea])

  function toggle(serial: string) {
    onChange(selected.includes(serial) ? selected.filter((s) => s !== serial) : [...selected, serial])
  }

  const groups: { key: Group; title: string }[] = [
    { key: 'free', title: 'Free' },
    { key: 'busy', title: 'Booked at this time' },
    { key: 'offline', title: 'Offline' },
  ]
  const size = liveSize ?? (area ? areaMiles(area) : null)

  const mobileNote = mobileCount > 0 && (
    <div className="xs-area-mobile">
      <strong>Mobile sensors</strong> join automatically while they are inside this area during the booking, and
      leave when they drive out. They can't be reserved, so they take part only when no one has booked them by name.
      {mobileInArea.length > 0 && (
        <div className="xs-area-mobile-now">
          Inside now: {mobileInArea.map((p) => p.name).join(', ')}
        </div>
      )}
    </div>
  )

  return (
    <div className="xs-area">
      <div className="xs-area-map">
        <div className="xs-area-tools">
          <button type="button" className={`btn btn-sm ${drawing ? 'btn-primary' : 'btn-default'}`} disabled={disabled}
            aria-pressed={drawing} onClick={() => setDrawing((d) => !d)}>
            {drawing ? 'Drag on the map…' : area ? 'Redraw area' : 'Draw area'}
          </button>
          {area && !drawing && (
            <button type="button" className="btn btn-default btn-sm" disabled={disabled} onClick={() => { onArea(null); onChange([]) }}>
              Clear
            </button>
          )}
          {size && (
            <span className="xs-area-size">
              {size[0].toFixed(1)} × {size[1].toFixed(1)} mi
              <small> (max {MAX_AREA_MILES} × {MAX_AREA_MILES})</small>
            </span>
          )}
        </div>
        <div ref={divRef} className="xs-area-canvas" />
        <div className="xs-area-legend" aria-hidden="true">
          <span><i style={{ background: '#3fb618' }} /> Free</span>
          <span><i style={{ background: '#f0a30a' }} /> Booked</span>
          <span><i style={{ background: '#ce3c36' }} /> Offline</span>
          {mobileCount > 0 && <span><i style={{ background: '#2780e3' }} /> Mobile (last position)</span>}
        </div>
      </div>

      <div className="xs-area-side">
        {!area ? (
          <p className="text-muted xs-area-empty">
            Click <strong>Draw area</strong>, then drag a box over the map. Every free sensor inside it is added to the booking.
          </p>
        ) : inArea.length === 0 ? (
          <>
            <p className="text-muted xs-area-empty">No fixed sensors in this area. Redraw it somewhere with markers.</p>
            {mobileNote}
          </>
        ) : (
          <>
            <div className="xs-area-summary">
              <strong>{selected.length}</strong> of {inArea.length} sensors in this area selected
            </div>
            <ul className="xs-sensor-list xs-area-list">
              {groups.map(({ key, title }) => {
                const list = inArea.filter((p) => groupOf(p) === key)
                if (list.length === 0) return null
                return (
                  <li key={key}>
                    <div className="xs-sensor-group">{title} ({list.length})</div>
                    {list.map((p) => (
                      <label key={p.serial} className={`xs-sensor${key === 'busy' ? ' is-disabled' : ''}`}>
                        <input type="checkbox" checked={selected.includes(p.serial)} disabled={disabled || key === 'busy'}
                          onChange={() => toggle(p.serial)} />
                        <span className={`xs-dot is-${key}`} />
                        {p.name}
                        <small>({p.serial})</small>
                      </label>
                    ))}
                  </li>
                )
              })}
            </ul>
            <p className="help-block">Booked sensors can't be added. Offline sensors are left out unless you tick them.</p>
            {mobileNote}
          </>
        )}
      </div>
    </div>
  )
}
