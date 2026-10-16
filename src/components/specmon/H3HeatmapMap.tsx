import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { cellToBoundary } from 'h3-js'
import { createMapRenderer } from '../../lib/mapRenderer'
import {
  heatColor,
  heatGradientCss,
  type CellStat,
} from '../../lib/geoSpectrum'

export type MapTrack = {
  sensor: string
  name: string
  points: [number, number][]
}
export type MapSource = { label: string; lat: number; lon: number }

type Props = {
  cells: CellStat[]
  /** Values at or below [0] get the lightest colour, at or above [1] the darkest. */
  domain: [number, number]
  legendTitle: string
  formatValue: (v: number) => string
  /** Extra tooltip lines for a cell (e.g. sweep count). */
  describeCell: (c: CellStat) => string
  selectedId: string | null
  onSelect: (id: string | null) => void
  onZoom: (zoom: number) => void
  tracks: MapTrack[]
  sources?: MapSource[]
  center: [number, number]
  height?: number
}

const MEASURED_OPACITY = 0.78
const ESTIMATED_OPACITY = 0.32

/** Same OSM tiles as LeafletMap; `.h3-map` greys them so the heat colours carry the page. */
const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function ZoomReporter({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  useEffect(() => onZoom(map.getZoom()), [map, onZoom])
  return null
}

/** Clears the selection when the map background is clicked. */
function BackgroundClick({ onClick }: { onClick: () => void }) {
  useMapEvents({ click: onClick })
  return null
}

/** One canvas-rendered polygon per H3 cell. */
function HexLayer(
  props: Pick<
    Props,
    'cells' | 'domain' | 'formatValue' | 'describeCell' | 'onSelect'
  >,
) {
  const map = useMap()
  const propsRef = useRef(props)
  useEffect(() => {
    propsRef.current = props
  })
  const { cells } = props
  const [lo, hi] = props.domain
  // One renderer for the layer's lifetime. Leaflet keeps a renderer on the map
  // after its paths are removed, so a new one per redraw leaks a canvas the
  // size of the map on every slider move or band change.
  const [renderer] = useState(() => createMapRenderer({ padding: 0.1 }))

  useEffect(() => {
    const group = L.featureGroup()
    const cellOf = new Map<number, CellStat>()
    const span = hi - lo || 1
    for (const c of cells) {
      const poly = L.polygon(cellToBoundary(c.id), {
        renderer,
        weight: 0.6,
        color: 'rgba(60, 60, 60, 0.35)',
        fillColor: heatColor((c.value - lo) / span),
        fillOpacity: c.interpolated ? ESTIMATED_OPACITY : MEASURED_OPACITY,
      })
      cellOf.set(L.Util.stamp(poly), c)
      group.addLayer(poly)
    }
    // A single shared tooltip; one per polygon costs memory for thousands of cells.
    const tip = L.tooltip({ direction: 'top', offset: [0, -6] })
    group.on('mousemove', (e) => {
      const c = cellOf.get(L.Util.stamp(e.propagatedFrom))
      if (!c) return
      const p = propsRef.current
      tip
        .setLatLng(e.latlng)
        .setContent(
          `<strong>${escapeHtml(p.formatValue(c.value))}</strong><br/>${escapeHtml(p.describeCell(c))}`,
        )
      if (!map.hasLayer(tip)) map.openTooltip(tip)
    })
    group.on('mouseout', () => map.closeTooltip(tip))
    group.on('click', (e) => {
      L.DomEvent.stopPropagation(e)
      const c = cellOf.get(L.Util.stamp(e.propagatedFrom))
      if (c) propsRef.current.onSelect(c.id)
    })
    group.addTo(map)
    return () => {
      map.closeTooltip(tip)
      group.remove()
    }
  }, [map, renderer, cells, lo, hi])

  // Declared after the layer effect so its paths are removed before the renderer.
  useEffect(
    () => () => {
      renderer.remove()
    },
    [renderer],
  )
  return null
}

/** Outline for the selected cell, kept separate so selecting doesn't redraw every hex. */
function SelectionLayer({ id }: { id: string | null }) {
  const map = useMap()
  useEffect(() => {
    if (!id) return
    const outline = L.polygon(cellToBoundary(id), {
      weight: 3,
      color: '#111',
      fill: false,
      interactive: false,
    }).addTo(map)
    return () => {
      outline.remove()
    }
  }, [map, id])
  return null
}

function TrackLayer({ tracks }: { tracks: MapTrack[] }) {
  const map = useMap()
  useEffect(() => {
    const group = L.layerGroup()
    for (const t of tracks) {
      if (!t.points.length) continue
      L.polyline(t.points, {
        color: '#444',
        weight: 1.5,
        opacity: 0.55,
        interactive: false,
      }).addTo(group)
      // Where the sensor is at the end of the selected window.
      L.circleMarker(t.points[t.points.length - 1], {
        radius: 6,
        color: '#fff',
        weight: 2,
        fillColor: '#222',
        fillOpacity: 1,
      })
        .bindTooltip(escapeHtml(t.name), { direction: 'top', offset: [0, -6] })
        .addTo(group)
    }
    group.addTo(map)
    return () => {
      group.remove()
    }
  }, [map, tracks])
  return null
}

function SourceLayer({ sources }: { sources: MapSource[] }) {
  const map = useMap()
  useEffect(() => {
    const group = L.layerGroup()
    for (const s of sources) {
      L.circleMarker([s.lat, s.lon], {
        radius: 5,
        color: '#1d4f91',
        weight: 2,
        fillColor: '#fff',
        fillOpacity: 1,
      })
        .bindTooltip(escapeHtml(s.label), { direction: 'top', offset: [0, -6] })
        .addTo(group)
    }
    group.addTo(map)
    return () => {
      group.remove()
    }
  }, [map, sources])
  return null
}

/** Fits the view to the tracks the first time any arrive. */
function FitToTracks({ tracks }: { tracks: MapTrack[] }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    const pts = tracks.flatMap((t) => t.points)
    if (!pts.length) return
    done.current = true
    map.fitBounds(L.latLngBounds(pts), { padding: [20, 20] })
  }, [map, tracks])
  return null
}

