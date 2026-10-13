import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { RzSlider } from '../RzSlider'

export type LivePowerLevelsHandle = {
  setData: (data: number[]) => void
  clear: () => void
}

type Props = {
  ref?: Ref<LivePowerLevelsHandle>
  /** Fractions from the waterfall color legend: y max = upper * -50, y min = lower * -50. */
  upperThreshold: number
  lowerThreshold: number
  /** Width of the waterfall slider column, so the plot lines up with the waterfall. */
  sliderWidth: number
  /** When true, renders a vertical range slider on the left to control the Y axis. */
  showSlider?: boolean
}

const HEIGHT = 250
const FONT = '"Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sans-serif'

/**
 * Port of live-power-levels: the Highcharts area chart of the latest PSD
 * (black line, #040534 fill, "Power Level [dB/Hz]" y axis, hidden x axis),
 * drawn on a canvas with Highcharts' default spacing and styling.
 */
export function LivePowerLevels({ ref, upperThreshold, lowerThreshold, sliderWidth, showSlider = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const legendCanvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef<number[]>([])
  const lastDataTime = useRef(0)
  const [noData, setNoData] = useState(true)
  const range = useRef({ min: -50, max: 0 })
  // Slider-controlled Y axis range (dB). Low handle = min (floor), high handle = max (ceil).
  const [sliderLow, setSliderLow] = useState(-50)
  const [sliderHigh, setSliderHigh] = useState(0)

  function draw() {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const dpr = window.devicePixelRatio || 1
    const width = wrap.clientWidth
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(HEIGHT * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${HEIGHT}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, HEIGHT)

    const { min, max } = range.current
    const span = max - min || 1
    const spacingTop = 10
    const spacingBottom = 15
    ctx.font = `11px ${FONT}`
    const labelW = Math.max(ctx.measureText(String(min)).width, ctx.measureText(String(max)).width)
    const plotX = 10 + 16 + 10 + labelW + 8
    const plotY = spacingTop
    const plotW = width - plotX
    const plotH = HEIGHT - spacingTop - spacingBottom
    const y = (v: number) => plotY + ((max - v) / span) * plotH

    // grid lines every 1 dB (tickInterval: 1); labels thinned where they would overlap
    ctx.strokeStyle = '#e6e6e6'
    ctx.lineWidth = 1
    ctx.fillStyle = '#666666'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    let lastLabelY = -Infinity
    for (let v = Math.ceil(max); v >= Math.floor(min); v--) {
      const yy = Math.round(y(v)) + 0.5
      ctx.beginPath()
      ctx.moveTo(plotX, yy)
      ctx.lineTo(plotX + plotW, yy)
      ctx.stroke()
      if (yy - lastLabelY >= 13) {
        ctx.fillText(String(v), plotX - 8, yy)
        lastLabelY = yy
      }
    }

    ctx.save()
    ctx.translate(10 + 8, plotY + plotH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.font = `12px ${FONT}`
    ctx.fillText('Power Level [dB/Hz]', 0, 0)
    ctx.restore()

    const data = dataRef.current
    if (data.length > 1) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(plotX, plotY, plotW, plotH)
      ctx.clip()
      const x = (i: number) => plotX + (i / (data.length - 1)) * plotW
      ctx.beginPath()
      ctx.moveTo(x(0), plotY + plotH)
      data.forEach((v, i) => ctx.lineTo(x(i), y(v)))
      ctx.lineTo(x(data.length - 1), plotY + plotH)
      ctx.closePath()
      ctx.fillStyle = '#040534'
      ctx.fill()
      ctx.beginPath()
      data.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))))
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    }

    ctx.font = `9px ${FONT}`
    ctx.fillStyle = '#999999'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('Highcharts.com', width - 10, HEIGHT - 5)
  }

  useImperativeHandle(ref, () => ({
    setData(data: number[]) {
      dataRef.current = data
      lastDataTime.current = Date.now()
      setNoData(false)
      draw()
    },
    clear() {
      draw()
    },
  }))

  // When slider is visible, slider values control the range; otherwise use waterfall thresholds.
  useEffect(() => {
    if (!showSlider) {
      range.current = { max: upperThreshold * -50, min: lowerThreshold * -50 }
      draw()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upperThreshold, lowerThreshold, showSlider])

  useEffect(() => {
    if (showSlider) {
      range.current = { min: sliderLow, max: sliderHigh }
      draw()
      drawPowerLegend()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sliderLow, sliderHigh, showSlider])

  function drawPowerLegend() {
    const canvas = legendCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { min, max } = range.current
    const legendH = canvas.height
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, legendH)
    ctx.font = '10px monospace'
    ctx.fillStyle = '#999999'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`${max} dB`, 2, 2)
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${min} dB`, 2, legendH - 2)
    // draw tick marks at every 10 dB
    const span = max - min || 1
    ctx.strokeStyle = '#cccccc'
    ctx.lineWidth = 1
    for (let v = Math.ceil(min / 10) * 10; v <= max; v += 10) {
      const yy = legendH - ((v - min) / span) * legendH
      ctx.beginPath()
      ctx.moveTo(0, yy)
      ctx.lineTo(canvas.width, yy)
      ctx.stroke()
      if (v !== min && v !== max) {
        ctx.fillStyle = '#666666'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${v}`, 2, yy)
      }
    }
  }

  useEffect(() => {
    const t = window.setInterval(() => setNoData(Date.now() - lastDataTime.current > 100), 250)
    const wrap = wrapRef.current
    const ro = new ResizeObserver(() => draw())
    if (wrap) ro.observe(wrap)
    return () => {
      window.clearInterval(t)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const spacer = Math.max(0, sliderWidth - 73)

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
      {showSlider ? (
        // Vertical range slider + dB legend, mirroring the waterfall slider layout
        <div
          id="es-power-slider-container"
          style={{ display: 'flex', flexDirection: 'row', height: HEIGHT, flexShrink: 0 }}
        >
          <RzSlider
            vertical
            value={sliderLow}
            high={sliderHigh}
            floor={-100}
            ceil={0}
            onChange={(lo, hi) => {
              setSliderLow(lo)
              if (hi !== undefined) setSliderHigh(hi)
            }}
            style={{ flex: '1 1 auto', width: 40 }}
          />
          <canvas
            ref={legendCanvasRef}
            id="es-power-legend-canvas"
            width={60}
            height={HEIGHT}
            style={{ display: 'block' }}
          />
        </div>
      ) : (
        <div style={{ flexBasis: spacer, minWidth: spacer, flexGrow: 0 }}>&nbsp;</div>
      )}
      <div style={{ flex: '1 0 auto', width: 100 }}>
        <div style={{ width: '100%', minHeight: HEIGHT, position: 'relative' }}>
          <div ref={wrapRef} id="power-level-chart" style={{ width: '100%' }}>
            <canvas ref={canvasRef} style={{ display: 'block' }} />
          </div>
          {noData ? (
            <div
              style={{
                zIndex: 100,
                background: 'rgba(255, 255, 255, 0.9)',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                right: 0,
                textAlign: 'center',
                paddingTop: '2em',
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
