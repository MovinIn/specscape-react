import { useEffect, useState, type FormEvent } from 'react'
import { useMatch } from 'react-router-dom'
import { api } from '../api/client'
import { Recaptcha, resetRecaptcha } from '../components/Recaptcha'
import { useNotify } from '../components/Notifier'

type UserForm = {
  fullName: string
  uid: string
  mail: string
  confirmMail: string
  userPassword: string
  confirmPassword: string
  organization: string
  postalAddress: string
  city: string
  country: string
  telephoneNumber: string
}

const emptyUser: UserForm = {
  fullName: '',
  uid: '',
  mail: '',
  confirmMail: '',
  userPassword: '',
  confirmPassword: '',
  organization: '',
  postalAddress: '',
  city: '',
  country: '',
  telephoneNumber: '',
}

/** Exact port of register.html / register.js (EsRegisterController). */
export default function RegisterPage() {
  const editMatch = useMatch('/account/edit')
  const notifier = useNotify()

  const [editMode, setEditMode] = useState(false)
  const [passwordTabActive, setPasswordTabActive] = useState(false)
  const [beforeEditMail, setBeforeEditMail] = useState('')
  const [tos, setTos] = useState(false)
  const [editModePassword, setEditModePassword] = useState('')

  const [user, setUser] = useState<UserForm>(emptyUser)
  const [pw, setPw] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirmed: '',
  })

  const [captcha, setCaptcha] = useState<string | null>(null)
  const [widgetKey, setWidgetKey] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const isEdit = Boolean(editMatch)
    setEditMode(isEdit)
    if (!isEdit) return
    let cancelled = false
    ;(async () => {
      try {
        const account = (await api.getAccount()) as Partial<UserForm> & {
          mail?: string
        }
        if (cancelled) return
        setUser((u) => ({ ...u, ...account, confirmMail: account.mail ?? '' }))
        setBeforeEditMail(account.mail ?? '')
      } catch (err) {
        console.error(err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [editMatch])

  function update<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setUser((u) => ({ ...u, [key]: value }))
  }

  async function passwordChangeSubmit(e: FormEvent) {
    e.preventDefault()
    if (pw.newPassword !== pw.newPasswordConfirmed) {
      notifier.show("The new passwords don't match!", 'error')
      return
    }
    setLoading(true)
    try {
      const resp = (await api.updatePassword(pw)) as unknown as
        | { data?: string[] }
        | undefined
      notifier.reset()
      if (resp?.data?.length) {
        resp.data.forEach((msg) => notifier.show(msg, 'info'))
      } else {
        notifier.show('Password updated', 'info')
      }
    } catch (err) {
      notifier.reset()
      notifier.onPromiseRejected(err)
    } finally {
      setLoading(false)
    }
  }

  async function registerSubmit(e: FormEvent) {
    e.preventDefault()
    if (editMode) {
      notifier.reset()
      let valid = true
      if (user.mail !== beforeEditMail && user.mail !== user.confirmMail) {
        notifier.show('Mail addresses do not match!', 'error')
        valid = false
      }
      if (!valid) return

      setLoading(true)
      try {
        const resp = (await api.updateAccount({
          currentPassword: editModePassword,
          newDetails: user,
        })) as unknown as { status?: number; data?: string[] }
        notifier.reset()
        if (resp?.status === 200) {
          if (resp.data?.length) {
            resp.data.forEach((msg) => notifier.show(msg, 'info'))
          } else {
            notifier.show('Your account was updated!', 'info')
          }
        } else if (resp?.data?.length) {
          resp.data.forEach((msg) => notifier.show(msg, 'error'))
        } else {
          notifier.show(
            'There was a problem updating your account! Please try again later.',
            'error',
          )
        }
      } catch {
        notifier.reset()
        notifier.show(
          'There was a problem updating your account! Please try again later.',
          'error',
        )
      } finally {
        setLoading(false)
      }
    } else {
      notifier.reset()
      let valid = true
      if (user.mail !== user.confirmMail) {
        notifier.show('Mail addresses do not match!', 'error')
        valid = false
      }
      if (user.userPassword !== user.confirmPassword) {
        notifier.show('Passwords do not match!', 'error')
        valid = false
      }
      if (!captcha) {
        notifier.show('Please solve the captcha!', 'warn')
        valid = false
      }
      if (!valid) return

      setLoading(true)
      try {
        await api.registerAccount({
          user,
          'g-recaptcha-response': captcha ?? undefined,
        })
        notifier.reset()
        notifier.show(
          'Account successfully created. Before you can log in, you need to activate your ' +
            'account using the link in the mail we just sent you. If you cannot find your activation mail,' +
            ' please check your spam folder.',
          'info',
        )
        resetRecaptcha()
        setWidgetKey((k) => k + 1)
        setCaptcha(null)
      } catch (err) {
        notifier.reset()
        notifier.onPromiseRejected(err)
        resetRecaptcha()
        setWidgetKey((k) => k + 1)
        setCaptcha(null)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-12">
          <div className="page-header">
            {!editMode ? <h2>Create a SpecScape Account</h2> : <h2>Edit Profile</h2>}
          </div>

          {editMode ? (
            <div style={{ marginBottom: 20 }}>
              <ul className="nav nav-tabs">
                <li
                  role="presentation"
                  className={!passwordTabActive ? 'active' : ''}
                  onClick={() => setPasswordTabActive(false)}
                >
                  <a href="#">Update Profile Data</a>
                </li>
                <li
                  role="presentation"
                  className={passwordTabActive ? 'active' : ''}
                  onClick={() => setPasswordTabActive(true)}
                >
                  <a href="#">Change Password</a>
                </li>
              </ul>
            </div>
          ) : null}

          {loading ? (
            <div className="text-center">Processing registration...</div>
          ) : null}

          {!loading && !(editMode && passwordTabActive) ? (
            <form className="form-horizontal" onSubmit={registerSubmit}>
              <fieldset>
                <legend>Mandatory Information</legend>

                <div className="form-group">
                  <label className="col-md-4 control-label" htmlFor="full_name">
                    Full Name
                  </label>
                  <div className="col-md-4">
                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      placeholder="full name"
                      className="form-control input-md"
                      required
                      value={user.fullName}
                      onChange={(e) => update('fullName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="col-md-4 control-label" htmlFor="username">
                    Username
                  </label>
                  <div className="col-md-4">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="username"
                      className="form-control input-md"
                      required
                      disabled={editMode}
                      value={user.uid}
                      onChange={(e) => update('uid', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="col-md-4 control-label" htmlFor="email">
                    Email Address
                  </label>
                  <div className="col-md-4">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="email"
                      className="form-control input-md"
                      required
                      value={user.mail}
                      onChange={(e) => update('mail', e.target.value)}
                    />
                  </div>
                </div>

                {!editMode || user.mail !== beforeEditMail ? (
                  <div className="form-group">
                    <label className="col-md-4 control-label" htmlFor="email_confirm">
                      Confirm Email
                    </label>
                    <div className="col-md-4">
                      <input
                        id="email_confirm"
                        name="email_confirm"
                        type="email"
                        placeholder="email"
                        className="form-control input-md"
                        required
                        value={user.confirmMail}
                        onChange={(e) => update('confirmMail', e.target.value)}
                      />
                    </div>
                  </div>
                ) : null}

                {editMode && user.mail !== beforeEditMail ? (
                  <div className="form-group">
                    <div className="col-md-4 col-md-offset-4">
                      <p>
                        After changing your email address a confirmation mail will be
                        sent and you{' '}
                        <span style={{ fontWeight: 'bold' }}>
                          need to re-activate your account
                        </span>{' '}
                        by clicking the link in this email!
                      </p>
                    </div>
                  </div>
                ) : null}

                {!editMode ? (
                  <>
                    <div className="form-group">
                      <label className="col-md-4 control-label" htmlFor="password">
                        Password
                      </label>
                      <div className="col-md-4">
                        <input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="password"
                          className="form-control input-md"
                          required
                          value={user.userPassword}
                          onChange={(e) => update('userPassword', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label
                        className="col-md-4 control-label"
                        htmlFor="password_confirm"
                      >
                        Confirm Password
                      </label>
                      <div className="col-md-4">
                        <input
                          id="password_confirm"
                          name="password_confirm"
                          type="password"
                          placeholder="password"
                          className="form-control input-md"
                          required
                          value={user.confirmPassword}
                          onChange={(e) => update('confirmPassword', e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                ) : null}
              </fieldset>

              <fieldset>
                <legend>Optional Information</legend>
                <p>These might be useful for contacting you in case of technical problems</p>

                <div className="form-group">
                  <label className="col-md-4 control-label" htmlFor="organization">
                    Organization
                  </label>
                  <div className="col-md-4">
                    <input
                      id="organization"
                      name="organization"
                      type="text"
                      placeholder="organization"
                      className="form-control input-md"
                      value={user.organization}
                      onChange={(e) => update('organization', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="col-md-4 control-label" htmlFor="address">
                    Address
                  </label>
                  <div className="col-md-4">
                    <input
                      id="address"
                      name="address"
                      type="text"
                      placeholder="address"
                      className="form-control input-md"
                      value={user.postalAddress}
                      onChange={(e) => update('postalAddress', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="col-md-4 control-label" htmlFor="city">
                    City
                  </label>
                  <div className="col-md-4">
                    <input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="city"
                      className="form-control input-md"
                      value={user.city}
                      onChange={(e) => update('city', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="col-md-4 control-label" htmlFor="country">
                    Country
                  </label>
                  <div className="col-md-4">
                    <input
                      id="country"
                      name="country"
                      type="text"
                      placeholder="country"
                      className="form-control input-md"
                      value={user.country}
                      onChange={(e) => update('country', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="col-md-4 control-label" htmlFor="phone">
                    Phone
                  </label>
                  <div className="col-md-4">
                    <input
                      id="phone"
                      name="phone"
                      type="text"
                      placeholder="+44 (000) 1111"
                      className="form-control input-md"
                      value={user.telephoneNumber}
                      onChange={(e) => update('telephoneNumber', e.target.value)}
                    />
                  </div>
                </div>

                {!editMode ? (
                  <div className="form-group">
                    <label className="col-md-4 control-label" htmlFor="tos">
                      Terms of Service
                    </label>
                    <div className="col-md-4">
                      <label className="checkbox-inline" htmlFor="tos">
                        <input
                          type="checkbox"
                          name="tos"
                          id="tos"
                          value="yes"
                          required
                          checked={tos}
                          onChange={(e) => setTos(e.target.checked)}
                        />
                        By checking this box, I confirm that I have read and I agree to
                        the{' '}
                        <a href="/terms-of-service" target="_blank" rel="noreferrer">
                          Terms of Service
                        </a>
                        .
                      </label>
                    </div>
                  </div>
                ) : null}
              </fieldset>

              {!editMode ? (
                <fieldset>
                  <div className="form-group">
                    <label className="col-md-4 control-label">Captcha</label>
                    <div className="col-md-4">
                      <Recaptcha key={widgetKey} onChange={setCaptcha} hideLabel />
                    </div>
                  </div>
                </fieldset>
              ) : null}

              {editMode ? (
                <fieldset>
                  <legend>Confirm password</legend>
                  <p>Please enter your current password</p>
                  <div className="form-group">
                    <label
                      className="col-md-4 control-label"
                      htmlFor="editModePassword"
                    >
                      Password
                    </label>
                    <div className="col-md-4">
                      <input
                        id="editModePassword"
                        name="password"
                        type="password"
                        placeholder="password"
                        className="form-control input-md"
                        required
                        value={editModePassword}
                        onChange={(e) => setEditModePassword(e.target.value)}
                      />
                    </div>
                  </div>
                </fieldset>
              ) : null}

              {editMode ? (
                <div className="form-group form-actions">
                  <div className="col-sm-offset-4 col-sm-8">
                    <input type="submit" className="btn btn-primary" value="Update" />
                  </div>
                </div>
              ) : (
                <div className="form-group form-actions">
                  <div className="col-sm-offset-4 col-sm-8">
                    <input
                      type="submit"
                      className="btn btn-primary"
                      value="Register"
                    />
                  </div>
                </div>
              )}
            </form>
          ) : null}

          {!loading && editMode && passwordTabActive ? (
            <form className="form-horizontal" onSubmit={passwordChangeSubmit}>
              <fieldset>
                <legend>Change Password</legend>

                <div className="form-group">
                  <label
                    className="col-md-4 control-label"
                    htmlFor="change_password_old"
                  >
                    Current Password
                  </label>
                  <div className="col-md-4">
                    <input
                      id="change_password_old"
                      name="password"
                      type="password"
                      placeholder="current password"
                      className="form-control input-md"
                      required
                      value={pw.currentPassword}
                      onChange={(e) =>
                        setPw((p) => ({ ...p, currentPassword: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="col-md-4 control-label" htmlFor="change_password">
                    New Password
                  </label>
                  <div className="col-md-4">
                    <input
                      id="change_password"
                      name="password"
                      type="password"
                      placeholder="new password"
                      className="form-control input-md"
                      required
                      value={pw.newPassword}
                      onChange={(e) =>
                        setPw((p) => ({ ...p, newPassword: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label
                    className="col-md-4 control-label"
                    htmlFor="change_password_confirm"
                  >
                    Confirm New Password
                  </label>
                  <div className="col-md-4">
                    <input
                      id="change_password_confirm"
                      name="password_confirm"
                      type="password"
                      placeholder="new password"
                      className="form-control input-md"
                      required
                      value={pw.newPasswordConfirmed}
                      onChange={(e) =>
                        setPw((p) => ({ ...p, newPasswordConfirmed: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-group form-actions">
                  <div className="col-sm-offset-4 col-sm-8">
                    <input type="submit" className="btn btn-primary" value="Submit" />
                  </div>
                </div>
              </fieldset>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
