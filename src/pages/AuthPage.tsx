import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function AuthPage() {
  const { authenticated, login, logout } = useAuth()
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

  if (authenticated) {
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
              <h2>Please sign in to use this feature</h2>
            </div>
          )}

          <div className="well">
            <h2>Sign In</h2>
            <form role="form" className="form" onSubmit={handleLogin}>
              <div className="form-group">
                <input
                  type="text"
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
