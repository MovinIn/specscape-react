import { Outlet, useLocation } from 'react-router-dom'
import { CookieBanner } from '../components/CookieBanner'
import { DocumentTitle } from '../components/DocumentTitle'
import { MockBanner } from '../components/MockBanner'
import { ScrollToTop } from '../components/ScrollToTop'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

export function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="app-shell">
      <ScrollToTop />
      <DocumentTitle />
      <Navbar key={pathname} />
      <MockBanner />
      <main className="site-main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <CookieBanner />
    </div>
  )
}
