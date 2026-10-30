import L from 'leaflet'

/** Marker fill per sensor state. */
export const SENSOR_COLORS = {
  online: '#3fb618', // green, same as .badge-online
  offline: '#ce3c36', // red, same as .badge-offline
  idle: '#f0a30a', // connected but not sensing / not ready
  unknown: '#2780e3', // no status known (e.g. the location picker)
} as const

export type SensorState = keyof typeof SENSOR_COLORS

const DISH_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="1.7" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M4 5c0 6.5 5 11.5 11.5 11.5z" fill="#fff"/>' +
  '<path d="M9.8 10.8 14 7"/><circle cx="14.6" cy="6.4" r=".9" fill="#fff"/>' +
  '<path d="M10 16.5v4M7 20.5h6"/>' +
  '<path d="M17 3.5a5.5 5.5 0 0 1 3.5 3.5M17.5 8a2 2 0 0 1 1 1"/>' +
  '</svg>'

/** Radar-dish marker coloured by sensor state; `selected` adds a halo. */
export function sensorIcon(state: SensorState, selected = false): L.DivIcon {
  return L.divIcon({
    className: 'sensor-marker-wrap',
    html: `<div class="sensor-marker${selected ? ' sensor-marker-selected' : ''}" style="background:${SENSOR_COLORS[state]}">${DISH_SVG}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })
}
