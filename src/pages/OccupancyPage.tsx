import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Sensor } from '../api/types'
import { formatHz } from '../lib/spectrum'

type Point = { x: number; y: number }

/** Exact port of the FCO algorithm in channel-occupancy.js `newSpectrumData`. */
function computeFco(
  values: (number | null)[][],
  startTime: number,
  timeRes: number,
  threshold: number,
  interval: number,
): Point[] {
  const measurementsPerInterval = interval
  const fco: Point[] = []
  for (
    let t = 0;
    t < values.length - measurementsPerInterval;
    t += measurementsPerInterval
  ) {
    const bucket = values.slice(t, t + measurementsPerInterval)
    const bucketUsage =
      (bucket.reduce(
        (acc, row) =>
          acc + (row.some((v) => v != null && v > threshold) ? 1 : 0),
        0,
      ) /
        bucket.length) *
      100
    fco.push({ x: 1000 * (startTime + t * timeRes), y: bucketUsage })
  }
  return fco
}

/** Exact port of `movingWindowAvg` in channel-occupancy.js. */
function movingWindowAvg(arr: Point[], step: number): Point[] {
  return arr.map((_, idx) => {
    const wnd = arr.slice(idx - step, idx + step + 1).map((p) => p.y)
    let result = wnd.reduce((a, b) => a + b, 0) / wnd.length
    if (Number.isNaN(result)) result = arr[idx].y
    return { x: arr[idx].x, y: result }
  })
}

function drawChart(
  canvas: HTMLCanvasElement,
  fco: Point[],
  mavg: Point[],
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const cssW = canvas.clientWidth || 640
  const cssH = 350
  canvas.width = Math.floor(cssW * dpr)
  canvas.height = Math.floor(cssH * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)

  const padL = 50
  const padR = 20
  const padT = 20
  const padB = 30
  const plotW = cssW - padL - padR
  const plotH = cssH - padT - padB

  ctx.strokeStyle = '#ccc'
  ctx.fillStyle = '#000'
  ctx.font = '10px Verdana'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const pct = i * 20
    const y = padT + plotH - (pct / 100) * plotH
    ctx.beginPath()
    ctx.moveTo(padL, y)
    ctx.lineTo(padL + plotW, y)
    ctx.stroke()
    ctx.fillText(`${pct}%`, 8, y + 3)
  }

  if (!fco.length) {
    ctx.fillStyle = '#888'
    ctx.font = '14px Verdana'
    ctx.fillText('No data for the selected range', padL + 10, padT + plotH / 2)
    return
  }

  const xMin = fco[0].x
  const xMax = fco[fco.length - 1].x || xMin + 1
  const xScale = (x: number) =>
    padL + ((x - xMin) / Math.max(1, xMax - xMin)) * plotW
  const yScale = (y: number) => padT + plotH - (y / 100) * plotH

  function drawSeries(points: Point[], color: string, width: number) {
    ctx!.strokeStyle = color
    ctx!.lineWidth = width
    ctx!.beginPath()
    points.forEach((p, i) => {
      const x = xScale(p.x)
      const y = yScale(p.y)
      if (i === 0) ctx!.moveTo(x, y)
      else ctx!.lineTo(x, y)
    })
    ctx!.stroke()
  }

  drawSeries(fco, '#7cb5ec', 1.5)
  drawSeries(mavg, '#434348', 2.5)

  // x-axis time labels (HH:MM), a handful evenly spaced
  ctx.fillStyle = '#000'
  ctx.font = '10px Verdana'
  ctx.textAlign = 'center'
  const labelCount = Math.min(6, fco.length)
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.floor((i / Math.max(1, labelCount - 1)) * (fco.length - 1))
    const p = fco[idx]
    const d = new Date(p.x)
    const label = d.toTimeString().slice(0, 5)
    ctx.fillText(label, xScale(p.x), padT + plotH + 16)
  }
  ctx.textAlign = 'left'
}

