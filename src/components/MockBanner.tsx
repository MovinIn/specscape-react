import { useEffect, useState } from 'react'

/**
 * Shows once in DEV after mock API fallback engages.
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
      Live API unreachable — using mock data. Set{' '}
      <code>VITE_API_PROXY_TARGET</code> when you have a working backend.
      <button type="button" className="btn btn-ghost" onClick={() => setShow(false)}>
        Dismiss
      </button>
    </div>
  )
}
