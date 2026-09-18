import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'
import { Recaptcha, resetRecaptcha } from '../components/Recaptcha'

type RecoverTab = 'password' | 'username' | 'activation'

export default function RecoverPage() {
  const { uid, token } = useParams<{ uid?: string; token?: string }>()
  const hasResetParams = Boolean(uid && token)

  const [tab, setTab] = useState<RecoverTab>('password')
  const [mail, setMail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onReset(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await api.resetPassword(uid!, token!, password)
      setSuccess('Password updated. You can sign in.')
    } catch {
      setError('Could not reset password. The link may be invalid.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onRequest(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!captcha) {
      setError('Please complete the captcha.')
      return
    }
    setSubmitting(true)
    try {
      if (tab === 'password') {
        await api.requestPassword(mail, captcha)
        setSuccess('If that email is registered, a reset link was sent.')
      } else if (tab === 'username') {
        await api.requestUsername(mail, captcha)
        setSuccess('If that email is registered, your username was sent.')
      } else {
        await api.resendActivation(mail, captcha)
        setSuccess('If that email needs activation, a new link was sent.')
      }
      resetRecaptcha()
      setCaptcha(null)
    } catch {
      setError('Request failed. Please try again.')
      resetRecaptcha()
      setCaptcha(null)
    } finally {
      setSubmitting(false)
    }
  }

  if (hasResetParams) {
    return (
      <div className="page">
        <PageHeader title="Reset password" lead="Choose a new password for your account." />
        {error ? <div className="error-banner">{error}</div> : null}
        {success ? <div className="success-banner">{success}</div> : null}
        <form className="stack form-grid" onSubmit={onReset}>
          <div className="field">
            <label className="label" htmlFor="reset-password">
              New password
            </label>
            <input
              id="reset-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="reset-confirm">
              Confirm password
            </label>
            <input
              id="reset-confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Update password'}
          </button>
        </form>
        {success ? (
          <p>
            <Link className="btn btn-ghost" to="/login">
              Sign in
            </Link>
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="Account recovery"
        lead="Reset your password, recover your username, or resend activation."
      />
      <div className="stack" role="tablist">
        {(
          [
            ['password', 'Forgot password'],
            ['username', 'Forgot username'],
            ['activation', 'Resend activation'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'btn btn-primary' : 'btn btn-ghost'}
            onClick={() => {
              setTab(id)
              setError(null)
              setSuccess(null)
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      {success ? <div className="success-banner">{success}</div> : null}
      <form className="stack form-grid" onSubmit={onRequest}>
        <div className="field">
          <label className="label" htmlFor="recover-mail">
            Email
          </label>
          <input
            id="recover-mail"
            className="input"
            type="email"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            required
          />
        </div>
        <Recaptcha onChange={setCaptcha} />
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Submit'}
        </button>
      </form>
      <p className="muted">
        <Link to="/login">Back to sign in</Link>
      </p>
    </div>
  )
}
