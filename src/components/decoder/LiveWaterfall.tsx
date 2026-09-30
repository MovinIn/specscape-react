import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { printHzUnit } from '../../lib/spectrum'
import type { PsdPayload } from '../../streaming/deser'
import { RzSlider } from '../RzSlider'
import { makeColorScale } from '../specmon/waterfallEngine'

export type LiveWaterfallHandle = {
  addPsd: (payload: PsdPayload) => void
  /** 'clearWaterfall' broadcast: reset the canvas. */
  clear: () => void
}

type Props = {
  ref?: Ref<LiveWaterfallHandle>
  enableInteraction: boolean
  showSlider: boolean
  hideTooltip: boolean
  onFreqClick: (freq: number) => void
  /** Fractions of the color legend height, bound to the power-level y axis. */
  onThresholds: (upper: number, lower: number) => void
  /** Width of the slider column; the page aligns the power chart with it. */
  onSliderWidth: (width: number) => void
}

const HEIGHT = 250

/** Port of the live-waterfall component (streaming/live-waterfall.js). */
export function LiveWaterfall(props: Props) {
  const { ref, enableInteraction, showSlider, hideTooltip } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const legendRef = useRef<HTMLCanvasElement>(null)
  const colorLegendRef = useRef<HTMLCanvasElement>(null)
  const sliderColRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const propsRef = useRef(props)
  const [colorProp, setColorProp] = useState(-50)
  const [colorPropHigh, setColorPropHigh] = useState(0)
  const [hoverFreq, setHoverFreq] = useState<number | null>(null)
  const [noData, setNoData] = useState(true)

  // mutable drawing state, as on the legacy controller
  const st = useRef({
    width: 300,
    currentLine: 0,
    minFreq: 101e6 - 1.2e6,
    maxFreq: 101e6 + 1.2e6,
    stretch: 1,
    dataLength: 300,
    res: 0,
    lastDataTime: 0,
    colors: makeColorScale(-50, 0),
  })

  useEffect(() => {
    propsRef.current = props
  })

  function drawLegend() {
    const ctx = legendRef.current?.getContext('2d')
    if (!ctx) return
    const s = st.current
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, s.width, 100)
    const spacer = 5
    const fontSize = 11
    ctx.font = `${fontSize}px monospace`
    ctx.strokeStyle = 'rgba(0, 0, 0)'
    ctx.lineWidth = 1
    ctx.fillStyle = '#000000'

    let lastX: number | null = null
    for (let i = 0; i < s.width; i++) {
      const cFreq = printHzUnit(s.minFreq + i * s.res, 6)
      const ts = ctx.measureText(cFreq)
      if (lastX != null && (lastX + 2 * spacer > i || i + ts.width > s.width)) continue
      ctx.fillText(cFreq, i - 1, fontSize + 2)
      ctx.beginPath()
      ctx.moveTo(i, fontSize + spacer + 1)
      ctx.lineTo(i, fontSize + 2 * spacer + 2)
      ctx.stroke()
      lastX = i + ts.width
    }
  }

  function updateLegend() {
    const s = st.current
    s.stretch = s.width / s.dataLength
    s.res = ((1 / s.stretch) * (s.maxFreq - s.minFreq)) / s.dataLength
    drawLegend()
  }

  function onResize() {
    const canvas = canvasRef.current
    const legend = legendRef.current
    if (!canvas || !legend) return
    const s = st.current
    s.width = Math.max(1, Math.floor((canvas.parentElement as HTMLElement).clientWidth))
    canvas.width = s.width
    legend.width = s.width
    s.currentLine = 0
    updateLegend()
  }

  function addLine(data: number[]) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const s = st.current
    if (data.length !== s.dataLength) {
      s.dataLength = data.length
      onResize()
    }
    const draw = (y: number) => {
      for (let i = 0; i < data.length; i++) {
        ctx.fillStyle = s.colors(data[i])
        // legacy draws (i-1)*stretch wide rects that later bins overwrite
        ctx.fillRect((i - 1) * s.stretch, y, i * s.stretch, 1)
      }
    }
    if (s.currentLine < HEIGHT) {
      draw(s.currentLine++)
    } else {
      const current = ctx.getImageData(0, 0, s.width, HEIGHT)
      ctx.putImageData(current, 0, -1)
      draw(HEIGHT - 1)
    }
  }

  useImperativeHandle(ref, () => ({
    addPsd(p: PsdPayload) {
      const canvas = canvasRef.current
      if (!canvas) return
      const s = st.current
      // resize after the waterfall was sized while hidden
      if (s.width !== Math.floor((canvas.parentElement as HTMLElement).clientWidth)) onResize()
      s.lastDataTime = Date.now()
      setNoData(false)
      addLine(p.data)
      s.minFreq = p.minFreq
      s.maxFreq = p.maxFreq
      s.dataLength = p.data.length
      updateLegend()
    },
    clear() {
      onResize()
    },
  }))

  useEffect(() => {
    onResize()
    const t = window.setInterval(() => setNoData(Date.now() - st.current.lastDataTime > 100), 1000)
    const onWin = () => onResize()
    window.addEventListener('resize', onWin)
    return () => {
      window.clearInterval(t)
      window.removeEventListener('resize', onWin)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // updateColor + drawColorLegend: also derives the power-chart y-range thresholds
  useEffect(() => {
    st.current.colors = makeColorScale(colorProp, colorPropHigh)
    const canvas = colorLegendRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const colors = st.current.colors
    const valQ1 = colorProp
    const valMax = colorPropHigh
    const legendHeight = canvas.height
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, legendHeight)
    const textX = 35
    const txt = '0 dB/Hz'
    ctx.fillStyle = '#999999'
    const m = ctx.measureText(txt)
    const ascent = m.fontBoundingBoxAscent || 10
    ctx.fillText(txt, textX, ascent)
    ctx.fillText('-50 dB/Hz', textX, legendHeight)

    let upper = 0
    let lower = 1
    let upperDrawn = false
    let lowerDrawn = false
    for (let i = 0; i < legendHeight; i++) {
      const v = 0 - (50 / legendHeight) * i
      if (v < valMax && !upperDrawn && valMax < 0) {
        ctx.fillStyle = '#000000'
        ctx.fillText(`${valMax} dB`, textX, Math.max(ascent * 2, i + ascent / 2))
        upperDrawn = true
        upper = i / legendHeight
      } else if (v < valQ1 && !lowerDrawn) {
        ctx.fillStyle = '#000000'
        ctx.fillText(`${valQ1} dB`, textX, Math.min(legendHeight - ascent, i + ascent / 2))
        lowerDrawn = true
        ctx.fillStyle = '#ffffff'
        lower = i / legendHeight
      } else {
        ctx.fillStyle = colors(v)
      }
      ctx.fillRect(10, i, 20, 1)
    }
    propsRef.current.onThresholds(upper, lower)
  }, [colorProp, colorPropHigh])

  useEffect(() => {
    const col = sliderColRef.current
    if (!col) return
    const ro = new ResizeObserver(() => propsRef.current.onSliderWidth(showSlider ? col.offsetWidth : 0))
    ro.observe(col)
    return () => ro.disconnect()
  }, [showSlider])

  function mousePos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const tip = tooltipRef.current
    if (tip) {
      tip.style.display = 'block'
      tip.style.left = `${e.clientX + 15}px`
      tip.style.top = `${e.clientY}px`
    }
    const s = st.current
    setHoverFreq(Math.floor(s.minFreq + s.res * mousePos(e).x))
  }

  function onMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!enableInteraction) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const s = st.current
    const { x } = mousePos(e)
    // move the current spectrum so the clicked frequency is centred
    const newX = s.width / 2 - x
    const cdata = ctx.getImageData(0, 0, s.width, HEIGHT)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, s.width, s.currentLine)
    ctx.putImageData(cdata, newX - 1, 0)

    const newFreq = Math.floor(s.minFreq + s.res * x)
    s.minFreq = newFreq - (s.res * s.width) / 2
    s.maxFreq = newFreq + (s.res * s.width) / 2
    drawLegend()
    propsRef.current.onFreqClick(newFreq)
  }

  return (
    <>
      <div className="row">
        <div
          ref={sliderColRef}
          className={showSlider ? 'col-sm-1' : 'col-sm-0 hidden'}
          id="es-waterfall-slider-container"
        >
          <div style={{ display: 'flex', flexDirection: 'row', height: HEIGHT }}>
            <RzSlider
              vertical
              value={colorProp}
              high={colorPropHigh}
              floor={-50}
              ceil={0}
              onChange={(lo, hi) => {
                setColorProp(lo)
                if (hi !== undefined) setColorPropHigh(hi)
              }}
              style={{ flex: '1 1 auto' }}
            />
            <canvas ref={colorLegendRef} id="es-color-legend-container" width={80} height={HEIGHT} />
          </div>
        </div>
        <div className={showSlider ? 'col-sm-11' : 'col-sm-12'}>
          <div style={{ width: '100%', minHeight: HEIGHT }}>
            <canvas
              ref={legendRef}
              id="es-waterfall-legend-1"
              height={25}
              style={{ backgroundColor: '#ffffff', marginBottom: 0, display: 'block' }}
            />
            <canvas
              ref={canvasRef}
              id="es-streaming-waterfall-1"
              height={HEIGHT}
              style={{ backgroundColor: '#ffffff', textAlign: 'center', marginTop: 0, display: 'block' }}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseOut={() => {
                if (tooltipRef.current) tooltipRef.current.style.display = 'none'
              }}
            />
            {noData ? (
              <div
                style={{
                  zIndex: 100,
                  background: 'rgba(255, 255, 255, 0.9)',
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  textAlign: 'center',
                  paddingTop: '2em',
                }}
              >
                <div className="lds-ripple">
                  <div />
                  <div />
                </div>
                <h3>Waiting for data</h3>
                <p>Please stand by, changing decoder settings sometimes takes up to 15 seconds.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        ref={tooltipRef}
        id="es-waterfall-tooltip"
        className={hideTooltip ? 'hide' : undefined}
        style={{
          display: 'none',
          position: 'fixed',
          zIndex: 400,
          border: '1px solid #000000',
          background: '#e7f0f7',
          opacity: 0.9,
          padding: 2,
          fontSize: '10pt',
          fontWeight: 'bold',
          fontFamily: 'monospace',
        }}
      >
        {printHzUnit(hoverFreq ?? 0, 6)}
      </div>
    </>
  )
}
