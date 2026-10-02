import { NavLink, Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { researchTools } from '../config/navigation'

const resources = [
  ['/api-spec', 'API documentation'],
  ['/datasets', 'Public datasets'],
  ['/open-source', 'Open source'],
  ['/publications', 'Publications'],
  ['/hardware', 'Compatible hardware'],
]
const aboutLinks = [
  ['/faq', 'Help & FAQ'],
  ['/contact', 'Contact'],
  ['/partners', 'Partners'],
  ['/terms-of-service', 'Terms of service'],
  ['/privacy-policy', 'Privacy policy'],
]
const adminLinks = [
  ['/campaign-management', 'Campaign management'],
  ['/sensor-application-list', 'Sponsoring requests'],
  ['/sensor-application-statistics', 'Sponsoring statistics'],
  ['/spectrum-decoder-status', 'Signaling status'],
]

export function Navbar() {
  const { authenticated, isAdmin, user } = useAuth()
  const [menu, setMenu] = useState<string | null>(null)
  const [mobile, setMobile] = useState(false)
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const outside = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(null) }
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(null); setMobile(false) } }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape) }
  }, [])
  function dropdown(id: string, label: string, links: string[][]) {
    return <div className="nav-menu">
      <button className="nav-menu-toggle" aria-expanded={menu === id} aria-controls={`${id}-menu`} onClick={() => setMenu(menu === id ? null : id)}>{label} <i className="fa-solid fa-chevron-down" aria-hidden="true" /></button>
      {menu === id && <div className="nav-menu-panel" id={`${id}-menu`}>
        {links.map(([to, text]) => <Link key={to} to={to}>{text}</Link>)}
      </div>}
    </div>
  }
  return <header className="workspace-header" ref={ref}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <div className="header-inner">
      <Link to="/" className="brand" aria-label="SpecScape home"><img className="brand-mark" src="/images/specscape-globe-logo-cropped.png" alt="" width={44} height={44} /><span>Spec<span className="brand-accent">Scape</span></span></Link>
      <button className="mobile-nav-toggle" aria-label="Toggle navigation" aria-expanded={mobile} aria-controls="workspace-navigation" onClick={() => setMobile(!mobile)}><i className="fa-solid fa-bars" aria-hidden="true" /></button>
      <div className={`header-actions${mobile ? ' mobile-open' : ''}`}>
        {dropdown('resources', 'Resources', resources)}
        {dropdown('about', 'About', aboutLinks)}
        {isAdmin && dropdown('admin', 'Administration', adminLinks)}
        {dropdown('personal', authenticated ? user?.username ?? 'My account' : 'Personal', [
          ['/sensors', 'My sensors'], ['/contribute', 'My contributions'], ['/join', 'Host a sensor'], ['/sensor-setup', 'Sensor setup'], ['/sensor-token', 'Registration token'],
          ...(authenticated ? [['/account/edit', 'Account settings'], ['/logout', 'Sign out']] : [['/account/register', 'Create account']]),
        ])}
        {!authenticated && <Link to="/login" className="btn btn-primary sign-in">Sign in <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>}
      </div>
    </div>
    <nav id="workspace-navigation" aria-label="Research tools" className={`tool-nav${mobile ? ' mobile-open' : ''}`}>
      <div className="tool-nav-inner"><NavLink to="/" end><i className="fa-solid fa-border-all" aria-hidden="true" /> Overview</NavLink>
        {researchTools.map(tool => <NavLink key={tool.to} to={tool.to}><i className={`fa-solid fa-${tool.icon}`} aria-hidden="true" />{tool.title}</NavLink>)}
      </div>
    </nav>
  </header>
}