/** Exact port of channel-occupancy.html / channel-occupancy.js (ChanOccupancyController). */
export default function OccupancyPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [sensors, setSensors] = useState<Sensor[]>([])
  const [sensorSerial, setSensorSerial] = useState('202481591931210')
  const [sensorName, setSensorName] = useState('')

  const [startTime, setStartTime] = useState(() => {
    const d = Date.now()
    return d - (d % 86400000)
  })
  const timeRes = 60

  const [centerFreq, setCenterFreq] = useState(420_000_000)
  const [chanWidth, setChanWidth] = useState(20_000_000)
  const [threshold, setThreshold] = useState(15)
  const [interval, setIntervalMin] = useState(5)

  const [isLoading, setIsLoading] = useState(false)
  const [retrievalTime, setRetrievalTime] = useState<number | null>(null)
  const [rawValues, setRawValues] = useState<(number | null)[][] | null>(null)
  const [dataStartTime, setDataStartTime] = useState(0)
  const [dataTimeRes, setDataTimeRes] = useState(60)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.getSensors()
        if (!cancelled) setSensors(Array.isArray(list) ? list : [])
      } catch {
        /* keep default serial */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadData = useCallback(async () => {
    if (startTime > Date.now()) return
    const minFreq = centerFreq - chanWidth / 2
    const maxFreq = centerFreq + chanWidth / 2 - 10000

    setIsLoading(true)
    setRetrievalTime(null)
    const started = Date.now()
    try {
      const data = await api.getSpectrum({
        sensor: sensorSerial,
        timeBegin: Math.floor(startTime / 1000),
        timeEnd: Math.floor(startTime / 1000) + 86400,
        freqMin: Math.round(minFreq),
        freqMax: Math.round(maxFreq),
        aggFreq: Math.round(maxFreq - minFreq),
        aggTime: timeRes,
        aggFun: 'AVG',
      })
      if (data?.values?.length) {
        setRawValues(data.values)
        setDataStartTime(data.startTime ?? Math.floor(startTime / 1000))
        setDataTimeRes(data.timeRes ?? timeRes)
      } else {
        setRawValues([])
      }
    } catch {
      setRawValues([])
    } finally {
      setRetrievalTime(Date.now() - started)
      setIsLoading(false)
    }
  }, [sensorSerial, startTime, centerFreq, chanWidth])

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorSerial, startTime, centerFreq, chanWidth])

  const { fco, mavg } = useMemo(() => {
    if (!rawValues || !rawValues.length) return { fco: [], mavg: [] }
    const fcoSeries = computeFco(
      rawValues,
      dataStartTime,
      dataTimeRes,
      threshold,
      interval,
    )
    return { fco: fcoSeries, mavg: movingWindowAvg(fcoSeries, 5) }
  }, [rawValues, dataStartTime, dataTimeRes, threshold, interval])

  useEffect(() => {
    if (!canvasRef.current) return
    drawChart(canvasRef.current, fco, mavg)
  }, [fco, mavg])

  function loadFreqRange(minFreq: number, maxFreq: number) {
    const width = maxFreq - minFreq
    setChanWidth(width)
    setCenterFreq(Math.floor(minFreq + width / 2))
  }

  return (
    <div className="container-fluid">
      <h1>Frequency Channel Occupancy</h1>

      <div className="row">
        <div style={{ position: 'relative' }} className="col-sm-12">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', minHeight: 350, paddingLeft: 75 }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              fontWeight: 'bold',
            }}
          >
            Channel Occupancy
          </div>
          {isLoading ? (
            <div
              className="text-center"
              style={{
                position: 'absolute',
                top: '45%',
                left: 0,
                width: '100%',
              }}
            >
              Loading…
            </div>
          ) : null}
        </div>
      </div>

      <hr />

      <div className="row es-sbar">
        <form className="form form-inline" style={{ display: 'inline-block' }}>
          <label htmlFor="occ-sensor-name">Sensor Name</label>{' '}
          <div className="input-group input-group-sm">
            <input
              id="occ-sensor-name"
              className="form-control input-sm"
              list="occ-sensor-list"
              value={sensorName}
              placeholder={sensorSerial}
              onChange={(e) => {
                setSensorName(e.target.value)
                const match = sensors.find((s) => s.name === e.target.value)
                if (match?.serial != null) setSensorSerial(String(match.serial))
              }}
            />
            <datalist id="occ-sensor-list">
              {sensors
                .filter((s) => s.name)
                .map((s) => (
                  <option key={String(s.serial ?? s.name)} value={s.name} />
                ))}
            </datalist>
          </div>{' '}
          |{' '}
          <label htmlFor="occ-date">Date</label>{' '}
          <input
            id="occ-date"
            type="date"
            className="form-control input-sm"
            style={{ display: 'inline-block', width: 'auto' }}
            value={new Date(startTime).toISOString().slice(0, 10)}
            onChange={(e) => {
              if (!e.target.value) return
              const next = new Date(e.target.value).getTime()
              if (Number.isFinite(next)) setStartTime(next)
            }}
          />
        </form>
      </div>

      <p>
        Select a center frequency and bandwidth. Click reload to get data. You
        can adjust the occupancy threshold for which the channel is assumed to
        be occupied. Furthermore, choose the integration interval that defines
        the aggregation time.
      </p>

      <div className="row">
        <div className="col-sm-2 col-md-2 col-lg-2">Center Frequency</div>
        <div className="col-sm-4 col-md-4 col-lg-3 text-center">
          <form className="form form-inline">
            <input
              type="number"
              className="form-control input-sm"
              style={{ width: 100 }}
              value={centerFreq / 1_000_000}
              disabled={isLoading}
              onChange={(e) =>
                setCenterFreq((Number(e.target.value) || 0) * 1_000_000)
              }
            />{' '}
            MHz
          </form>
        </div>

        <div className="col-sm-2 col-md-2 col-lg-2">Channel Bandwidth</div>
        <div className="col-sm-4 col-md-4 col-lg-3 text-center">
          <form className="form form-inline">
            <input
              type="number"
              className="form-control input-sm"
              style={{ width: 100 }}
              value={chanWidth / 1_000_000}
              disabled={isLoading}
              onChange={(e) =>
                setChanWidth((Number(e.target.value) || 0) * 1_000_000)
              }
            />{' '}
            MHz
          </form>
        </div>

        <div className="col-sm-2 col-md-2 col-lg-2 col-lg-offset-0">
          <button
            className="btn btn-success btn-sm"
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            Reload
          </button>
        </div>
      </div>

      <div className="row" style={{ marginTop: '1em' }}>
        <div className="col-sm-2" style={{ paddingTop: 8 }}>
          Occupancy Threshold {threshold}dB
        </div>
        <div className="col-sm-4">
          <input
            type="range"
            min={0}
            max={70}
            value={threshold}
            disabled={isLoading}
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        <div className="col-sm-2" style={{ paddingTop: 8 }}>
          Integration Interval {interval}min
        </div>
        <div className="col-sm-4">
          <input
            type="range"
            min={1}
            max={60}
            value={interval}
            disabled={isLoading}
            onChange={(e) => setIntervalMin(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {retrievalTime != null ? (
        <p className="text-muted" style={{ marginTop: '1em' }}>
          Retrieval time: {retrievalTime}ms · Channel: [
          {formatHz(centerFreq - chanWidth / 2)}, {formatHz(centerFreq + chanWidth / 2)}]
          {' · '}
          <button
            type="button"
            className="btn btn-link btn-xs"
            style={{ padding: 0 }}
            onClick={() => loadFreqRange(centerFreq - chanWidth / 2, centerFreq + chanWidth / 2)}
          >
            reload range
          </button>
        </p>
      ) : null}
    </div>
  )
}
