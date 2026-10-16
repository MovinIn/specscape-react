export const researchTools = [
  {
    to: '/sensors',
    title: 'Sensor explorer',
    icon: 'location-dot',
    description: 'Find a sensor. Start with a place.',
  },
  {
    to: '/specmon',
    title: 'Spectrum monitor',
    icon: 'wave-square',
    description: 'Explore measurements across frequency and time.',
  },
  {
    to: '/specmon?view=map',
    title: 'Spatial view',
    icon: 'layer-group',
    description: 'Discover patterns across the map.',
    badge: 'LAB',
  },
  {
    to: '/spectrum-decoder',
    title: 'Signal decoder',
    icon: 'satellite-dish',
    description: 'Stream and decode a remote radio signal.',
  },
  {
    to: '/occupancy',
    title: 'Channel occupancy',
    icon: 'chart-column',
    description: 'Understand how a frequency band is used.',
  },
  {
    to: '/iq-datasets',
    title: 'I/Q datasets',
    icon: 'database',
    description: 'Take signal recordings into your research.',
  },
  {
    to: '/ranking',
    title: 'Sensor ranking',
    icon: 'ranking-star',
    description: 'Meet the contributors behind the network.',
  },
] as const

export const resourceLinks = [
  ['/api-spec', 'API documentation', 'code'],
  ['/publications', 'Publications', 'file-lines'],
  ['/datasets', 'Public datasets', 'folder-open'],
] as const

export const moreLinks = [
  ['/hardware', 'Compatible hardware'],
  ['/open-source', 'Open source'],
  ['/partners', 'Partners'],
  ['/faq', 'Help & FAQ'],
  ['/contact', 'Contact'],
  ['/contribute', 'Contribute'],
  ['/sensor-setup', 'Sensor setup'],
  ['/sensor-token', 'Registration token'],
  ['/work-with-us', 'Work with us'],
] as const

export const adminLinks = [
  ['/sensors/manage', 'Sensor management', 'server'],
  ['/admin/users', 'Users', 'users'],
  ['/campaign-management', 'Campaign management', 'calendar-days'],
  ['/sensor-application-list', 'Sponsoring requests', 'inbox'],
  ['/sensor-application-statistics', 'Sponsoring statistics', 'chart-pie'],
  ['/spectrum-decoder-status', 'Signaling status', 'tower-broadcast'],
] as const

export { isPreview, isLocalAdmin } from './runtime'
