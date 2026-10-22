import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { CookieBanner } from '../components/CookieBanner'
import { DocumentTitle } from '../components/DocumentTitle'
import { MockBanner } from '../components/MockBanner'
import { ScrollToTop } from '../components/ScrollToTop'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { useAuth } from '../auth/AuthContext'

export function Layout() {
  const { pathname } = useLocation()
  const { authenticated } = useAuth()
  return (
    <div className={`app-shell${authenticated ? ' has-sidebar' : ''}`}>
      <ScrollToTop />
      <DocumentTitle />
      <Navbar key={pathname} />
      {authenticated && <Sidebar />}
      <MockBanner />
      <main className="site-main" id="main-content" tabIndex={-1} style={{ marginBottom: authenticated ? 0 : 70 }}>
        {/* Keyed by route so a slow-loading page shows a loader at once while the
            header and sidebar stay in place, instead of the old page lingering. */}
        <Suspense key={pathname} fallback={<div className="route-loading" role="status">Loading…</div>}>
          <Outlet />
        </Suspense>
      </main>
      {!authenticated && <Footer />}
      <CookieBanner />
    </div>
  )
}
