import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

/** Tab strip shared by Campaign management and Experiment scheduling. */
export function ScheduleTabs() {
  const { isAdmin } = useAuth()
  return (
    <ul className="nav nav-tabs xs-tabs" role="tablist" style={{ marginBottom: 20 }}>
      {isAdmin && (
        <li role="presentation">
          <NavLink to="/campaign-management" className={({ isActive }) => (isActive ? 'xs-tab-active' : undefined)}>
            Campaigns
          </NavLink>
        </li>
      )}
      <li role="presentation">
        <NavLink to="/experiment-scheduling" className={({ isActive }) => (isActive ? 'xs-tab-active' : undefined)}>
          Experiment scheduling
        </NavLink>
      </li>
    </ul>
  )
}
