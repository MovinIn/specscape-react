import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Sensor } from '../api/types'
import LeafletMap from '../components/LeafletMap'
import PageHeader from '../components/PageHeader'
import { useNotify } from '../components/Notifier'
import { parseSmartSerial, serial2mac } from '../lib/serial'

type FormState = {
  name: string
  smartSerial: string
  latitude: string
  longitude: string
  altitude: string
  indoor: boolean
  type: string
  frontend: string
}

const HARDWARE_TYPES = [
  'esraspi2psdr',
  'esraspi3psdr',
  'esraspi4psdr',
  'other',
]

const empty: FormState = {
  name: '',
  smartSerial: '',
  latitude: '',
  longitude: '',
  altitude: '',
  indoor: false,
  type: 'esraspi2psdr',
  frontend: 'rtl-sdr2',
}

export default function SensorFormPage() {
  const { sensorId } = useParams<{ sensorId: string }>()
  const isAdd = !sensorId || sensorId === 'add'
  const navigate = useNavigate()
  const { show } = useNotify()

  const [form, setForm] = useState<FormState>(empty)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!isAdd)
  const [submitting, setSubmitting] = useState(false)
  const [loaded, setLoaded] = useState<Sensor | null>(null)

  useEffect(() => {
    if (isAdd) return
    let cancelled = false
    ;(async () => {
      try {
        const s = await api.getSensor(sensorId!)
        if (cancelled) return
        setLoaded(s)
        const pos = (s.position as Record<string, unknown> | undefined) ?? {}
        const lat = Number(pos.latitude ?? s.latitude ?? s.lat)
        const lon = Number(pos.longitude ?? s.longitude ?? s.lon)
        const alt = Number(pos.altitude ?? s.altitude)
        setForm({
          name: String(s.name ?? ''),
          smartSerial:
            s.serial !== undefined && s.serial !== null
              ? serial2mac(s.serial)
              : '',
          latitude: Number.isFinite(lat) ? String(lat) : '',
          longitude: Number.isFinite(lon) ? String(lon) : '',
          altitude: Number.isFinite(alt) ? String(alt) : '',
          indoor: Boolean(pos.indoor ?? s.indoor),
          type: String(s.type ?? 'esraspi2psdr'),
          frontend: String(s.frontend ?? 'rtl-sdr2'),
        })
      } catch {
        if (!cancelled) setError('Could not load sensor.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAdd, sensorId])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const mapMarkers = useMemo(() => {
    const lat = Number(form.latitude)
    const lon = Number(form.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return []
    return [
      {
        id: sensorId ?? 'new',
        lat,
        lon,
        label: form.name || 'Sensor',
      },
    ]
  }, [form.latitude, form.longitude, form.name, sensorId])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const lat = Number(form.latitude)
    const lon = Number(form.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError('Latitude and longitude must be numbers.')
      return
    }
    if (!/^[A-Za-z0-9_.-]+$/.test(form.name)) {
      setError('Name may only contain letters, numbers, _, ., and -.')
      return
    }

    const serial = isAdd
      ? parseSmartSerial(form.smartSerial)
      : loaded?.serial !== undefined
        ? Number(loaded.serial)
        : parseSmartSerial(form.smartSerial)

    if (isAdd && serial === null) {
      setError('Enter a MAC address (aa:bb:…) or numeric serial.')
      return
    }

    const altitude = form.altitude.trim()
      ? Number(form.altitude)
      : undefined

    const payload: Sensor = {
      ...(loaded ?? {}),
      id: isAdd ? undefined : (loaded?.id ?? sensorId),
      name: form.name,
      serial: serial ?? undefined,
      type: form.type,
      frontend: form.frontend,
      position: {
        latitude: lat,
        longitude: lon,
        altitude: Number.isFinite(altitude) ? altitude : undefined,
        indoor: form.indoor,
      },
      latitude: lat,
      longitude: lon,
    }

    setSubmitting(true)
    try {
      if (isAdd) {
        const created = await api.addSensor(payload)
        show('Sensor created', 'success')
        const id = created?.serial ?? created?.id
        navigate(id !== undefined ? `/sensors/${id}` : '/sensors', {
          replace: true,
        })
      } else {
        await api.editSensor(payload)
        show('Sensor updated', 'success')
        navigate(`/sensors/${sensorId}`, { replace: true })
      }
    } catch {
      const msg = isAdd ? 'Could not create sensor.' : 'Could not update sensor.'
      setError(msg)
      show(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <PageHeader title="Edit sensor" />
        <p className="muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title={isAdd ? 'Add sensor' : 'Edit sensor'}
        lead={
          isAdd
            ? 'Register a new spectrum sensor on the network.'
            : `Sensor ${sensorId}`
        }
      />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="grid-2">
        <form className="stack form-grid panel" onSubmit={onSubmit}>
          <div className="field">
            <label className="label" htmlFor="sensor-name">
              Name
            </label>
            <input
              id="sensor-name"
              className="input"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              pattern="[A-Za-z0-9_.\-]+"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="sensor-serial">
              Serial / MAC
            </label>
            <input
              id="sensor-serial"
              className="input"
              value={form.smartSerial}
              onChange={(e) => update('smartSerial', e.target.value)}
              required={isAdd}
              disabled={!isAdd}
              placeholder="aa:bb:cc:dd:ee:ff or integer"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="sensor-type">
              Hardware type
            </label>
            <select
              id="sensor-type"
              className="input"
              value={form.type}
              onChange={(e) => update('type', e.target.value)}
            >
              {HARDWARE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="sensor-frontend">
              Frontend
            </label>
            <input
              id="sensor-frontend"
              className="input"
              value={form.frontend}
              onChange={(e) => update('frontend', e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="sensor-lat">
              Latitude
            </label>
            <input
              id="sensor-lat"
              className="input"
              inputMode="decimal"
              value={form.latitude}
              onChange={(e) => update('latitude', e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="sensor-lon">
              Longitude
            </label>
            <input
              id="sensor-lon"
              className="input"
              inputMode="decimal"
              value={form.longitude}
              onChange={(e) => update('longitude', e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="sensor-alt">
              Altitude (m)
            </label>
            <input
              id="sensor-alt"
              className="input"
              inputMode="decimal"
              value={form.altitude}
              onChange={(e) => update('altitude', e.target.value)}
            />
          </div>
          <label className="field" style={{ flexDirection: 'row', gap: '0.6rem' }}>
            <input
              type="checkbox"
              checked={form.indoor}
              onChange={(e) => update('indoor', e.target.checked)}
            />
            <span className="label">Indoor antenna</span>
          </label>
          <div className="stack" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : isAdd ? 'Create sensor' : 'Save changes'}
            </button>
            <Link className="btn btn-ghost" to="/sensors">
              Cancel
            </Link>
          </div>
        </form>

        <div className="panel">
          <p className="muted">Click the map to set coordinates</p>
          <LeafletMap
            markers={mapMarkers}
            height={360}
            center={
              mapMarkers[0]
                ? [mapMarkers[0].lat, mapMarkers[0].lon]
                : undefined
            }
            zoom={mapMarkers[0] ? 10 : 4}
            onMapClick={(lat, lon) => {
              update('latitude', lat.toFixed(6))
              update('longitude', lon.toFixed(6))
            }}
          />
        </div>
      </div>
    </div>
  )
}
