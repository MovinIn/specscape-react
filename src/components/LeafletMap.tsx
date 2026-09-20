import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export type MapMarker = {
  id: string | number
  lat: number
  lon: number
  label?: string
  online?: boolean
}

type LeafletMapProps = {
  markers: MapMarker[]
  height?: string | number
  onMarkerClick?: (marker: MapMarker) => void
  onMapClick?: (lat: number, lon: number) => void
  center?: [number, number]
  zoom?: number
  /** Marker id to pan to and open, mirroring the original's highlightSensor. */
  selectedId?: string
  /** Fit the viewport to all markers once they first load. */
  fitToMarkers?: boolean
}

const EUROPE_CENTER: [number, number] = [50.0, 10.0]
const DEFAULT_ZOOM = 4

function MapClickHandler({
  onMapClick,
}: {
  onMapClick?: (lat: number, lon: number) => void
}) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

/** Pans the map to the selected marker when the selection changes. */
function SelectionFocus({
  markers,
  selectedId,
}: {
  markers: MapMarker[]
  selectedId?: string
}) {
  const map = useMap()
  useEffect(() => {
    if (!selectedId) return
    const target = markers.find((m) => String(m.id) === selectedId)
    if (target) map.setView([target.lat, target.lon], Math.max(map.getZoom(), 9))
  }, [map, markers, selectedId])
  return null
}

/** Fits the viewport to all markers once they first arrive. */
function FitToMarkers({
  markers,
  enabled,
}: {
  markers: MapMarker[]
  enabled: boolean
}) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (!enabled || done.current || markers.length === 0) return
    done.current = true
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lon], 9)
      return
    }
    map.fitBounds(
      markers.map((m) => [m.lat, m.lon] as [number, number]),
      { padding: [40, 40], maxZoom: 12 },
    )
  }, [map, markers, enabled])
  return null
}

export default function LeafletMap({
  markers,
  height = 420,
  onMarkerClick,
  onMapClick,
  center = EUROPE_CENTER,
  zoom = DEFAULT_ZOOM,
  selectedId,
  fitToMarkers = false,
}: LeafletMapProps) {
  const styleHeight = typeof height === 'number' ? `${height}px` : height

  return (
    <div className="leaflet-map leaflet-map-wrap" style={{ height: styleHeight, width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onMapClick} />
        <SelectionFocus markers={markers} selectedId={selectedId} />
        <FitToMarkers markers={markers} enabled={fitToMarkers} />
        {markers.map((m) => (
          <Marker
            key={String(m.id)}
            position={[m.lat, m.lon]}
            eventHandlers={{
              click: () => onMarkerClick?.(m),
            }}
          >
            <Popup>
              <strong>{m.label ?? `Sensor ${m.id}`}</strong>
              {m.online !== undefined ? (
                <div>
                  <span
                    className={
                      m.online ? 'badge badge-online' : 'badge badge-offline'
                    }
                  >
                    {m.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              ) : null}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
