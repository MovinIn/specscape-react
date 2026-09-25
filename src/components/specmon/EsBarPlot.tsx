import { useEffect, useRef } from 'react'
import { printHzUnit } from '../../lib/spectrum'
import type { RowData } from './waterfallEngine'

type Props = {
  /** One waterfall row (the hovered time), or null before the first hover. */
  data: RowData | null
  ylim: [number, number]
  selFreq: number | null
  onSelect: (freq: number, value: number | null) => void
}

const HEIGHT = 200
const SPACER = 5
const SPACER_BOTTOM = 40
const FONT_SIZE = 11
const OFFSET_LEFT = 79.7705078125
const BAR_SPACING = 0

type Layout = {
  plotX0: number
  plotY0: number
  plotWidth: number
  plotHeight: number
  resolution: [number, number]
  data: RowData
}

/** Port of the es-bar-plot directive (es-barplot.js). */
export function EsBarPlot({ data, ylim, selFreq, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bgRef = useRef<HTMLCanvasElement | null>(null)
  const layoutRef = useRef<Layout | null>(null)
  const onSelectRef = useRef(onSelect)
  const [ylo, yhi] = ylim

  useEffect(() => {
    onSelectRef.current = onSelect
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    if (!bgRef.current) bgRef.current = document.createElement('canvas')
    const bg = bgRef.current

    const draw = () => {
      const width = Math.max(100, wrap.clientWidth - 15)
      canvas.width = width
      canvas.height = HEIGHT
      bg.width = width
      bg.height = HEIGHT
      layoutRef.current = drawSpectrum(canvas, bg, data, [ylo, yhi])
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [data, ylo, yhi])

  // highlight the column for a frequency selected elsewhere (the waterfall)
  useEffect(() => {
    const layout = layoutRef.current
    const canvas = canvasRef.current
    if (!layout || !canvas || selFreq == null) return
    const d = layout.data
    for (let i = 0; i < d.values.length; i++) {
      if (d.startFreq + i * d.freqRes === selFreq) {
        highlightColumn(canvas, bgRef.current!, layout, i)
        return
      }
    }
  }, [selFreq, data])

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const layout = layoutRef.current
    const canvas = canvasRef.current
    if (!layout || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - (rect.left + layout.plotX0)) / layout.resolution[0])
    const d = layout.data
    if (x >= 0 && d.values.length > x) {
      const v = d.values[x]
      onSelectRef.current(d.startFreq + x * d.freqRes, typeof v === 'number' ? v : null)
      highlightColumn(canvas, bgRef.current!, layout, x)
    }
  }

  return (
    <div ref={wrapRef}>
      <canvas
        ref={canvasRef}
        id="es-barplot-container-2"
        width={1000}
        height={HEIGHT}
        style={{ textAlign: 'center' }}
        onMouseMove={onMouseMove}
      />
    </div>
  )
}

function highlightColumn(
  canvas: HTMLCanvasElement,
  bg: HTMLCanvasElement,
  layout: Layout,
  x: number,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bg, 0, 0)
  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.fillRect(layout.plotX0 + x * layout.resolution[0], layout.plotY0, layout.resolution[0], layout.plotHeight)
  ctx.restore()
}

