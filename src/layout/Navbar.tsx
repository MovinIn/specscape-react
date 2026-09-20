import { NavLink, Link, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

const ABOUT_LINKS: [string, string][] = [
  ['/hardware', 'Compatible Hardware'],
  ['/datasets', 'Datasets'],
  ['/open-source', 'Open Source'],
  ['/partners', 'Partners'],
  ['/publications', 'Publications'],
  ['/faq', 'Frequently Asked Questions'],
  ['/contact', 'Contact'],
  ['/terms-of-service', 'Terms of Service'],
  ['/privacy-policy', 'Privacy Policy'],
]

export function Navbar() {
  const { authenticated, isAdmin, loading } = useAuth()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(true)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)

  const close = () => {
    setCollapsed(true)
    setOpenMenu(null)
  }

  const toggleMenu = (id: string) => {
    setOpenMenu((prev) => (prev === id ? null : id))
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!navRef.current?.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const isActive = (paths: string[]) => paths.includes(pathname)

  return (
    <nav
      className="navbar navbar-inverse navbar-fixed-top"
      ref={navRef}
    >
      <div className="container">
        <div className="navbar-header">
          <button
            type="button"
            className={`navbar-toggle${collapsed ? ' collapsed' : ''}`}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((v) => !v)}
          >
            <span className="sr-only">Toggle navigation</span>
            <span className="icon-bar" />
            <span className="icon-bar" />
            <span className="icon-bar" />
          </button>
          <Link className="navbar-brand" to="/" onClick={close}>
            <span className="es-logo" />
          </Link>
        </div>

        <div className={`collapse navbar-collapse${collapsed ? '' : ' in'}`}>
          <ul className="nav navbar-nav">
            <li
              className={`dropdown${openMenu === 'contribute' ? ' open' : ''}${
                isActive(['/join']) ? ' active' : ''
              }`}
            >
              <button
                type="button"
                className="dropdown-toggle"
                aria-haspopup="true"
                aria-expanded={openMenu === 'contribute'}
                onClick={() => toggleMenu('contribute')}
              >
                <span className="glyphicon glyphicon-road" />
                &nbsp;Contribute <span className="caret" />
              </button>
              <ul className="dropdown-menu">
                <li>
                  <Link to="/join" onClick={close}>
                    <span className="glyphicon glyphicon-play" />
                    &nbsp;Host a Sensor
                  </Link>
                </li>
              </ul>
            </li>

            <li className={isActive(['/api-spec']) ? 'active' : ''}>
              <NavLink to="/api-spec" onClick={close}>
                <span className="glyphicon glyphicon-equalizer" /> OpenAPI
              </NavLink>
            </li>

            <li className={`dropdown${openMenu === 'about' ? ' open' : ''}`}>
              <button
                type="button"
                className="dropdown-toggle"
                aria-haspopup="true"
                aria-expanded={openMenu === 'about'}
                onClick={() => toggleMenu('about')}
              >
                About <span className="caret" />
              </button>
              <ul className="dropdown-menu">
                {ABOUT_LINKS.map(([to, label]) => (
                  <li key={to} className={pathname === to ? 'active' : ''}>
                    <Link to={to} onClick={close}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          </ul>

          <ul className="nav navbar-nav navbar-right">
            <li
              className={`dropdown${openMenu === 'app' ? ' open' : ''}${
                isActive([
                  '/sensors',
                  '/specmon',
                  '/iq-datasets',
                  '/occupancy',
                  '/ranking',
                ])
                  ? ' active'
                  : ''
              }`}
            >
              <button
                type="button"
                className="dropdown-toggle"
                aria-haspopup="true"
                aria-expanded={openMenu === 'app'}
                onClick={() => toggleMenu('app')}
              >
                <span className="glyphicon glyphicon-user" /> My SpecScape{' '}
                <span className="caret" />
              </button>
              <ul className="dropdown-menu">
                {!loading && !authenticated && (
                  <li className={pathname === '/login' ? 'active' : ''}>
                    <Link to="/login" onClick={close}>
                      <span className="glyphicon glyphicon-log-in" /> Login
                    </Link>
                  </li>
                )}
                <li className={pathname === '/sensors' ? 'active' : ''}>
                  <Link to="/sensors" onClick={close}>
                    <span className="glyphicon glyphicon-th" /> Sensors
                  </Link>
                </li>
                <li className={pathname === '/spectrum-decoder' ? 'active' : ''}>
                  <Link to="/spectrum-decoder" onClick={close}>
                    <span className="glyphicon glyphicon-sort-by-order" />{' '}
                    Spectrum Decoder
                  </Link>
                </li>
                <li className={pathname === '/specmon' ? 'active' : ''}>
                  <Link to="/specmon" onClick={close}>
                    <span className="glyphicon glyphicon-signal" /> Spectrum
                    Monitor
                  </Link>
                </li>
                <li className={pathname === '/iq-datasets' ? 'active' : ''}>
                  <Link to="/iq-datasets" onClick={close}>
                    <span className="glyphicon glyphicon-file" /> I/Q Data Sets
                  </Link>
                </li>
                <li className={pathname === '/occupancy' ? 'active' : ''}>
                  <Link to="/occupancy" onClick={close}>
                    <span className="glyphicon glyphicon-scale" /> Channel
                    Occupancy
                  </Link>
                </li>
                <li className={pathname === '/ranking' ? 'active' : ''}>
                  <Link to="/ranking" onClick={close}>
                    <span className="glyphicon glyphicon-list-alt" /> Sensor
                    Ranking
                  </Link>
                </li>
                {isAdmin && (
                  <>
                    <li role="separator" className="divider" />
                    <li
                      className={
                        pathname === '/campaign-management' ? 'active' : ''
                      }
                    >
                      <Link to="/campaign-management" onClick={close}>
                        <span className="glyphicon glyphicon-briefcase" />
                        &nbsp;Campaign Management{' '}
                        <small className="text-muted">(EXPERIMENTAL)</small>
                      </Link>
                    </li>
                    <li
                      className={
                        pathname === '/sensor-application-list' ? 'active' : ''
                      }
                    >
                      <Link to="/sensor-application-list" onClick={close}>
                        <span className="glyphicon glyphicon-heart" />
                        &nbsp;Sponsoring Requests
                      </Link>
                    </li>
                    <li
                      className={
                        pathname === '/sensor-application-statistics'
                          ? 'active'
                          : ''
                      }
                    >
                      <Link to="/sensor-application-statistics" onClick={close}>
                        <span className="glyphicon glyphicon-stats" />
                        &nbsp;Sponsoring Statistics
                      </Link>
                    </li>
                    <li
                      className={
                        pathname === '/spectrum-decoder-status' ? 'active' : ''
                      }
                    >
                      <Link to="/spectrum-decoder-status" onClick={close}>
                        <span className="glyphicon glyphicon-scale" />
                        &nbsp;Signaling Status
                      </Link>
                    </li>
                  </>
                )}
                {!loading && authenticated && (
                  <>
                    <li role="separator" className="divider" />
                    <li className={pathname === '/account/edit' ? 'active' : ''}>
                      <Link to="/account/edit" onClick={close}>
                        <span className="glyphicon glyphicon-user" /> Edit
                        Profile
                      </Link>
                    </li>
                    <li className={pathname === '/sensor-token' ? 'active' : ''}>
                      <Link to="/sensor-token" onClick={close}>
                        <span className="glyphicon glyphicon-barcode" />{' '}
                        Registration Token
                      </Link>
                    </li>
                    <li className={pathname === '/logout' ? 'active' : ''}>
                      <Link to="/logout" onClick={close}>
                        <span className="glyphicon glyphicon-off" /> Logout
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}
