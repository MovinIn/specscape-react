import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'specscape-cookie-consent'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  return (
    <div
      className="cookie-banner"
      role="dialog"
      aria-label="Cookie notice"
    >
      <p>
        SpecScape uses cookies for session auth and basic analytics. See the{' '}
        <Link to="/privacy-policy">privacy policy</Link>.
      </p>
      <button type="button" className="btn btn-primary" onClick={accept}>
        Accept
      </button>
    </div>
  )
}
