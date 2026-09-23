import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Recaptcha, resetRecaptcha } from '../components/Recaptcha'
import { useNotify } from '../components/Notifier'

type Mode = 'forgot_pass' | 'forgot_username' | 'lost_activation'

/** Exact port of recover.html / recover.js (RegRecoverController). */
export default function RecoverPage() {
  const { uid, token } = useParams<{ uid?: string; token?: string }>()
  const noinput = uid == null || token == null

  const notifier = useNotify()

  const [mode, setMode] = useState<Mode>('forgot_pass')
  const [mailInput, setMailInput] = useState('')
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [widgetKey, setWidgetKey] = useState(0)
  const [loading, setLoading] = useState(false)

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  function reloadCaptcha() {
    resetRecaptcha()
    setWidgetKey((k) => k + 1)
    setCaptcha(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (mode === 'forgot_pass') return requestPasswordReset()
    if (mode === 'forgot_username') return requestUsername()
    return requestActivation()
  }

  async function requestPasswordReset() {
    notifier.reset()
    if (!captcha) {
      notifier.show('Please solve the captcha!', 'warn')
      return
    }
    setLoading(true)
    try {
      await api.requestPassword(mailInput, captcha)
      notifier.reset()
      notifier.show('An e-mail with further instructions has been sent.', 'info')
      reloadCaptcha()
    } catch (err) {
      notifier.reset()
      notifier.onPromiseRejected(err)
      reloadCaptcha()
    } finally {
      setLoading(false)
    }
  }

  async function requestUsername() {
    notifier.reset()
    if (!captcha) {
      notifier.show('Please solve the captcha!', 'warn')
      return
    }
    setLoading(true)
    try {
      await api.requestUsername(mailInput, captcha)
      notifier.reset()
      notifier.show('You will receive the username in an e-mail.', 'info')
      reloadCaptcha()
    } catch (err) {
      notifier.reset()
      notifier.onPromiseRejected(err)
      reloadCaptcha()
    } finally {
      setLoading(false)
    }
  }

  async function requestActivation() {
    notifier.reset()
    if (!captcha) {
      notifier.show('Please solve the captcha!', 'warn')
      return
    }
    setLoading(true)
    try {
      await api.resendActivation(mailInput, captcha)
      notifier.reset()
      notifier.show('Activation mail sent.', 'info')
      reloadCaptcha()
    } catch (err) {
      notifier.reset()
      notifier.onPromiseRejected(err)
      reloadCaptcha()
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault()
    notifier.reset()
    if (password !== passwordConfirm) {
      notifier.show('Passwords do not match!', 'error')
      return
    }
    setLoading(true)
    try {
      await api.resetPassword(uid!, token!, password)
      notifier.reset()
      notifier.show('Successfully reset password.', 'info')
    } catch (err) {
      notifier.reset()
      notifier.onPromiseRejected(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-12">
          <div className="page-header">
            <h2>Account Recovery</h2>
          </div>

          {loading ? <div className="text-center">Processing request...</div> : null}

          {noinput && !loading ? (
            <form className="form-horizontal" onSubmit={submit}>
              <div className="form-group">
                <fieldset style={{ marginTop: '1em' }}>
                  <label className="col-md-4 control-label">What&apos;s wrong?</label>
                  <div className="col-md-4">
                    <div>
                      <input
                        type="radio"
                        name="mode"
                        value="forgot_pass"
                        checked={mode === 'forgot_pass'}
                        onChange={() => setMode('forgot_pass')}
                      />{' '}
                      I forgot my password
                    </div>
                    <div>
                      <input
                        type="radio"
                        name="mode"
                        value="forgot_username"
                        checked={mode === 'forgot_username'}
                        onChange={() => setMode('forgot_username')}
                      />{' '}
                      I forgot my username
                    </div>
                    <div>
                      <input
                        type="radio"
                        name="mode"
                        value="lost_activation"
                        checked={mode === 'lost_activation'}
                        onChange={() => setMode('lost_activation')}
                      />{' '}
                      I didn&apos;t receive the account activation mail
                    </div>
                  </div>
                </fieldset>
                <fieldset style={{ marginTop: '1em' }}>
                  <div className="col-sm-offset-4 col-sm-8">
                    {mode === 'forgot_username' ? (
                      <div>
                        Don&apos;t know your username anymore? No worries, enter your
                        e-mail address and we send it to you.
                      </div>
                    ) : null}
                    {mode === 'forgot_pass' ? (
                      <div>
                        So you forgot your password? No problem! Just enter your
                        e-mail address and you can reset it.
                      </div>
                    ) : null}
                    {mode === 'lost_activation' ? (
                      <div>
                        Please check your spam folder. If it is not there, we will
                        send it again if you enter your e-mail address below.
                      </div>
                    ) : null}
                  </div>
                </fieldset>
                <fieldset style={{ marginTop: '1em' }}>
                  <label className="col-md-4 control-label" htmlFor="mailInput">
                    Email Address
                  </label>
                  <div className="col-md-4">
                    <input
                      id="mailInput"
                      name="mailInput"
                      type="email"
                      placeholder="email"
                      className="form-control input-md"
                      required
                      value={mailInput}
                      onChange={(e) => setMailInput(e.target.value)}
                    />
                  </div>
                </fieldset>
                <fieldset style={{ marginTop: '1em' }}>
                  <div className="form-group">
                    <label className="col-md-4 control-label">Captcha</label>
                    <div className="col-md-4">
                      <Recaptcha key={widgetKey} onChange={setCaptcha} hideLabel />
                    </div>
                  </div>
                </fieldset>
                <div className="form-group form-actions" style={{ marginTop: '1em' }}>
                  <div className="col-sm-offset-4 col-sm-8">
                    <input type="submit" className="btn btn-primary" value="Submit" />
                  </div>
                </div>
              </div>
            </form>
          ) : null}

          {!noinput && !loading ? (
            <div>
              <form className="form-inline" onSubmit={resetPassword}>
                Password:{' '}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />{' '}
                Confirm Password:{' '}
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />{' '}
                <input type="submit" value="Recover" />
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
