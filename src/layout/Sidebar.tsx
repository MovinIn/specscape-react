import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const researchTools = [
  { to: '/sensors', title: 'Sensors', icon: 'location-dot' },
  { to: '/specmon', title: 'Spectrum monitor', icon: 'wave-square' },
  { to: '/specmon?view=map', title: 'Spatial view', icon: 'layer-group', badge: 'MAP' },
  { to: '/spectrum-decoder', title: 'Spectrum decoder', icon: 'satellite-dish' },
  { to: '/occupancy', title: 'Channel occupancy', icon: 'chart-column' },
  { to: '/iq-datasets', title: 'I/Q datasets', icon: 'database' },
  { to: '/ranking', title: 'Sensor ranking', icon: 'ranking-star' },
] as const

const adminLinks = [
  ['/admin/users', 'Users', 'users'],
  ['/campaign-management', 'Campaign management', 'calendar-days'],
  ['/sensor-application-list', 'Sponsoring requests', 'inbox'],
  ['/sensor-application-statistics', 'Sponsoring statistics', 'chart-pie'],
  ['/spectrum-decoder-status', 'Signaling status', 'tower-broadcast'],
] as const

const resourceLinks = [
  ['/api-spec', 'API documentation', 'code'],
  ['/publications', 'Publications', 'file-lines'],
  ['/datasets', 'Public datasets', 'folder-open'],
] as const

const moreLinks = [
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

export function Sidebar() {
  const { isAdmin, user } = useAuth()
  const { pathname, search } = useLocation()
  const mapView = pathname === '/specmon' && new URLSearchParams(search).get('view') === 'map'
  const [area, setArea] = useState<'research' | 'admin'>(
    adminLinks.some(([path]) => path === pathname) ? 'admin' : 'research',
  )

  const active = (to: string) =>
    to.includes('?')
      ? mapView
      : to === '/specmon'
        ? pathname === to && !mapView
        : to === '/sensors'
          ? pathname.startsWith(to)
          : pathname === to
  const link = (on: boolean) => `side-link${on ? ' is-active' : ''}`

  return (
    <aside className="side-nav" aria-label="Workspace navigation">
      <Link to="/" className="side-brand" aria-label="SpecScape home">
        <img src="/images/specscape-globe-logo-cropped.png" alt="" width={32} height={32} />
        <span>Spec<span className="side-brand-accent">Scape</span></span>
      </Link>
      {isAdmin && (
        <div className="side-area" role="group" aria-label="Workspace area">
          <button type="button" aria-pressed={area === 'research'} onClick={() => setArea('research')}>
            Research
          </button>
          <button type="button" aria-pressed={area === 'admin'} onClick={() => setArea('admin')}>
            Administration
          </button>
        </div>
      )}
      <div className="side-scroll">
        <nav aria-label={area === 'admin' ? 'Administration' : 'Research'}>
          <Link
            to="/"
            className={link(pathname === '/')}
            aria-current={pathname === '/' ? 'page' : undefined}
          >
            <i className="fa-solid fa-border-all" aria-hidden="true" /> Overview
          </Link>
          <p className="side-label">WORKSPACE</p>
          {area === 'research' &&
            researchTools.map((tool) => (
              <Link
                key={tool.to}
                to={tool.to}
                className={link(active(tool.to))}
                aria-current={active(tool.to) ? 'page' : undefined}
              >
                <i className={`fa-solid fa-${tool.icon}`} aria-hidden="true" />
                <span>{tool.title}</span>
                {'badge' in tool && <small>{tool.badge}</small>}
              </Link>
            ))}
          {area === 'admin' &&
            adminLinks.map(([to, title, icon]) => (
              <Link
                key={to}
                to={to}
                className={link(pathname === to)}
                aria-current={pathname === to ? 'page' : undefined}
              >
                <i className={`fa-solid fa-${icon}`} aria-hidden="true" />
                {title}
              </Link>
            ))}
        </nav>
        <nav aria-label="Resources">
          <p className="side-label">RESOURCES</p>
          {resourceLinks.map(([to, title, icon]) => (
            <Link key={to} to={to} className={link(pathname === to)}>
              <i className={`fa-solid fa-${icon}`} aria-hidden="true" />
              {title}
            </Link>
          ))}
          <details className="side-details">
            <summary>
              <i className="fa-solid fa-ellipsis" aria-hidden="true" /> More resources <span>+</span>
            </summary>
            <div>
              {moreLinks.map(([to, title]) => (
                <Link key={to} to={to}>
                  {title}
                </Link>
              ))}
            </div>
          </details>
        </nav>
      </div>
      <div className="side-bottom">
        <Link to="/join" className="side-contribute">
          <i className="fa-solid fa-tower-broadcast" aria-hidden="true" />
          <span>
            Grow the network<small>Host a sensor</small>
          </span>
          <span aria-hidden="true">↗</span>
        </Link>
        <details className="side-details side-account">
          <summary>
            <span className="side-avatar">{(user?.username?.[0] ?? 'R').toUpperCase()}</span>
            <span>
              {user?.username}
              <small>{isAdmin ? 'Administrator' : 'Research workspace'}</small>
            </span>
            <span>⌃</span>
          </summary>
          <div>
            <Link to="/account/edit">Account settings</Link>
            <Link to="/logout">Sign out</Link>
          </div>
        </details>
      </div>
    </aside>
  )
}
