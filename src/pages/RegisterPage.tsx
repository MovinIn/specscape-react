import { useEffect, useState, type FormEvent } from 'react'
import { useMatch } from 'react-router-dom'
import { api } from '../api/client'
import { Recaptcha, resetRecaptcha } from '../components/Recaptcha'
import { useNotify } from '../components/Notifier'

type UserField =
  | 'fullName'
  | 'uid'
  | 'mail'
  | 'confirmMail'
  | 'userPassword'
  | 'confirmPassword'
  | 'organization'
  | 'postalAddress'
  | 'city'
  | 'country'
  | 'telephoneNumber'
  | 'editModePassword'

/**
 * Like $scope.user: starts empty (register) or is the /user/profile response
 * as-is (edit), so updateProfile sends back exactly what the server gave.
 */
type UserState = Partial<Record<UserField, string | null>> & Record<string, unknown>

/** Server messages come back as a JSON array of strings, e.g. ["Profile changed"]. */
function messages(data: unknown): string[] {
  return Array.isArray(data) ? data.map(String) : []
}

/** Exact port of register.html / register.js (EsRegisterController). */
export default function RegisterPage() {
  const editMode = Boolean(useMatch('/account/edit'))
  const notifier = useNotify()

  const [passwordTabActive, setPasswordTabActive] = useState(false)
  const [beforeEditMail, setBeforeEditMail] = useState('')
  const [tos, setTos] = useState(false)

  const [user, setUser] = useState<UserState>({})
  const [pw, setPw] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirmed: '',
  })

  const [captcha, setCaptcha] = useState<string | null>(null)
  const [widgetKey, setWidgetKey] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!editMode) return
    let cancelled = false
    ;(async () => {
      try {
        const account = (await api.getAccount()) as UserState | undefined
        if (cancelled || !account) return
        setUser(account)
        setBeforeEditMail(account.mail ?? '')
      } catch (err) {
        console.error(err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [editMode])

  function update(key: UserField, value: string) {
    setUser((u) => ({ ...u, [key]: value }))
  }

  /** ng-model display value: missing/null fields render empty. */
  function field(key: UserField): string {
    return user[key] ?? ''
  }

  async function passwordChangeSubmit(e: FormEvent) {
    e.preventDefault()
    if (pw.newPassword !== pw.newPasswordConfirmed) {
      // legacy notifier.error(msg) replaces whatever was shown before
      notifier.reset()
      notifier.show("The new passwords don't match!", 'error')
      return
    }
    setLoading(true)
    try {
      const msgs = messages(await api.updatePassword(pw))
      notifier.reset()
      if (msgs.length) {
        msgs.forEach((msg) => notifier.show(msg, 'info'))
      } else {
        notifier.show('Password updated', 'info')
      }
    } catch (err) {
      notifier.reset()
      // legacy: notifier.error(err.data) -> one entry holding the server message(s)
      const data = (err as { data?: unknown } | null)?.data
      if (data) {
        const text = Array.isArray(data)
          ? data.map(String).join(', ')
          : typeof data === 'object' && 'message' in data
            ? String((data as { message?: unknown }).message)
            : String(data)
        notifier.show(text, 'error')
      } else {
        notifier.show('Error, please try again later!', 'error')
      }
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
        const msgs = messages(
          await api.updateAccount({
            currentPassword: user.editModePassword ?? '',
            newDetails: user,
          }),
        )
        notifier.reset()
        if (msgs.length) {
          msgs.forEach((msg) => notifier.show(msg, 'info'))
        } else {
          notifier.show('Your account was updated!', 'info')
        }
      } catch (err) {
        notifier.reset()
        // legacy notifier.error(msg) clears the previous entry, so only the last message stays
        const msgs = messages((err as { data?: unknown } | null)?.data)
        notifier.show(
          msgs.length
            ? msgs[msgs.length - 1]
            : 'There was a problem updating your account! Please try again later.',
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
                  <a href="#" onClick={(e) => e.preventDefault()}>Update Profile Data</a>
                </li>
                <li
                  role="presentation"
                  className={passwordTabActive ? 'active' : ''}
                  onClick={() => setPasswordTabActive(true)}
                >
                  <a href="#" onClick={(e) => e.preventDefault()}>Change Password</a>
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
                      value={field('fullName')}
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
                      value={field('uid')}
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
                      value={field('mail')}
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
                        value={field('confirmMail')}
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
                          value={field('userPassword')}
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
                          value={field('confirmPassword')}
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
                      value={field('organization')}
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
                      value={field('postalAddress')}
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
                      value={field('city')}
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
                      value={field('country')}
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
                      value={field('telephoneNumber')}
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
                        value={field('editModePassword')}
                        onChange={(e) => update('editModePassword', e.target.value)}
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
