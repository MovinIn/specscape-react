import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { isLocalAdmin, isPreview } from '../config/runtime'
import { getPageInfo } from '../config/pages'

export function BackendAccess({
  block = false,
  admin = false,
}: {
  block?: boolean
  admin?: boolean
}) {
  const { backendAuthenticated, checkingSession } = useAuth()
  const location = useLocation()
  if (isPreview) return null
  const title = getPageInfo(location.pathname)?.title ?? 'Live measurements'
  return (
    <section
      className={block ? 'lx-backend-access is-block' : 'lx-backend-access'}
      role="status"
    >
      {block && <h1>{title}</h1>}
      <div>
        <i className="fa-solid fa-satellite-dish" aria-hidden="true" />
        <strong>
          {checkingSession
            ? 'Checking backend access…'
            : admin && backendAuthenticated
              ? 'Server administrator access required'
              : 'Live API · Backend access required'}
        </strong>
      </div>
      <p>
        {admin && backendAuthenticated
          ? 'This server account does not have administrator permission. The local workspace role cannot grant server permissions.'
          : 'The public sensor network uses real data. Spectrum measurements and decoder streams are protected by the SpecScape server. No sample signal is substituted when access is unavailable.'}
      </p>
      {!checkingSession && (
        <Link to="/login" state={{ from: location.pathname + location.search }}>
          Connection details <span aria-hidden="true">↗</span>
        </Link>
      )}
      {isLocalAdmin && (
        <small>
          Local administrator workspace · real server permissions apply to data
          and operations.
        </small>
      )}
    </section>
  )
}
