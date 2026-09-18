import { NavLink, Link } from 'react-router-dom'
import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export function Navbar() {
  const { authenticated, isAdmin, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const menuId = useId()

  const close = () => {
    setMobileOpen(false)
    setOpenMenu(null)
  }

  const toggleMenu = (id: string) => {
    setOpenMenu((prev) => (prev === id ? null : id))
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    function onClick(e: MouseEvent) {
      if (!navRef.current?.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [])

  return (
    <header className="site-nav" ref={navRef}>
      <div className="site-nav__inner">
        <Link className="site-nav__brand" to="/" onClick={close}>
          <img
            className="brand-logo"
            src="/images/specscape.png"
            alt="SpecScape"
          />
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={mobileOpen}
          aria-controls={menuId}
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen((v) => !v)}
        >
          Menu
        </button>

        <nav aria-label="Primary">
          <ul
            id={menuId}
            className={`site-nav__links${mobileOpen ? ' open' : ''}`}
          >
            <li className={openMenu === 'contribute' ? 'open' : ''}>
              <button
                type="button"
                className="nav-trigger"
                aria-expanded={openMenu === 'contribute'}
                aria-haspopup="true"
                onClick={() => toggleMenu('contribute')}
              >
                Contribute
              </button>
              <ul
                className={`nav-menu${openMenu === 'contribute' ? ' open' : ''}`}
                role="menu"
              >
                <li role="none">
                  <Link role="menuitem" to="/join" onClick={close}>
                    Host a Sensor
                  </Link>
                </li>
                <li role="none">
                  <Link role="menuitem" to="/work-with-us" onClick={close}>
                    Work with Us
                  </Link>
                </li>
              </ul>
            </li>

            <li>
              <NavLink className="nav-link" to="/api-spec" onClick={close}>
                OpenAPI
              </NavLink>
            </li>

            <li className={openMenu === 'about' ? 'open' : ''}>
              <button
                type="button"
                className="nav-trigger"
                aria-expanded={openMenu === 'about'}
                aria-haspopup="true"
                onClick={() => toggleMenu('about')}
              >
                About
              </button>
              <ul
                className={`nav-menu${openMenu === 'about' ? ' open' : ''}`}
                role="menu"
              >
                {[
                  ['/hardware', 'Compatible Hardware'],
                  ['/datasets', 'Datasets'],
                  ['/open-source', 'Open Source'],
                  ['/partners', 'Partners'],
                  ['/publications', 'Publications'],
                  ['/faq', 'FAQ'],
                  ['/contact', 'Contact'],
                  ['/terms-of-service', 'Terms of Service'],
                  ['/privacy-policy', 'Privacy Policy'],
                ].map(([to, label]) => (
                  <li key={to} role="none">
                    <Link role="menuitem" to={to} onClick={close}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>

            <li className={openMenu === 'app' ? 'open' : ''}>
              <button
                type="button"
                className="nav-trigger"
                aria-expanded={openMenu === 'app'}
                aria-haspopup="true"
                onClick={() => toggleMenu('app')}
              >
                My SpecScape
              </button>
              <ul
                className={`nav-menu${openMenu === 'app' ? ' open' : ''}`}
                role="menu"
              >
                {!loading && !authenticated && (
                  <li role="none">
                    <Link role="menuitem" to="/login" onClick={close}>
                      Login
                    </Link>
                  </li>
                )}
                <li role="none">
                  <Link role="menuitem" to="/sensors" onClick={close}>
                    Sensors
                  </Link>
                </li>
                <li role="none">
                  <Link role="menuitem" to="/spectrum-decoder" onClick={close}>
                    Spectrum Decoder
                  </Link>
                </li>
                <li role="none">
                  <Link role="menuitem" to="/specmon" onClick={close}>
                    Spectrum Monitor
                  </Link>
                </li>
                <li role="none">
                  <Link role="menuitem" to="/iq-datasets" onClick={close}>
                    I/Q Data Sets
                  </Link>
                </li>
                <li role="none">
                  <Link role="menuitem" to="/occupancy" onClick={close}>
                    Channel Occupancy
                  </Link>
                </li>
                <li role="none">
                  <Link role="menuitem" to="/ranking" onClick={close}>
                    Sensor Ranking
                  </Link>
                </li>
                {isAdmin && (
                  <>
                    <li className="divider" aria-hidden />
                    <li role="none">
                      <Link
                        role="menuitem"
                        to="/campaign-management"
                        onClick={close}
                      >
                        Campaign Management
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        role="menuitem"
                        to="/sensor-application-list"
                        onClick={close}
                      >
                        Sponsoring Requests
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        role="menuitem"
                        to="/sensor-application-statistics"
                        onClick={close}
                      >
                        Sponsoring Statistics
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        role="menuitem"
                        to="/spectrum-decoder-status"
                        onClick={close}
                      >
                        Signaling Status
                      </Link>
                    </li>
                  </>
                )}
                {!loading && authenticated && (
                  <>
                    <li className="divider" aria-hidden />
                    <li role="none">
                      <Link role="menuitem" to="/account/edit" onClick={close}>
                        Edit Profile
                      </Link>
                    </li>
                    <li role="none">
                      <Link role="menuitem" to="/sensor-token" onClick={close}>
                        Registration Token
                      </Link>
                    </li>
                    <li role="none">
                      <Link role="menuitem" to="/logout" onClick={close}>
                        Logout
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
