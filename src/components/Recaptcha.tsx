import { useEffect, useId, useRef } from 'react'

const SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ??
  '6Le0YsEsAAAAACcuLJClCmiFl9T8ztBlBNFPEE27'

// Temporary switch until we have access to the Google account that owns the
// production site key (it's registered for specscape.org only, not
// localhost). Set VITE_DISABLE_RECAPTCHA=true to skip loading the widget
// entirely and auto-supply a placeholder token so forms remain submittable.
const RECAPTCHA_DISABLED = import.meta.env.VITE_DISABLE_RECAPTCHA === 'true'

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
        },
      ) => number
      reset: (id?: number) => void
    }
    __specscapeRecaptchaReady?: boolean
  }
}

type RecaptchaProps = {
  onChange: (token: string | null) => void
  hideLabel?: boolean
}

let scriptPromise: Promise<void> | null = null

function loadRecaptchaScript() {
  if (window.grecaptcha) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-specscape-recaptcha]',
    )
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('recaptcha')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.specscapeRecaptcha = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('recaptcha'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

export function Recaptcha({ onChange, hideLabel }: RecaptchaProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<number | null>(null)
  const reactId = useId()

  useEffect(() => {
    if (RECAPTCHA_DISABLED) {
      onChange('recaptcha-disabled-dev-placeholder')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        await loadRecaptchaScript()
        if (cancelled || !hostRef.current || !window.grecaptcha) return
        if (widgetId.current !== null) return
        widgetId.current = window.grecaptcha.render(hostRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onChange(token),
          'expired-callback': () => onChange(null),
        })
      } catch {
        // Captcha optional in local/dev if script blocked
      }
    })()
    return () => {
      cancelled = true
    }
  }, [onChange])

  if (RECAPTCHA_DISABLED) {
    const notice = (
      <div className="alert alert-warning" style={{ marginBottom: 0 }}>
        Captcha disabled (dev mode) — pending Google account access.
      </div>
    )
    return hideLabel ? notice : <div className="field">{notice}</div>
  }

  if (hideLabel) {
    return <div ref={hostRef} aria-label="Captcha" />
  }

  return (
    <div className="field">
      <span className="label" id={`${reactId}-label`}>
        Captcha
      </span>
      <div ref={hostRef} aria-labelledby={`${reactId}-label`} />
    </div>
  )
}

export function resetRecaptcha() {
  try {
    window.grecaptcha?.reset()
  } catch {
    // ignore
  }
}
