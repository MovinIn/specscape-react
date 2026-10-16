import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import type { Sensor } from '../api/types'

/** Public Mapbox token (set in .env.local) for the legacy es-leaflet-map style. */
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? ''
const TILES = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/electrosense/ck37c8r850txw1cqoolb5v136/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const MARKER = (color: string) => color
const ZOOM_AFTER_PAN = 12

export type MapSensor = Sensor & { rtcStatus?: string; connected?: boolean }

type Props = {
  sensors: MapSensor[]
  /** Color markers by rtcStatus (ready = green, otherwise yellow). */
  rtc?: boolean
  scrolling?: boolean
  onSelect?: (serial: string) => void
  /** Changing this re-measures the map (legacy `refresh` binding). */
  refresh?: unknown
  /** CSS height for the map container. Defaults to 420px. */
  height?: string | number
}

function markerImage(s: MapSensor, rtc: boolean) {
  if (rtc) return MARKER(s.rtcStatus === 'ready' ? 'green' : 'yellow')
  if (s.sensing) return MARKER('green')
  if (s.connected) return MARKER('grey')
  return MARKER('blue')
}

const icon = (color: string) =>
  L.divIcon({
    className: 'lx-map-marker-wrap',
    html: `<span class="lx-rtc-marker is-${color}"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })

/**
 * Port of the es-leaflet-map component as the Spectrum Decoder uses it:
 * clustered markers, no popups (the page passes no `infowindow`), and a
 * click selects the sensor, zooms in and turns its marker yellow.
 */
export function EsLeafletMap({
  sensors,
  rtc = false,
  scrolling = true,
  onSelect,
  refresh,
  height = 420,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const markersRef = useRef<Record<string, L.Marker & { sensor?: MapSensor }>>(
    {},
  )
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onSelectRef.current = onSelect
  })

  useEffect(() => {
    const el = divRef.current
    if (!el) return
    const map = L.map(el, {
      center: [43.0722, -89.4008],
      zoom: 4,
      zoomControl: false,
      maxZoom: 18,
      scrollWheelZoom: scrolling,
    })
    new L.Control.Zoom({ position: 'topright' }).addTo(map)
    const cluster = L.markerClusterGroup({
      disableClusteringAtZoom: 18,
      removeOutsideVisibleBounds: false,
      polygonOptions: { weight: 1, color: '#c5c5c5', fillColor: '#5e9cff' },
    })
    map.addLayer(cluster)
    L.tileLayer(TILES, {
      maxZoom: 18,
      attribution: MAPBOX_TOKEN
        ? '&copy; Mapbox &copy; OpenStreetMap'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    mapRef.current = map
    clusterRef.current = cluster
    return () => {
      map.remove()
      mapRef.current = null
      clusterRef.current = null
      markersRef.current = {}
    }
  }, [scrolling])

  // updateMarker(): in rtc mode every marker is rebuilt on each update
  useEffect(() => {
    const map = mapRef.current
    const cluster = clusterRef.current
    if (!map || !cluster) return
    const current = markersRef.current
    const seen: Record<string, true> = {}

    for (const s of sensors) {
      const lat = s.position?.latitude
      const lon = s.position?.longitude
      if (s.serial == null || lat == null || lon == null) continue
      const serial = String(s.serial)
      seen[serial] = true
      const prev = current[serial]
      if (
        !rtc &&
        prev?.sensor &&
        prev.sensor.sensing === s.sensing &&
        prev.sensor.connected === s.connected &&
        prev.getLatLng().lat === lat &&
        prev.getLatLng().lng === lon
      ) {
        continue
      }
      if (prev) cluster.removeLayer(prev)

      const marker = L.marker([lat, lon], {
        icon: icon(markerImage(s, rtc)),
        title: s.name ?? serial,
      }) as L.Marker & {
        sensor?: MapSensor
      }
      marker.sensor = s
      marker.on('click', () => selectSensor(serial))
      marker.on('add', () =>
        marker.getElement()?.setAttribute('aria-label', s.name ?? serial),
      )
      cluster.addLayer(marker)
      current[serial] = marker
    }

    let anyVisible = false
    for (const serial of Object.keys(current)) {
      if (!seen[serial]) {
        cluster.removeLayer(current[serial])
        delete current[serial]
      } else if (map.getBounds().contains(current[serial].getLatLng())) {
        anyVisible = true
      }
    }
    const serials = Object.keys(current)
    if ((!anyVisible || serials.length === 1) && serials.length > 0) {
      map.panTo(current[serials[0]].getLatLng())
    }

    function selectSensor(serial: string) {
      onSelectRef.current?.(serial)
      const m = map!
      const marker = current[serial]
      if (
        marker &&
        (!m.getBounds().contains(marker.getLatLng()) || m.getZoom() < 8)
      ) {
        m.setZoom(ZOOM_AFTER_PAN)
        m.panTo(marker.getLatLng())
      }
      // no info windows on this page: highlight the selection instead
      for (const [s, mk] of Object.entries(current)) {
        mk.setIcon(
          icon(s === serial ? MARKER('yellow') : markerImage(mk.sensor!, rtc)),
        )
      }
    }
  }, [sensors, rtc])

  useEffect(() => {
    const t = window.setTimeout(() => mapRef.current?.invalidateSize())
    return () => window.clearTimeout(t)
  }, [refresh])

  const cssHeight = typeof height === 'number' ? `${height}px` : height
  return (
    <div
      ref={divRef}
      style={{
        width: '100%',
        height: cssHeight,
        position: 'relative',
        zIndex: 1,
      }}
    />
  )
}
