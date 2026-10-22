import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import type { Sensor } from '../api/types'
import { sensorCluster } from '../lib/sensorGeo'

/** Same light OSM tiles as the other maps; the shared grey filter in index.css styles them. */
const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const MARKER = (color: string) =>
  `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`
const ZOOM_AFTER_PAN = 18

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
  /** On first load, zoom in on the area holding most of the sensors. */
  fitCluster?: boolean
}

function markerImage(s: MapSensor, rtc: boolean) {
  if (rtc) return MARKER(s.rtcStatus === 'ready' ? 'green' : 'yellow')
  if (s.sensing) return MARKER('green')
  if (s.connected) return MARKER('grey')
  return MARKER('blue')
}

const icon = (url: string) => L.icon({ iconUrl: url, iconSize: [21, 34] })

/**
 * Port of the es-leaflet-map component as the Spectrum Decoder uses it:
 * clustered markers, no popups (the page passes no `infowindow`), and a
 * click selects the sensor, zooms in and turns its marker yellow.
 */
export function EsLeafletMap({ sensors, rtc = false, scrolling = true, onSelect, refresh, height = 420, fitCluster = false }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const markersRef = useRef<Record<string, L.Marker & { sensor?: MapSensor }>>({})
  const onSelectRef = useRef(onSelect)
  const fittedRef = useRef(false)

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
    L.tileLayer(TILES, { maxZoom: 18, attribution: ATTRIBUTION }).addTo(map)
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

      const marker = L.marker([lat, lon], { icon: icon(markerImage(s, rtc)) }) as L.Marker & {
        sensor?: MapSensor
      }
      marker.sensor = s
      marker.on('click', () => selectSensor(serial))
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
    const area = fitCluster && !fittedRef.current ? sensorCluster(sensors) : null
    if (area) {
      fittedRef.current = true
      map.fitBounds(L.latLngBounds(area.points), { padding: [40, 40], maxZoom: 13 })
    } else if ((!anyVisible || serials.length === 1) && serials.length > 0) {
      map.panTo(current[serials[0]].getLatLng())
    }

    function selectSensor(serial: string) {
      onSelectRef.current?.(serial)
      const m = map!
      const marker = current[serial]
      if (marker && (!m.getBounds().contains(marker.getLatLng()) || m.getZoom() < 8)) {
        m.setZoom(ZOOM_AFTER_PAN)
        m.panTo(marker.getLatLng())
      }
      // no info windows on this page: highlight the selection instead
      for (const [s, mk] of Object.entries(current)) {
        mk.setIcon(icon(s === serial ? MARKER('yellow') : markerImage(mk.sensor!, rtc)))
      }
    }
  }, [sensors, rtc])

  useEffect(() => {
    const t = window.setTimeout(() => mapRef.current?.invalidateSize())
    return () => window.clearTimeout(t)
  }, [refresh])

  const cssHeight = typeof height === 'number' ? `${height}px` : height
  return <div ref={divRef} style={{ width: '100%', height: cssHeight, position: 'relative', zIndex: 1 }} />
}
