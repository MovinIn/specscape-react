import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type NotifyType = 'info' | 'error' | 'success' | 'warn'

type NotifierContextValue = {
  /** `type: 'success'` is treated as `'info'` — the original app has no success bucket. */
  show: (message: string, type?: NotifyType) => void
  /** Mirrors esNotifier.reset() / onPromiseRejected(resp). */
  reset: () => void
  onPromiseRejected: (err: unknown) => void
}

const NotifierContext = createContext<NotifierContextValue | null>(null)

export function NotifierProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [infos, setInfos] = useState<string[]>([])

  const reset = useCallback(() => {
    setErrors([])
    setWarnings([])
    setInfos([])
  }, [])

  const show = useCallback(
    (message: string, type: NotifyType = 'info') => {
      window.scrollTo(0, 0)
      if (type === 'error') setErrors((prev) => [...prev, message])
      else if (type === 'warn') setWarnings((prev) => [...prev, message])
      else setInfos((prev) => [...prev, message])
    },
    [],
  )

  const onPromiseRejected = useCallback((err: unknown) => {
    const data = (err as { data?: unknown; statusText?: string } | null)?.data
    window.scrollTo(0, 0)
    if (Array.isArray(data)) {
      const msgs = data.map((o) =>
        o && typeof o === 'object' && 'defaultMessage' in o
          ? String((o as { defaultMessage?: unknown }).defaultMessage)
          : String(o),
      )
      setErrors((prev) => [...prev, ...msgs])
    } else if (data && typeof data === 'object' && 'message' in data) {
      setErrors((prev) => [...prev, String((data as { message?: unknown }).message)])
    } else {
      const statusText = (err as { statusText?: string } | null)?.statusText
      setErrors((prev) => [...prev, statusText || 'Unknown Error'])
    }
  }, [])

  const value = useMemo(
    () => ({ show, reset, onPromiseRejected }),
    [show, reset, onPromiseRejected],
  )

  return (
    <NotifierContext.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 64,
          zIndex: 100,
          left: 10,
          maxWidth: '90%',
        }}
      >
        {errors.length > 0 ? (
          <div className="alert alert-danger alert-dismissible" role="alert">
            <button
              type="button"
              className="close"
              aria-label="Close"
              onClick={() => setErrors([])}
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <h4>Error</h4>
            <ul className="unstyled">
              {errors.slice(0, 5).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {warnings.length > 0 ? (
          <div className="alert alert-warning alert-dismissible" role="alert">
            <button
              type="button"
              className="close"
              aria-label="Close"
              onClick={() => setWarnings([])}
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <h4>Warning</h4>
            <ul className="unstyled">
              {warnings.slice(0, 5).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {infos.length > 0 ? (
          <div className="alert alert-info alert-dismissible" role="alert">
            <button
              type="button"
              className="close"
              aria-label="Close"
              onClick={() => setInfos([])}
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <h4>Info</h4>
            <ul className="unstyled">
              {infos.slice(0, 5).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </NotifierContext.Provider>
  )
}

export function useNotify(): NotifierContextValue {
  const ctx = useContext(NotifierContext)
  if (!ctx) {
    throw new Error('useNotify must be used within NotifierProvider')
  }
  return ctx
}
