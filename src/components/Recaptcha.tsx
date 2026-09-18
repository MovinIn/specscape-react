import { useEffect, useId, useRef } from 'react'

const SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ??
  '6Le0YsEsAAAAACcuLJClCmiFl9T8ztBlBNFPEE27'

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

export function Recaptcha({ onChange }: RecaptchaProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<number | null>(null)
  const reactId = useId()

  useEffect(() => {
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