function drawSpectrum(
  canvas: HTMLCanvasElement,
  bg: HTMLCanvasElement,
  input: RowData | null,
  ylimIn: [number, number],
): Layout | null {
  const ctx = canvas.getContext('2d')
  const bgCtx = bg.getContext('2d')
  if (!ctx || !bgCtx) return null
  const data: RowData =
    input && input.values && input.values.length > 0
      ? input
      : { startFreq: 0, values: [0], freqRes: 0 }
  const width = canvas.width
  const height = canvas.height

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.font = `${FONT_SIZE}px Verdana`
  const ylim: [number, number] = [Math.ceil(ylimIn[0]), Math.ceil(ylimIn[1])]

  let maxTickSize = ctx.measureText(String(ylim[0]))
  if (ctx.measureText(String(ylim[1])).width > maxTickSize.width) {
    maxTickSize = ctx.measureText(String(ylim[1]))
  }

  const plotX0 = FONT_SIZE + SPACER + maxTickSize.width + SPACER + 10 + OFFSET_LEFT
  const plotWidth = width - plotX0 - 5
  const plotY0 = SPACER
  let plotHeight = height - plotY0 - SPACER_BOTTOM

  const resolution: [number, number] = [
    (plotWidth - data.values.length * BAR_SPACING) / data.values.length,
    plotHeight / Math.abs(ylim[0] - ylim[1]),
  ]

  ctx.clearRect(0, 0, width, height)
  bgCtx.clearRect(0, 0, width, height)

  ctx.fillStyle = '#000000'
  ctx.save()
  ctx.translate(SPACER, height / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.fillText('SNR [dB]', SPACER, OFFSET_LEFT + SPACER)
  ctx.restore()

  // y ticks every 5 dB when the range exceeds 5 dB, otherwise every dB
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1
  let i = -1
  for (let cl = ylim[1]; cl >= Math.max(0, ylim[0]); cl--) {
    i++
    if (ylim[1] - ylim[0] > 5 && cl % 5 !== 0) continue
    const ts = ctx.measureText(String(cl))
    const extraOffset = Math.abs(ts.width - maxTickSize.width)
    const yPos = SPACER + 0.5 * FONT_SIZE + i * resolution[1] - resolution[1] / 2
    ctx.fillText(String(cl), OFFSET_LEFT + FONT_SIZE + 2 * SPACER + extraOffset, yPos + FONT_SIZE / 2 - 1)

    ctx.beginPath()
    ctx.moveTo(OFFSET_LEFT + FONT_SIZE + 2 * SPACER + maxTickSize.width + 2, yPos)
    ctx.lineTo(OFFSET_LEFT + FONT_SIZE + 3 * SPACER + maxTickSize.width + 2, yPos)
    ctx.stroke()

    ctx.save()
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.beginPath()
    ctx.moveTo(plotX0, yPos)
    ctx.lineTo(plotX0 + plotWidth, yPos)
    ctx.stroke()
    ctx.restore()
    if (yPos > plotY0 + plotHeight) plotHeight = yPos - plotY0
  }

  ctx.beginPath()
  ctx.moveTo(plotX0 - 2, SPACER + 0.5 * FONT_SIZE - resolution[1] / 2 - 1)
  ctx.lineTo(plotX0 - 2, plotHeight + plotY0)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(plotX0 + resolution[0] / 2, plotY0 + plotHeight + 2)
  ctx.lineTo(plotWidth + plotX0 - resolution[0] / 2 - 1, plotY0 + plotHeight + 2)
  ctx.stroke()

  ctx.fillStyle = '#000000'
  let lastX: number | null = null
  for (let k = 0; k < data.values.length; k++) {
    const cFreq = printHzUnit(data.startFreq + k * data.freqRes, 6)
    const ts = ctx.measureText(cFreq)
    const center = plotX0 + k * resolution[0] + resolution[0] / 2 + k * BAR_SPACING
    const xPos = center - ts.width / 2
    if ((lastX != null && lastX + 3 > xPos) || xPos + ts.width > width) continue
    ctx.beginPath()
    ctx.moveTo(center, plotY0 + plotHeight + 1)
    ctx.lineTo(center, plotY0 + plotHeight + 2 + SPACER)
    ctx.stroke()
    ctx.fillText(cFreq, xPos, plotY0 + plotHeight + SPACER + FONT_SIZE + 2)
    lastX = xPos + ts.width
  }

  const lab = ctx.measureText('Frequency')
  ctx.fillText('Frequency', plotX0 + plotWidth / 2 - lab.width / 2, plotY0 + plotHeight + 2 * SPACER + 2 * FONT_SIZE + 2)

  const gradient = ctx.createLinearGradient(0, 0, 0, plotHeight)
  gradient.addColorStop(0.72, '#000000')
  gradient.addColorStop(0.52, '#0000ff')
  gradient.addColorStop(0.32, '#00ff00')
  gradient.addColorStop(0, '#ff0000')
  ctx.fillStyle = gradient

  for (let k = 0; k < data.values.length; k++) {
    const value = data.values[k]
    if (value == null) continue
    ctx.fillRect(
      plotX0 + k * (BAR_SPACING + resolution[0]),
      plotY0 + resolution[1] * (ylim[1] - value),
      resolution[0],
      plotY0 + plotHeight - resolution[1] * (ylim[1] - value) - 5,
    )
  }

  bgCtx.drawImage(canvas, 0, 0)
  return { plotX0, plotY0, plotWidth, plotHeight, resolution, data }
}
