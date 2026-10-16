import { isPreview } from '../config/navigation'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function AuthPage() {
  const { backendAuthenticated, login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    const ok = await login(username, password)
    if (ok) {
      setError(false)
      navigate(from, { replace: true })
    } else {
      setError(true)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/partners')
    setTimeout(() => {
      window.location.assign('/')
    }, 2000)
  }

  if (isPreview)
    return (
      <div className="lx-access-card">
        <div className="lx-access-icon">
          <i className="fa-solid fa-shield-halved" aria-hidden="true" />
        </div>
        <p className="lx-eyebrow">YOUR WORKSPACE IS READY</p>
        <h1>
          Full access.
          <br />
          Zero friction.
        </h1>
        <p>
          You are exploring SpecScape as a local administrator. All research
          tools, sensor settings and administration pages are available.
        </p>
        <div>
          <Link to="/" className="lx-button lx-button-primary">
            Open workspace <span aria-hidden="true">↗</span>
          </Link>
          <Link to="/account/edit" className="lx-text-link">
            Edit profile <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    )

  if (backendAuthenticated) {
    return (
      <div className="container">
        <div className="row">
          <div className="col-sm-6 col-sm-offset-3 text-center">
            <div className="well text-center">
              <h2>Click the button below to securely terminate your session</h2>
            </div>
            <button className="btn btn-warning btn-lg" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-6 col-sm-offset-3">
          {error ? (
            <div className="alert alert-danger">
              <h2>
                <span className="glyphicon glyphicon-warning-sign" />
                &nbsp;Login failed
              </h2>
            </div>
          ) : (
            <div className="alert alert-info text-center">
              <h2>Connect a SpecScape backend account</h2>
            </div>
          )}

          <div className="well">
            <h2>Backend access</h2>
            <p>
              The workspace opens without login. Live spectrum and decoder
              streams require access granted by specscape.org. This form is
              available when the backend owner provides a development account.
            </p>
            <form role="form" className="form" onSubmit={handleLogin}>
              <div className="form-group">
                <input
                  type="text"
                  aria-label="SpecScape username"
                  autoComplete="username"
                  className="form-control"
                  placeholder="Username"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  aria-label="SpecScape password"
                  autoComplete="current-password"
                  className="form-control"
                  placeholder="Password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <button type="submit" className="btn btn-primary">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-sm-6 col-sm-offset-3">
          <div className="list-group" style={{ marginTop: '1em' }}>
            <Link to="/account/register" className="list-group-item">
              No Account, yet? Sign up!
            </Link>
            <Link to="/account/recover" className="list-group-item">
              Problems to log in?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
