import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { CommandPalette } from '../components/CommandPalette'
import { getPageInfo } from '../config/pages'
import {
  adminLinks,
  isPreview,
  isLocalAdmin,
  moreLinks,
  researchTools,
  resourceLinks,
} from '../config/navigation'

export function Brand() {
  return (
    <Link to="/" className="lx-brand" aria-label="SpecScape home">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m16 2 12.1 7v14L16 30 3.9 23V9L16 2Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M7 16h4l2-6 4 12 2-6h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        SpecScape<span className="lx-brand-point">.</span>
      </span>
    </Link>
  )
}

export function Navbar() {
  const { authenticated, isAdmin, user, backendAuthenticated } = useAuth()
  const { pathname, search } = useLocation()
  const [mobile, setMobile] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [area, setArea] = useState<'research' | 'admin'>(
    adminLinks.some(([path]) => path === pathname) ||
      pathname.startsWith('/sensor-application/')
      ? 'admin'
      : 'research',
  )
  const toggleRef = useRef<HTMLButtonElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const map =
    pathname === '/specmon' && new URLSearchParams(search).get('view') === 'map'
  const close = () => setMobile(false)

  useEffect(() => {
    if (!mobile) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const navigation = navRef.current
    navigation?.querySelector<HTMLElement>('a')?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const targets = [
        ...(navigation?.querySelectorAll<HTMLElement>('a, summary') ?? []),
      ].filter((el) => el.getClientRects().length)
      if (toggleRef.current) targets.push(toggleRef.current)
      if (event.shiftKey && document.activeElement === targets[0]) {
        event.preventDefault()
        targets.at(-1)?.focus()
      } else if (!event.shiftKey && document.activeElement === targets.at(-1)) {
        event.preventDefault()
        targets[0]?.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', trap)
    }
  }, [mobile])

  useEffect(() => {
    function escape(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
      if (e.key === 'Escape') {
        setMobile(false)
        navRef.current
          ?.querySelectorAll('details[open]')
          .forEach((el) => el.removeAttribute('open'))
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [])

  const active = (to: string) =>
    to.includes('?')
      ? map
      : to === '/specmon'
        ? pathname === to && !map
        : to === '/sensors'
          ? pathname.startsWith(to)
          : pathname === to
  const section =
    pathname === '/'
      ? 'Overview'
      : map
        ? 'Spatial view'
        : (getPageInfo(pathname)?.title ??
          researchTools.find((t) => active(t.to))?.title ??
          [...resourceLinks, ...moreLinks, ...adminLinks].find(
            (l) => l[0] === pathname,
          )?.[1] ??
          'Your workspace')

  return (
    <>
      <a className="lx-skip" href="#main-content">
        Skip to content
      </a>
      <aside
        ref={navRef}
        className={`lx-sidebar${mobile ? ' is-open' : ''}`}
        id="workspace-navigation"
        aria-label="Workspace navigation"
      >
        <div className="lx-sidebar-brand">
          <Brand />
          <span className="lx-edition">SPECTRUM RESEARCH</span>
        </div>
        {isAdmin && (
          <div
            className="lx-area-switch"
            role="group"
            aria-label="Workspace area"
          >
            <button
              type="button"
              aria-pressed={area === 'research'}
              onClick={() => setArea('research')}
            >
              Research
            </button>
            <button
              type="button"
              aria-pressed={area === 'admin'}
              onClick={() => setArea('admin')}
            >
              Administration
            </button>
          </div>
        )}
        <div className="lx-sidebar-scroll">
          <nav aria-label={area === 'admin' ? 'Administration' : 'Research'}>
            <Link
              to="/"
              onClick={close}
              className={`lx-nav-link${pathname === '/' ? ' is-active' : ''}`}
              aria-current={pathname === '/' ? 'page' : undefined}
            >
              <i className="fa-solid fa-border-all" aria-hidden="true" />{' '}
              Overview
            </Link>
            <p className="lx-nav-label">WORKSPACE</p>
            {area === 'research' &&
              researchTools.map((tool) => (
                <Link
                  key={tool.to}
                  to={tool.to}
                  onClick={close}
                  className={`lx-nav-link${active(tool.to) ? ' is-active' : ''}`}
                  aria-current={active(tool.to) ? 'page' : undefined}
                >
                  <i
                    className={`fa-solid fa-${tool.icon}`}
                    aria-hidden="true"
                  />
                  <span>{tool.title}</span>
                  {'badge' in tool && <small>{tool.badge}</small>}
                </Link>
              ))}
            {area === 'admin' &&
              adminLinks.map(([to, title, icon]) => (
                <Link
                  key={to}
                  to={to}
                  onClick={close}
                  className={`lx-nav-link${pathname === to ? ' is-active' : ''}`}
                  aria-current={pathname === to ? 'page' : undefined}
                >
                  <i className={`fa-solid fa-${icon}`} aria-hidden="true" />
                  {title}
                </Link>
              ))}
          </nav>
          <nav aria-label="Resources" className="lx-resource-nav">
            <p className="lx-nav-label">RESOURCES</p>
            {resourceLinks.map(([to, title, icon]) => (
              <Link
                key={to}
                to={to}
                onClick={close}
                className={`lx-nav-link${pathname === to ? ' is-active' : ''}`}
              >
                <i className={`fa-solid fa-${icon}`} aria-hidden="true" />
                {title}
              </Link>
            ))}
            <details className="lx-nav-details">
              <summary>
                <i className="fa-solid fa-ellipsis" aria-hidden="true" /> More
                resources <span>+</span>
              </summary>
              <div>
                {moreLinks.map(([to, title]) => (
                  <Link key={to} to={to} onClick={close}>
                    {title}
                  </Link>
                ))}
              </div>
            </details>
          </nav>
        </div>
        <div className="lx-sidebar-bottom">
          <Link to="/join" className="lx-contribute" onClick={close}>
            <i className="fa-solid fa-tower-broadcast" aria-hidden="true" />
            <span>
              Grow the network<small>Host a sensor</small>
            </span>
            <span aria-hidden="true">↗</span>
          </Link>
          <details className="lx-account lx-nav-details">
            <summary>
              <span className="lx-avatar">
                {authenticated
                  ? (user?.username?.[0] ?? 'R').toUpperCase()
                  : 'S'}
              </span>
              <span>
                {authenticated ? user?.username : 'Your account'}
                <small>
                  {isLocalAdmin
                    ? isPreview
                      ? 'Sample data · Administrator'
                      : 'Local administrator'
                    : authenticated
                      ? 'Research workspace'
                      : 'Sign in to get started'}
                </small>
              </span>
              <span>⌃</span>
            </summary>
            <div>
              {backendAuthenticated ? (
                <>
                  <Link to="/account/edit" onClick={close}>
                    Account settings
                  </Link>
                  <Link to="/logout" onClick={close}>
                    Sign out
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={close}>
                    Backend connection
                  </Link>
                  <Link to="/account/register" onClick={close}>
                    Create account
                  </Link>
                </>
              )}
            </div>
          </details>
        </div>
      </aside>
      {mobile && (
        <button
          type="button"
          className="lx-nav-backdrop"
          aria-label="Dismiss navigation"
          onClick={close}
        />
      )}
      <header className="lx-topbar">
        <button
          ref={toggleRef}
          className="lx-menu-toggle"
          type="button"
          aria-label={mobile ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobile}
          aria-controls="workspace-navigation"
          onClick={() => setMobile(!mobile)}
        >
          <i
            className={`fa-solid fa-${mobile ? 'xmark' : 'bars'}`}
            aria-hidden="true"
          />
        </button>
        <div className="lx-breadcrumb">
          <span>Workspace</span>
          <span aria-hidden="true">/</span>
          <strong>{section}</strong>
        </div>
        <div className="lx-topbar-actions">
          <button
            type="button"
            className="lx-command-trigger"
            aria-label="Search pages and tools"
            onClick={() => setSearchOpen(true)}
          >
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <span>Jump to…</span>
            <kbd>⌘ K</kbd>
          </button>
          <span className="lx-preview-tag">
            <span />
            {isPreview
              ? 'Sample data · offline demo'
              : backendAuthenticated
                ? 'Live API · connected'
                : 'Live API · public access'}
          </span>
          <Link to="/api-spec" className="lx-topbar-docs">
            Documentation <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>
      {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} />}
    </>
  )
}
