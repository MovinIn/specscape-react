import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
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

export default function LeafletMap({
  markers,
  height = 420,
  onMarkerClick,
  onMapClick,
  center = EUROPE_CENTER,
  zoom = DEFAULT_ZOOM,
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
