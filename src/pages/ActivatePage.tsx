import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

export default function ActivatePage() {
  const { uid = '', token = '' } = useParams<{ uid: string; token: string }>()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('Activating your account…')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!uid || !token) {
        setStatus('error')
        setMessage('Missing activation link parameters.')
        return
      }
      try {
        await api.activateAccount(uid, token)
        if (cancelled) return
        setStatus('ok')
        setMessage('Account activated. You can sign in now.')
      } catch {
        if (cancelled) return
        setStatus('error')
        setMessage('Activation failed. The link may be invalid or expired.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uid, token])

  return (
    <div className="page">
      <PageHeader title="Activate account" />
      <div className={status === 'error' ? 'error-banner' : status === 'ok' ? 'success-banner' : 'panel'}>
        {message}
      </div>
      {status === 'ok' ? (
        <p>
          <Link className="btn btn-primary" to="/login">
            Sign in
          </Link>
        </p>
      ) : null}
    </div>
  )
}
