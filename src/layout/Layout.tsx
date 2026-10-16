import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { CookieBanner } from '../components/CookieBanner'
import { DocumentTitle } from '../components/DocumentTitle'
import { ScrollToTop } from '../components/ScrollToTop'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { getPageInfo } from '../config/pages'
import { useAuth } from '../auth/AuthContext'
import { BackendAccess } from '../components/BackendAccess'
import { isPreview } from '../config/runtime'

export function Layout() {
  const { pathname, search } = useLocation()
  const info = getPageInfo(pathname)
  const { backendAuthenticated } = useAuth()
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])
  return (
    <div className="app-shell lx-shell">
      <ScrollToTop />
      <DocumentTitle />
      <Navbar key={`${pathname}${search}`} />
      <main
        ref={mainRef}
        className="site-main lx-main"
        id="main-content"
        tabIndex={-1}
      >
        <div
          key={pathname}
          className={`lx-route-view${info ? ' lx-document-page' : ''}`}
        >
          {info && (
            <div className="lx-page-kicker">
              <span />
              {info.group}
            </div>
          )}
          <div className={info ? 'lx-page-content' : undefined}>
            {!isPreview &&
              !backendAuthenticated &&
              ['/specmon', '/spectrum-decoder', '/sensors/manage'].includes(
                pathname,
              ) && <BackendAccess />}
            <Outlet />
          </div>
        </div>
      </main>
      <Footer />
      <CookieBanner />
    </div>
  )
}
