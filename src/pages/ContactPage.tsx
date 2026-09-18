import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { PageHeader } from '../components/PageHeader'
import { Recaptcha, resetRecaptcha } from '../components/Recaptcha'
import { useNotify } from '../components/Notifier'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function ContactPage() {
  const { show } = useNotify()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!captcha) {
      setStatus('error')
      show('Please complete the captcha.', 'error')
      return
    }
    setStatus('sending')
    try {
      await api.contactInquiry({
        name,
        email,
        subject,
        message,
        'g-recaptcha-response': captcha,
      })
      setStatus('sent')
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
      setCaptcha(null)
      resetRecaptcha()
      show('Message sent', 'success')
    } catch {
      setStatus('error')
      resetRecaptcha()
      setCaptcha(null)
      show('Could not send message', 'error')
    }
  }

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Contact"
        lead="Questions, suggestions, partnerships, or sensor hosting—send a note."
      />
      <div className="prose stack">
        <p>
          Fill in every field. For sensor applications and kit questions you can
          also start from <Link to="/join">Host a Sensor</Link>.
        </p>

        <form className="panel stack form-grid" onSubmit={onSubmit}>
          <div className="field">
            <label className="label" htmlFor="contact-name">
              Name
            </label>
            <input
              id="contact-name"
              className="input"
              name="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={status === 'sending'}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="contact-email">
              Email
            </label>
            <input
              id="contact-email"
              className="input"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'sending'}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="contact-subject">
              Subject
            </label>
            <input
              id="contact-subject"
              className="input"
              name="subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={status === 'sending'}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="contact-message">
              Message
            </label>
            <textarea
              id="contact-message"
              className="input"
              name="message"
              required
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={status === 'sending'}
            />
          </div>
          <Recaptcha onChange={setCaptcha} />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={status === 'sending'}
          >
            {status === 'sending' ? 'Sending…' : 'Send message'}
          </button>
          {status === 'sent' ? (
            <p className="success-banner" role="status">
              Thanks—your message was delivered.
            </p>
          ) : null}
          {status === 'error' ? (
            <p className="error-banner" role="alert">
              Something went wrong. Complete the captcha and try again.
            </p>
          ) : null}
        </form>
      </div>
    </div>
  )
}
