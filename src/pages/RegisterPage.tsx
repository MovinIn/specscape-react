import { useEffect, useState, type FormEvent } from 'react'
import { Link, useMatch, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'
import { Recaptcha, resetRecaptcha } from '../components/Recaptcha'
import { useNotify } from '../components/Notifier'

type FormState = {
  uid: string
  mail: string
  confirmMail: string
  fullName: string
  userPassword: string
  confirmPassword: string
  currentPassword: string
}

const empty: FormState = {
  uid: '',
  mail: '',
  confirmMail: '',
  fullName: '',
  userPassword: '',
  confirmPassword: '',
  currentPassword: '',
}

export default function RegisterPage() {
  const editMatch = useMatch('/account/edit')
  const isEdit = Boolean(editMatch)
  const navigate = useNavigate()
  const { show } = useNotify()

  const [form, setForm] = useState<FormState>(empty)
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    ;(async () => {
      try {
        const account = (await api.getAccount()) as {
          uid?: string
          mail?: string
          fullName?: string
          username?: string
        }
        if (cancelled) return
        setForm((f) => ({
          ...f,
          uid: account?.uid ?? account?.username ?? '',
          mail: account?.mail ?? '',
          confirmMail: account?.mail ?? '',
          fullName: account?.fullName ?? '',
        }))
      } catch {
        if (!cancelled) setError('Could not load account profile.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isEdit])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!isEdit) {
      if (form.mail !== form.confirmMail) {
        setError('Email addresses do not match.')
        return
      }
      if (form.userPassword !== form.confirmPassword) {
        setError('Passwords do not match.')
        return
      }
      if (!captcha) {
        setError('Please complete the captcha.')
        return
      }
    }

    setSubmitting(true)
    try {
      if (isEdit) {
        await api.updateAccount({
          currentPassword: form.currentPassword,
          newDetails: {
            uid: form.uid,
            mail: form.mail,
            fullName: form.fullName,
          },
        })
        setSuccess('Your account was updated.')
        show('Profile updated', 'success')
      } else {
        await api.registerAccount({
          user: {
            uid: form.uid,
            mail: form.mail,
            confirmMail: form.confirmMail,
            fullName: form.fullName,
            userPassword: form.userPassword,
            confirmPassword: form.confirmPassword,
          },
          'g-recaptcha-response': captcha ?? undefined,
        })
        const msg =
          'Account created. Activate via the email we sent before signing in.'
        setSuccess(msg)
        show(msg, 'success')
        resetRecaptcha()
        window.setTimeout(() => navigate('/login', { replace: true }), 2500)
      }
    } catch (err) {
      resetRecaptcha()
      setCaptcha(null)
      const data = (err as { data?: unknown })?.data
      const message = Array.isArray(data)
        ? data.join(' ')
        : typeof data === 'string'
          ? data
          : isEdit
            ? 'Could not update profile.'
            : 'Registration failed.'
      setError(message)
      show(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <PageHeader title="Edit profile" />
        <p className="muted">Loading account…</p>
      </div>
    )
  }

  return (
    <div className="page page-narrow">
      <PageHeader
        title={isEdit ? 'Edit profile' : 'Create account'}
        lead={
          isEdit
            ? 'Update your SpecScape account details.'
            : 'Register to manage sensors and spectrum data.'
        }
      />
      {error ? <div className="error-banner">{error}</div> : null}
      {success ? <div className="success-banner">{success}</div> : null}
      <form className="stack form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label className="label" htmlFor="reg-uid">
            Username
          </label>
          <input
            id="reg-uid"
            className="input"
            value={form.uid}
            onChange={(e) => update('uid', e.target.value)}
            required
            disabled={isEdit}
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="reg-fullname">
            Full name
          </label>
          <input
            id="reg-fullname"
            className="input"
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="reg-mail">
            Email
          </label>
          <input
            id="reg-mail"
            className="input"
            type="email"
            value={form.mail}
            onChange={(e) => update('mail', e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        {!isEdit ? (
          <div className="field">
            <label className="label" htmlFor="reg-confirm-mail">
              Confirm email
            </label>
            <input
              id="reg-confirm-mail"
              className="input"
              type="email"
              value={form.confirmMail}
              onChange={(e) => update('confirmMail', e.target.value)}
              required
            />
          </div>
        ) : null}
        {isEdit ? (
          <div className="field">
            <label className="label" htmlFor="reg-current-password">
              Current password
            </label>
            <input
              id="reg-current-password"
              className="input"
              type="password"
              value={form.currentPassword}
              onChange={(e) => update('currentPassword', e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        ) : (
          <>
            <div className="field">
              <label className="label" htmlFor="reg-password">
                Password
              </label>
              <input
                id="reg-password"
                className="input"
                type="password"
                value={form.userPassword}
                onChange={(e) => update('userPassword', e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="reg-confirm">
                Confirm password
              </label>
              <input
                id="reg-confirm"
                className="input"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <Recaptcha onChange={setCaptcha} />
          </>
        )}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save profile' : 'Register'}
        </button>
      </form>
      {!isEdit ? (
        <p className="muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      ) : null}
    </div>
  )
}
