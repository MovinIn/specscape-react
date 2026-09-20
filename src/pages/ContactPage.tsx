import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import { Recaptcha, resetRecaptcha } from '../components/Recaptcha'
import { useNotify } from '../components/Notifier'

export default function ContactPage() {
  const { show } = useNotify()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!captcha) {
      show('Please solve the captcha!', 'error')
      return
    }
    setIsWorking(true)
    try {
      await api.contactInquiry({
        name,
        email,
        subject,
        message,
        'g-recaptcha-response': captcha,
      })
      show('Thanks for your inquiry. We will answer as soon as possible!', 'info')
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
      resetRecaptcha()
      setCaptcha(null)
    } catch {
      show('Something went wrong. Please try again.', 'error')
      resetRecaptcha()
      setCaptcha(null)
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-12">
          <div className="page-header">
            <h2>Contact</h2>
          </div>

          <p>
            If you have any questions, improvements, suggestions or general
            remarks, feel free to contact us using the form below. You need
            to fill out all the fields.
          </p>

          <form className="form-horizontal" onSubmit={submit}>
            <fieldset disabled={isWorking}>
              <div className="form-group">
                <label className="col-md-4 control-label" htmlFor="name">
                  Name
                </label>
                <div className="col-md-4">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="full name"
                    className="form-control input-md"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="col-md-4 control-label" htmlFor="subject">
                  Subject
                </label>
                <div className="col-md-4">
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    placeholder="subject"
                    className="form-control input-md"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="col-md-4 control-label" htmlFor="message">
                  Message
                </label>
                <div className="col-md-4">
                  <textarea
                    className="form-control"
                    cols={50}
                    rows={10}
                    id="message"
                    name="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </div>
            </fieldset>
            <fieldset disabled={isWorking}>
              <div className="form-group">
                <label className="col-md-4 control-label" htmlFor="captcha">
                  Captcha
                </label>
                <div className="col-md-4">
                  <Recaptcha onChange={setCaptcha} hideLabel />
                </div>
              </div>
            </fieldset>
            <div className="form-group form-actions">
              <div className="col-sm-offset-4 col-sm-4">
                <button
                  type="submit"
                  className="btn btn-primary validate"
                  disabled={isWorking}
                >
                  Send Email
                </button>
                {isWorking ? (
                  <span>
                    <span className="glyphicon glyphicon-refresh" />
                    &nbsp;Delivering...
                  </span>
                ) : null}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
