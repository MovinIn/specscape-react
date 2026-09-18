import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type NotifyType = 'info' | 'error' | 'success'

type Toast = {
  id: number
  message: string
  type: NotifyType
}

type NotifierContextValue = {
  show: (message: string, type?: NotifyType) => void
}

const NotifierContext = createContext<NotifierContextValue | null>(null)

let toastId = 0

export function NotifierProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, type: NotifyType = 'info') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <NotifierContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            role="status"
          >
            {t.message}
          </div>
        ))}
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
