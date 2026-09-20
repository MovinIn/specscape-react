import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const TITLES: Record<string, string> = {
  '/': 'SpecScape',
  '/contribute': 'Contribute · SpecScape',
  '/join': 'Host a Sensor · SpecScape',
  '/sensor-setup': 'Sensor Setup · SpecScape',
  '/work-with-us': 'Work with Us · SpecScape',
  '/api-spec': 'OpenAPI · SpecScape',
  '/hardware': 'Hardware · SpecScape',
  '/datasets': 'Datasets · SpecScape',
  '/open-source': 'Open Source · SpecScape',
  '/partners': 'Partners · SpecScape',
  '/publications': 'Publications · SpecScape',
  '/faq': 'FAQ · SpecScape',
  '/contact': 'Contact · SpecScape',
  '/terms-of-service': 'Terms · SpecScape',
  '/privacy-policy': 'Privacy · SpecScape',
  '/login': 'Sign in · SpecScape',
  '/logout': 'Sign out · SpecScape',
  '/account/register': 'Register · SpecScape',
  '/account/edit': 'Edit profile · SpecScape',
  '/account/recover': 'Account recovery · SpecScape',
  '/sensors': 'Sensors · SpecScape',
  '/sensor-token': 'Registration token · SpecScape',
  '/specmon': 'Spectrum Monitor · SpecScape',
  '/occupancy': 'Channel Occupancy · SpecScape',
  '/ranking': 'Sensor Ranking · SpecScape',
  '/iq-datasets': 'I/Q Datasets · SpecScape',
  '/spectrum-decoder': 'Spectrum Decoder · SpecScape',
  '/spectrum-decoder-status': 'Signaling Status · SpecScape',
  '/campaign-management': 'Campaigns · SpecScape',
  '/sensor-application-list': 'Sponsoring · SpecScape',
  '/sensor-application-statistics': 'Sponsoring Stats · SpecScape',
}

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/sensors/')) return 'Sensor · SpecScape'
  if (pathname.startsWith('/sensor-application/')) {
    return 'Sponsoring application · SpecScape'
  }
  if (pathname.startsWith('/account/')) return 'Account · SpecScape'
  return 'SpecScape'
}

/** Sync document.title with the current route. */
export function DocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = titleFor(pathname)
  }, [pathname])
  return null
}
