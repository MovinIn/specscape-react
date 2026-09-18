import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Sensor } from '../api/types'
import PageHeader from '../components/PageHeader'
import {
  averageSpectrumRow,
  extractSpectrumMatrix,
  formatHz,
  toUnixSeconds,
} from '../lib/spectrum'

function drawWaterfall(
  canvas: HTMLCanvasElement,
  matrix: number[][],
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  if (!rows || !cols) return

  canvas.width = cols
  canvas.height = rows
  const image = ctx.createImageData(cols, rows)
  let min = Infinity
  let max = -Infinity
  for (const row of matrix) {
    for (const v of row) {
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  const span = max - min || 1
  let i = 0
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = (matrix[y][x] - min) / span
      const r = Math.floor(20 + t * 200)
      const g = Math.floor(80 + t * 160)
      const b = Math.floor(120 + t * 100)
      image.data[i++] = r
      image.data[i++] = g
      image.data[i++] = b
      image.data[i++] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
}

function drawBarPlot(
  canvas: HTMLCanvasElement,
  values: number[],
  freqMin: number,
  freqMax: number,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx || !values.length) return
  const dpr = window.devicePixelRatio || 1
  const cssW = canvas.clientWidth || 640
  const cssH = 200
  canvas.width = Math.floor(cssW * dpr)
  canvas.height = Math.floor(cssH * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const padL = 48
  const padR = 12
  const padT = 12
  const padB = 28
  const plotW = cssW - padL - padR
  const plotH = cssH - padT - padB

  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const span = max - min || 1

  ctx.clearRect(0, 0, cssW, cssH)
  ctx.fillStyle = '#0a1220'
  ctx.fillRect(0, 0, cssW, cssH)

  ctx.strokeStyle = 'rgba(148,163,184,0.35)'
  ctx.beginPath()
  ctx.moveTo(padL, padT)
  ctx.lineTo(padL, padT + plotH)
  ctx.lineTo(padL + plotW, padT + plotH)
  ctx.stroke()

  const barW = plotW / values.length
  for (let i = 0; i < values.length; i++) {
    const t = (values[i] - min) / span
    const h = t * plotH
    ctx.fillStyle = `rgb(${Math.floor(20 + t * 200)},${Math.floor(140 + t * 80)},${Math.floor(180 - t * 40)})`
    ctx.fillRect(padL + i * barW, padT + plotH - h, Math.max(1, barW - 0.5), h)
  }

  ctx.fillStyle = '#93a0b8'
  ctx.font = '11px "IBM Plex Sans", sans-serif'
  ctx.fillText(`${min.toFixed(1)} dB`, 4, padT + plotH)
  ctx.fillText(`${max.toFixed(1)} dB`, 4, padT + 10)
  ctx.fillText(formatHz(freqMin), padL, cssH - 8)
  ctx.fillText(formatHz(freqMax), padL + plotW - 48, cssH - 8)
}

export default function SpecMonPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [sensorId, setSensorId] = useState(searchParams.get('sensor') ?? '')
  const [from, setFrom] = useState(searchParams.get('from') ?? '')
  const [to, setTo] = useState(searchParams.get('to') ?? '')
  const [freqMin, setFreqMin] = useState(searchParams.get('freqMin') ?? '20000000')
  const [freqMax, setFreqMax] = useState(searchParams.get('freqMax') ?? '1700000000')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matrix, setMatrix] = useState<number[][] | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [hoverDb, setHoverDb] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const barRef = useRef<HTMLCanvasElement>(null)

  const avgSpectrum = useMemo(
    () => (matrix ? averageSpectrumRow(matrix) : null),
    [matrix],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.getSensors()
        if (cancelled) return
        setSensors(Array.isArray(list) ? list : [])
      } catch {
        // optional for shell
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!matrix || !canvasRef.current) return
    drawWaterfall(canvasRef.current, matrix)
  }, [matrix])

  useEffect(() => {
    if (!avgSpectrum || !barRef.current) return
    drawBarPlot(
      barRef.current,
      avgSpectrum,
      Number(freqMin) || 0,
      Number(freqMax) || 1,
    )
  }, [avgSpectrum, freqMin, freqMax])

  const sensorOptions = useMemo(
    () =>
      sensors.map((s) => {
        const id = s.serial ?? s.id
        return { id, label: s.name ?? String(id) }
      }),
    [sensors],
  )

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSummary(null)
    setMatrix(null)
    setHoverDb(null)
    if (!sensorId) {
      setError('Select a sensor.')
      return
    }
    setLoading(true)
    const next: Record<string, string> = { sensor: sensorId }
    if (from) next.from = from
    if (to) next.to = to
    if (freqMin) next.freqMin = freqMin
    if (freqMax) next.freqMax = freqMax
    setSearchParams(next)
    try {
      const now = Math.floor(Date.now() / 1000)
      const begin = toUnixSeconds(from) ?? now - 3600
      const end = toUnixSeconds(to) ?? now
      const params: Record<string, string | number> = {
        sensor: sensorId,
        timeBegin: begin,
        timeEnd: end,
        freqMin: Number(freqMin) || 20_000_000,
        freqMax: Number(freqMax) || 1_700_000_000,
        aggFun: 'AVG',
        aggTime: 60,
        aggFreq: 100000,
        extended: 'true',
      }
      const data = await api.getSpectrum(params)
      const m = extractSpectrumMatrix(data)
      if (m) {
        setMatrix(m)
        setSummary(`${m.length} time bins × ${m[0]?.length ?? 0} frequency bins`)
      } else {
        const text = JSON.stringify(data, null, 2)
        setSummary(text.length > 2000 ? `${text.slice(0, 2000)}…` : text)
      }
    } catch {
      setError('Spectrum request failed.')
    } finally {
      setLoading(false)
    }
  }

  function onBarMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!avgSpectrum || !barRef.current) return
    const rect = barRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - 48
    const plotW = rect.width - 60
    if (x < 0 || x > plotW) {
      setHoverDb(null)
      return
    }
    const idx = Math.min(
      avgSpectrum.length - 1,
      Math.max(0, Math.floor((x / plotW) * avgSpectrum.length)),
    )
    const fMin = Number(freqMin) || 0
    const fMax = Number(freqMax) || 1
    const freq = fMin + (idx / Math.max(1, avgSpectrum.length - 1)) * (fMax - fMin)
    setHoverDb(`${formatHz(freq)} · ${avgSpectrum[idx].toFixed(2)} dB`)
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="Spectrum monitor"
        lead="Query aggregated spectrum for a sensor and time/frequency window."
      />
      <form className="stack form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label className="label" htmlFor="spec-sensor">
            Sensor
          </label>
          <select
            id="spec-sensor"
            className="input"
            value={sensorId}
            onChange={(e) => setSensorId(e.target.value)}
            required
          >
            <option value="">Select sensor…</option>
            {sensorOptions.map((s) => (
              <option key={String(s.id)} value={String(s.id)}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="spec-from">
            From (ISO or unix seconds)
          </label>
          <input
            id="spec-from"
            className="input"
            placeholder="defaults to 1 hour ago"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="spec-to">
            To (ISO or unix seconds)
          </label>
          <input
            id="spec-to"
            className="input"
            placeholder="defaults to now"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="spec-fmin">
            Freq min (Hz)
          </label>
          <input
            id="spec-fmin"
            className="input"
            inputMode="numeric"
            value={freqMin}
            onChange={(e) => setFreqMin(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="spec-fmax">
            Freq max (Hz)
          </label>
          <input
            id="spec-fmax"
            className="input"
            inputMode="numeric"
            value={freqMax}
            onChange={(e) => setFreqMax(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Fetch spectrum'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 2000)
            } catch {
              setCopied(false)
            }
          }}
        >
          {copied ? 'Link copied' : 'Copy share link'}
        </button>
      </form>

      <div className="panel">
        <p className="muted">Waterfall</p>
        {matrix ? (
          <canvas
            ref={canvasRef}
            className="leaflet-map"
            style={{ width: '100%', height: 'auto', imageRendering: 'pixelated' }}
          />
        ) : (
          <p className="muted">Fetch spectrum to render a waterfall preview.</p>
        )}
      </div>

      <div className="panel">
        <p className="muted">
          Average power bar plot
          {hoverDb ? ` — ${hoverDb}` : ''}
        </p>
        {avgSpectrum ? (
          <canvas
            ref={barRef}
            style={{ width: '100%', height: 200, display: 'block' }}
            onMouseMove={onBarMove}
            onMouseLeave={() => setHoverDb(null)}
          />
        ) : (
          <p className="muted">Appears after a successful spectrum fetch.</p>
        )}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {summary ? (
        <div className="panel">
          <p className="muted">Result</p>
          <pre className="prose" style={{ textAlign: 'left', overflow: 'auto' }}>
            {summary}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
