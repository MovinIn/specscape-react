import { Outlet } from 'react-router-dom'
import { CookieBanner } from '../components/CookieBanner'
import { DocumentTitle } from '../components/DocumentTitle'
import { MockBanner } from '../components/MockBanner'
import { ScrollToTop } from '../components/ScrollToTop'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

export function Layout() {
  return (
    <div className="app-shell">
      <ScrollToTop />
      <DocumentTitle />
      <Navbar />
      <MockBanner />
      <main className="site-main">
        <Outlet />
      </main>
      <Footer />
      <CookieBanner />
    </div>
  )
}
