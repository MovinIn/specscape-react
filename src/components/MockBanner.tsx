import { useEffect, useState } from 'react'

/**
 * Shows once when the explicit mock API mode is active.
 */
export function MockBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const onMock = () => setShow(true)
    window.addEventListener('specscape:mock-api', onMock)
    return () => window.removeEventListener('specscape:mock-api', onMock)
  }, [])

  if (!show) return null

  return (
    <div className="mock-banner" role="status">
      Mock API mode — showing fake data. Unset{' '}
      <code>VITE_USE_MOCK_API</code> to use the real backend.
      <button type="button" className="btn btn-ghost" onClick={() => setShow(false)}>
        Dismiss
      </button>
    </div>
  )
}
