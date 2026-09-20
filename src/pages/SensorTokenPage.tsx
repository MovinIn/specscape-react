import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function SensorTokenPage() {
  const [token, setToken] = useState<{ value: string } | null>(null)
  const [expirationDate, setExpirationDate] = useState<number | null>(null)
  const [expires, setExpires] = useState<string | null>(null)
  const intervalRun = useRef(0)

  async function updateToken(force: boolean) {
    const resp = await api.getRegistrationToken(force)
    setToken({ value: resp.value })
    setExpirationDate(new Date(resp.validUntil).getTime())
  }

  function getToken() {
    void updateToken(false)
  }

  function newToken() {
    setToken(null)
    setExpirationDate(null)
    setExpires(null)
    void updateToken(true)
  }

  useEffect(() => {
    getToken()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (expirationDate == null) return

      if (expirationDate <= Date.now()) {
        setToken(null)
        setExpirationDate(null)
        setExpires(null)
        getToken()
        return
      }

      intervalRun.current += 1
      if (intervalRun.current % 10 === 0) {
        getToken()
      }

      setExpires(formatRemaining(expirationDate - Date.now()))
    }, 500)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expirationDate])

  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-12">
          <h1>Sensor Registration Token</h1>

          <p>
            The sensor registration can be used to connect your sensor to
            your SpecScape account.
          </p>

          {token !== null ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '3em' }}>{token.value}</p>
              {expires !== null ? (
                <p className="text-muted">expires in {expires}</p>
              ) : null}

              <button
                className="btn btn-default btn-sm"
                onClick={newToken}
              >
                New Token
              </button>
            </div>
          ) : (
            <div className="text-center">
              <h4>Loading...</h4>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
