import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Sensor } from '../api/types'
import PageHeader from '../components/PageHeader'
import { extractSpectrumMatrix } from '../lib/spectrum'

/** Average power per frequency bin → occupancy % above threshold. */
function occupancyFromMatrix(matrix: number[][], thresholdDb = -70): number[] {
  const cols = matrix[0]?.length ?? 0
  if (!cols) return []
  const out: number[] = []
  for (let x = 0; x < cols; x++) {
    let hits = 0
    for (const row of matrix) {
      if ((row[x] ?? -999) > thresholdDb) hits++
    }
    out.push(matrix.length ? (hits / matrix.length) * 100 : 0)
  }
  return out
}

export default function OccupancyPage() {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [sensorId, setSensorId] = useState('')
  const [freqMin, setFreqMin] = useState('88000000')
  const [freqMax, setFreqMax] = useState('108000000')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [occupancy, setOccupancy] = useState<number[] | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.getSensors()
        if (!cancelled) setSensors(Array.isArray(list) ? list : [])
      } catch {
        /* shell */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const maxOcc = useMemo(
    () => (occupancy?.length ? Math.max(...occupancy, 1) : 1),
    [occupancy],
  )

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setOccupancy(null)
    if (!sensorId) {
      setError('Select a sensor.')
      return
    }
    setLoading(true)
    try {
      const end = Math.floor(Date.now() / 1000)
      const data = await api.getSpectrum({
        sensor: sensorId,
        timeBegin: end - 3600,
        timeEnd: end,
        freqMin: Number(freqMin) || 20_000_000,
        freqMax: Number(freqMax) || 1_700_000_000,
        aggFun: 'AVG',
        aggTime: 60,
        aggFreq: 100000,
        extended: 'true',
      })
      const matrix = extractSpectrumMatrix(data)
      if (!matrix) {
        setError('No spectrum matrix in response.')
        return
      }
      setOccupancy(occupancyFromMatrix(matrix))
    } catch {
      setError('Occupancy request failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="Channel occupancy"
        lead="Estimate how often frequency bins exceed a power threshold over the last hour."
      />
      <form className="stack form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label className="label" htmlFor="occ-sensor">
            Sensor
          </label>
          <select
            id="occ-sensor"
            className="input"
            value={sensorId}
            onChange={(e) => setSensorId(e.target.value)}
            required
          >
            <option value="">Select sensor…</option>
            {sensors.map((s) => {
              const id = s.serial ?? s.id
              return (
                <option key={String(id)} value={String(id)}>
                  {s.name ?? id}
                </option>
              )
            })}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="occ-fmin">
            Freq min (Hz)
          </label>
          <input
            id="occ-fmin"
            className="input"
            value={freqMin}
            onChange={(e) => setFreqMin(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="occ-fmax">
            Freq max (Hz)
          </label>
          <input
            id="occ-fmax"
            className="input"
            value={freqMax}
            onChange={(e) => setFreqMax(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Analyzing…' : 'Compute occupancy'}
        </button>
      </form>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="panel">
        <p className="muted">Occupancy by frequency bin (% time above −70 dB)</p>
        {occupancy ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 1,
              height: 180,
              marginTop: '0.75rem',
            }}
            aria-label="Occupancy chart"
          >
            {occupancy.map((v, i) => (
              <div
                key={i}
                title={`${v.toFixed(1)}%`}
                style={{
                  flex: 1,
                  height: `${(v / maxOcc) * 100}%`,
                  minHeight: 2,
                  background: 'linear-gradient(180deg, #2dd4bf, #0ea5e9)',
                  borderRadius: 1,
                }}
              />
            ))}
          </div>
        ) : (
          <p className="muted">Run an analysis to render the chart.</p>
        )}
      </div>
    </div>
  )
}