function Legend({
  domain,
  title,
  formatValue,
}: {
  domain: [number, number]
  title: string
  formatValue: (v: number) => string
}) {
  const [lo, hi] = domain
  return (
    <div className="h3-legend">
      <div className="h3-legend-title">{title}</div>
      <div
        className="h3-legend-bar"
        style={{ background: heatGradientCss() }}
      />
      <div className="h3-legend-ticks">
        <span>≤{formatValue(lo)}</span>
        <span>{formatValue((lo + hi) / 2)}</span>
        <span>≥{formatValue(hi)}</span>
      </div>
      <div className="h3-legend-key">
        <span
          className="h3-legend-swatch"
          style={{ opacity: MEASURED_OPACITY }}
        />{' '}
        measured
        <span
          className="h3-legend-swatch"
          style={{ opacity: ESTIMATED_OPACITY, marginLeft: 10 }}
        />{' '}
        estimated
      </div>
    </div>
  )
}

/** Leaflet map with an H3 hexagon heatmap, sensor tracks and a legend. */
export function H3HeatmapMap({
  cells,
  domain,
  legendTitle,
  formatValue,
  describeCell,
  selectedId,
  onSelect,
  onZoom,
  tracks,
  sources,
  center,
  height = 560,
}: Props) {
  return (
    <div
      className="leaflet-map-wrap h3-map"
      style={{ height, width: '100%', position: 'relative' }}
    >
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer attribution={ATTRIBUTION} url={TILES} />
        <ZoomReporter onZoom={onZoom} />
        <BackgroundClick onClick={() => onSelect(null)} />
        <HexLayer
          cells={cells}
          domain={domain}
          formatValue={formatValue}
          describeCell={describeCell}
          onSelect={onSelect}
        />
        <TrackLayer tracks={tracks} />
        {sources && <SourceLayer sources={sources} />}
        <SelectionLayer id={selectedId} />
        <FitToTracks tracks={tracks} />
      </MapContainer>
      <Legend domain={domain} title={legendTitle} formatValue={formatValue} />
    </div>
  )
}
