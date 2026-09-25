import { printDate, printHzUnit } from '../../lib/spectrum'

/** Port of the es-waterfall component's drawing and mouse logic (es-waterfall.js). */

export type WaterfallData = {
  startFreq: number
  startTime: number
  freqRes: number
  timeRes: number
  values: (number | null)[][]
  maxFreq?: number
  maxTime?: number
  noiseFloor?: number
}

export type RowData = {
  startFreq: number
  maxFreq?: number
  freqRes: number
  values: (number | null)[]
}

export type WaterfallCallbacks = {
  onSelect: (sel: { freq: number; time: Date; snr: number | null } | null) => void
  onRowData: (row: RowData) => void
  onZoom: (startFreq: number, maxFreq: number, startTime: number, maxTime: number) => void
  onBboxChange: (startFreq: number, maxFreq: number, startTime: number, maxTime: number) => void
  onHint: (message: string) => void
  onMaxNumVals: (vals: [number, number]) => void
}

export const WATERFALL_HEIGHT = 490

const STOPS: [number, number, number][] = [
  [0, 0, 0],
  [0, 0, 255],
  [0, 255, 0],
  [255, 0, 0],
]

/** chroma.scale(black, blue, green, red).domain([q1, q2, q3, max]) with the legacy quartiles. */
export function makeColorScale(low: number, high: number): (v: number) => string {
  const range = high - low
  const domain = [low, high - (2 * range) / 3, high - range / 3, high]
  return (v: number) => {
    let c: [number, number, number]
    if (!(range > 0) || v >= domain[3]) c = STOPS[3]
    else if (v <= domain[0]) c = STOPS[0]
    else {
      let i = 0
      while (v > domain[i + 1]) i++
      const t = (v - domain[i]) / (domain[i + 1] - domain[i])
      const a = STOPS[i]
      const b = STOPS[i + 1]
      c = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
    }
    return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
  }
}

function hasValues(d: WaterfallData | null): d is WaterfallData {
  return d != null && Array.isArray(d.values) && d.values.length >= 1
}

export class WaterfallEngine {
  private ctx: CanvasRenderingContext2D
  private dataCtx: CanvasRenderingContext2D
  private backgroundCanvas = document.createElement('canvas')
  private backgroundCtx: CanvasRenderingContext2D

  private width = 1000
  private height = WATERFALL_HEIGHT

  private plotX0 = 0
  private plotY0 = 0
  private plotWidth = 0
  private plotHeight = 0
  private resolution: [number, number] = [0, 0]

  private currentData: WaterfallData | null = null
  private dataReady = false

  private mouseDragging = false
  private mouseZooming = false
  private dragXRight = true
  private selectedX: number[] = []
  private dragAnchor: number[][] = []
  private dragData: WaterfallData | null = null

  private colorlow = -50
  private colorhigh = 40

  isError = false
  noMoveEvent = false
  noZoomEvent = false

  private lastScroll = 0
  private intervals = new Set<number>()

  private canvas: HTMLCanvasElement
  private dataCanvas: HTMLCanvasElement
  private cb: WaterfallCallbacks

  constructor(canvas: HTMLCanvasElement, dataCanvas: HTMLCanvasElement, cb: WaterfallCallbacks) {
    this.canvas = canvas
    this.dataCanvas = dataCanvas
    this.cb = cb
    this.ctx = canvas.getContext('2d')!
    this.dataCtx = dataCanvas.getContext('2d')!
    this.backgroundCtx = this.backgroundCanvas.getContext('2d')!
    this.height = canvas.height
    // Ctrl+wheel must never zoom the browser page while over the plot.
    canvas.addEventListener('wheel', this.blockBrowserZoom, { passive: false })
  }

  destroy() {
    this.enableInteraction(false)
    this.canvas.removeEventListener('wheel', this.blockBrowserZoom)
    this.intervals.forEach((id) => window.clearInterval(id))
    this.intervals.clear()
  }

  /** Align canvas size with the container width (resizeCanvas). */
  resize(parentWidth: number) {
    this.width = Math.max(100, Math.floor(parentWidth) - 15)
    for (const c of [this.canvas, this.backgroundCanvas, this.dataCanvas]) {
      c.width = this.width
      c.height = this.height
    }
    this.drawData(this.currentData)
  }

  setData(data: WaterfallData | null) {
    this.drawData(data)
  }

  /** Slider values are hundredths of a dB, as in the legacy rzslider binding. */
  setColors(lowHundredths: number, highHundredths: number) {
    this.colorlow = lowHundredths / 100
    this.colorhigh = highHundredths / 100
    this.drawData(this.currentData)
  }

  setLoading(loading: boolean) {
    this.noZoomEvent = loading
    this.enableInteraction(!loading)
  }

  private blockBrowserZoom = (event: WheelEvent) => {
    if (event.ctrlKey) event.preventDefault()
  }

  private getMousePos(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: event.clientX - (rect.left + this.plotX0),
      y: event.clientY - (rect.top + this.plotY0),
    }
  }

  private restoreBackground() {
    this.ctx.fillStyle = '#ffffff'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.ctx.drawImage(this.backgroundCanvas, 0, 0)
  }

  private canvasMouseMove = (event: MouseEvent) => {
    if (this.isError || this.noMoveEvent) return
    const d = this.currentData
    if (!hasValues(d)) return
    const res = this.resolution
    const mousePos = this.getMousePos(event)
    let x = Math.floor(mousePos.x / res[0])
    let y = Math.floor(mousePos.y / res[1])

    if (this.mouseDragging && !this.mouseZooming) {
      if (this.dragAnchor.length < 2) {
        // anchor on drag start; keep the resolution, which each draw updates
        this.dragAnchor.push([x, y, res[0], res[1]])
        this.dragAnchor.push([x, y, res[0], res[1]])
        this.dragData = null
        return
      }
      x = Math.floor(mousePos.x / this.dragAnchor[0][2])
      y = Math.floor(mousePos.y / this.dragAnchor[0][3])
      this.dragAnchor[1] = [x, y]

      const deltaF = this.dragAnchor[0][0] - this.dragAnchor[1][0]
      const deltaT = this.dragAnchor[0][1] - this.dragAnchor[1][1]

      let newStartFreq = d.startFreq + deltaF * d.freqRes
      let newStartTime = d.startTime + deltaT * d.timeRes
      let newMaxFreq = newStartFreq + d.values[0].length * d.freqRes
      let newMaxTime = newStartTime + d.values.length * d.timeRes

      if (newStartFreq < 0) {
        newStartFreq = 0
        newMaxFreq = newStartFreq + d.values[0].length * d.freqRes
      }
      const nowSec = Date.now() / 1000
      if (newMaxTime > nowSec) {
        newMaxTime = Number(nowSec.toFixed(0))
        newStartTime = newMaxTime - d.values.length * d.timeRes
      }

      const newVals: WaterfallData = {
        startFreq: newStartFreq,
        freqRes: d.freqRes,
        startTime: newStartTime,
        timeRes: d.timeRes,
        noiseFloor: d.noiseFloor,
        maxFreq: newMaxFreq,
        maxTime: newMaxTime,
        // same matrix: its shape drives the axes while dragging
        values: d.values,
      }
      this.dragData = newVals

      this.drawAxes(newVals)
      this.drawDataImage([this.plotX0 - res[0] * deltaF, this.plotY0 - res[1] * deltaT])
    } else if (this.mouseDragging && this.mouseZooming) {
      if (this.selectedX.length < 2) {
        this.selectedX.push(x)
        this.selectedX.push(x)
      }
      this.dragXRight = x > this.selectedX[0]
      this.selectedX[this.dragXRight ? 1 : 0] = x

      this.restoreBackground()
      this.ctx.save()
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      this.ctx.fillRect(
        this.plotX0 + this.selectedX[0] * res[0],
        this.plotY0,
        Math.max(1, this.selectedX[1] - this.selectedX[0]) * res[0],
        this.plotHeight,
      )
      this.ctx.restore()
    } else if (x >= 0 && y >= 0 && d.values.length > y && d.values[y].length > x) {
      const v = d.values[y][x]
      this.cb.onSelect({
        freq: d.startFreq + x * d.freqRes,
        time: new Date((d.startTime + y * d.timeRes) * 1000),
        snr: typeof v === 'number' ? v : null,
      })
      this.cb.onRowData({
        startFreq: d.startFreq,
        maxFreq: d.maxFreq,
        freqRes: d.freqRes,
        values: d.values[y],
      })

      this.restoreBackground()
      this.ctx.save()
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      this.ctx.fillRect(this.plotX0, this.plotY0 + y * res[1], this.plotWidth, res[1])
      this.ctx.restore()
    }
  }

  /** Magenta overlay over a frequency range (band label hover). */
  highlightFreqRange(minFreq: number, maxFreq: number) {
    const d = this.currentData
    if (!hasValues(d) || !this.dataReady) {
      this.clearPlot()
      return
    }
    let x0 = this.plotX0 + ((minFreq - d.startFreq) / d.freqRes) * this.resolution[0]
    if (x0 < this.plotX0) x0 = this.plotX0
    const x1 = this.plotX0 + ((maxFreq - d.startFreq) / d.freqRes) * this.resolution[0]

    const ctx = this.ctx
    ctx.save()
    ctx.globalAlpha = 1.0
    ctx.drawImage(this.dataCanvas, this.plotX0, this.plotY0)
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255, 0, 255, 1.0)'
    ctx.fillStyle = 'rgba(255, 0, 255, 0.4)'
    ctx.beginPath()
    ctx.rect(x0, this.plotY0 - 15, x1 - x0, this.plotHeight + 15)
    ctx.stroke()
    ctx.fillRect(x0, this.plotY0 - 15, x1 - x0, this.plotHeight + 15)
    ctx.restore()
  }

  zoomFreqRange(minFreq: number, maxFreq: number) {
    const d = this.currentData
    if (!hasValues(d)) return
    this.cb.onZoom(
      Math.trunc(minFreq),
      Math.trunc(maxFreq),
      Math.trunc(d.startTime),
      d.startTime + d.timeRes * (d.values.length - 1),
    )
  }

  private canvasMouseDown = (event: MouseEvent) => {
    if (this.isError || this.noZoomEvent) return
    this.mouseDragging = true
    this.mouseZooming = event.shiftKey
  }

  private canvasMouseUp = () => {
    const d = this.currentData
    if (this.mouseDragging && !this.mouseZooming && this.dragData) {
      const dd = this.dragData
      this.currentData = dd
      this.cb.onBboxChange(dd.startFreq, dd.maxFreq ?? 0, dd.startTime, dd.maxTime ?? 0)
    } else if (this.mouseDragging && this.mouseZooming && hasValues(d)) {
      if (this.noZoomEvent) return
      const startFreq = d.startFreq + this.selectedX[0] * d.freqRes
      const maxFreq = d.startFreq + this.selectedX[1] * d.freqRes
      this.cb.onZoom(
        startFreq,
        maxFreq,
        d.startTime,
        d.startTime + d.timeRes * (d.values.length - 1),
      )
    }
    this.mouseDragging = false
    this.dragAnchor = []
    this.selectedX = []
    this.dragData = null
  }

  private canvasMouseOut = () => {
    this.cb.onSelect(null)
  }

  /** lodash debounce(fn, 1000, {leading: true, trailing: false}) */
  private canvasMouseScroll = (event: WheelEvent) => {
    const now = Date.now()
    const quiet = now - this.lastScroll >= 1000
    this.lastScroll = now
    if (!quiet) return
    this.onScroll(event)
  }

  private onScroll(event: WheelEvent) {
    if (this.isError) return
    const d = this.currentData
    if (!hasValues(d)) return

    if (!event.ctrlKey) {
      this.cb.onHint('Press <Ctrl> while scrolling to zoom the spectrum')
      return
    }
    event.preventDefault()

    const mousePos = this.getMousePos(event)
    const x = Math.floor(mousePos.x / this.resolution[0])
    const cols = d.values[0].length
    let zFacFreq = 3
    let newStartFreq: number
    let newMaxFreq: number

    if (event.deltaY < 0) {
      if (d.freqRes === 10000) return
      zFacFreq *= -1
      newMaxFreq = d.startFreq + (x - cols / zFacFreq / 2) * d.freqRes
      newStartFreq = newMaxFreq + (cols / zFacFreq) * d.freqRes
      this.animate(5, 20, (cnt, steps) => {
        this.ctx.drawImage(
          this.dataCanvas,
          mousePos.x + this.plotX0 - 10 * zFacFreq * this.resolution[0],
          0,
          this.plotWidth / (zFacFreq * (cnt / steps)),
          this.plotHeight,
          this.plotX0,
          this.plotY0,
          this.plotWidth,
          this.plotHeight,
        )
      })
    } else {
      if (d.freqRes === 10000000 && d.startFreq === 20000000) return
      if (d.freqRes === 10000000) {
        newStartFreq = 0
        newMaxFreq = 11800000000
      } else {
        newStartFreq = d.startFreq - x * zFacFreq * d.freqRes
        newMaxFreq = d.startFreq + (cols * zFacFreq - x * zFacFreq) * d.freqRes
      }
      this.animate(5, 20, () => {
        this.drawAxes(d)
        this.ctx.drawImage(
          this.dataCanvas,
          0,
          0,
          this.plotWidth,
          this.plotHeight,
          this.plotX0 + mousePos.x,
          this.plotY0,
          this.plotWidth / zFacFreq,
          this.plotHeight,
        )
      })
    }

    this.zoomFreqRange(newStartFreq, newMaxFreq)
  }

  /** The legacy "poor-man's" zoom animation. */
  private animate(steps: number, speed: number, frame: (cnt: number, steps: number) => void) {
    this.enableInteraction(false)
    this.ctx.globalAlpha = 0.5
    let cnt = 1
    const id = window.setInterval(() => {
      frame(cnt, steps)
      this.backgroundCtx.drawImage(this.canvas, 0, 0)
      if (++cnt > steps) {
        window.clearInterval(id)
        this.intervals.delete(id)
        this.enableInteraction(true)
      }
    }, speed)
    this.intervals.add(id)
  }

  private enableInteraction(enabled: boolean) {
    const c = this.canvas
    c.removeEventListener('mousemove', this.canvasMouseMove)
    c.removeEventListener('mousedown', this.canvasMouseDown)
    c.removeEventListener('mouseup', this.canvasMouseUp)
    c.removeEventListener('mouseleave', this.canvasMouseUp)
    c.removeEventListener('wheel', this.canvasMouseScroll)
    c.removeEventListener('mouseout', this.canvasMouseOut)
    if (enabled) {
      c.addEventListener('mouseout', this.canvasMouseOut)
      c.addEventListener('mousemove', this.canvasMouseMove)
      c.addEventListener('mousedown', this.canvasMouseDown)
      c.addEventListener('mouseup', this.canvasMouseUp)
      c.addEventListener('mouseleave', this.canvasMouseUp)
      c.addEventListener('wheel', this.canvasMouseScroll, { passive: false })
    }
  }

  /** Axes with ticks and labels: Time (y) and Frequency (x). */
  private drawAxes(data: WaterfallData) {
    const ctx = this.ctx
    const spacer = 5
    const spacerBottom = 70
    const fontSize = 11
    ctx.font = `${fontSize}px Verdana`
    ctx.strokeStyle = 'rgba(0, 0, 0)'
    ctx.lineWidth = 1

    let maxTickSize = ctx.measureText(printDate(new Date(data.startTime * 1000)))
    for (let i = 0; i < data.values.length; i++) {
      const ts = ctx.measureText(printDate(new Date((data.startTime + data.timeRes * i) * 1000)))
      if (ts.width > maxTickSize.width) maxTickSize = ts
    }

    this.plotX0 = fontSize + spacer + maxTickSize.width + spacer + 5
    this.plotWidth = this.width - this.plotX0 - 5
    this.plotY0 = spacer
    this.plotHeight = this.height - this.plotY0 - spacerBottom
    const { plotX0, plotY0, plotWidth, plotHeight, width, height } = this

    ctx.clearRect(0, 0, width, height)
    this.backgroundCtx.clearRect(0, 0, width, height)

    // y axis is time, x axis is frequency
    this.resolution[1] = plotHeight / data.values.length
    const maxLineLength = data.values.reduce((max, v) => (v.length > max ? v.length : max), 0)
    this.resolution[0] = Math.max(plotWidth / maxLineLength, 1)
    const res = this.resolution

    ctx.fillStyle = '#000000'

    ctx.save()
    ctx.translate(spacer, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillText('Time', spacer, spacer)
    ctx.restore()

    // at most 13 time ticks
    const tickMod = Math.max(1, Math.floor(data.values.length / 13))
    for (let i = 0; i < data.values.length; i++) {
      if (i % tickMod !== 0 && i !== data.values.length - 1) continue
      const cTime = new Date((data.startTime + data.timeRes * i) * 1000)
      const yPos = spacer + (i + 1) * res[1] - 0.5 * res[1]
      ctx.fillText(printDate(cTime), fontSize + spacer, yPos + 0.5 * fontSize)
      ctx.beginPath()
      ctx.moveTo(fontSize + spacer + maxTickSize.width + 2, yPos)
      ctx.lineTo(fontSize + 2 * spacer + maxTickSize.width + 2, yPos)
      ctx.stroke()
    }

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(plotX0, plotY0, plotWidth, plotHeight)

    ctx.beginPath()
    ctx.moveTo(plotX0 - 2, spacer + 0.5 * fontSize - 0.5 * res[1])
    ctx.lineTo(plotX0 - 2, plotHeight + plotY0 - 0.5 * res[1])
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(plotX0 + res[0] / 2, plotY0 + plotHeight + 2)
    ctx.lineTo(plotWidth + plotX0 - res[0] / 2 - 1, plotY0 + plotHeight + 2)
    ctx.stroke()

    // frequency ticks, skipped where they would collide
    ctx.fillStyle = '#000000'
    let lastX: number | null = null
    for (let i = 0; i < data.values[0].length; i++) {
      const cFreq = printHzUnit(data.startFreq + i * data.freqRes, 6)
      const ts = ctx.measureText(cFreq)
      const xPos = plotX0 + i * res[0] + res[0] / 2 - ts.width / 2
      if ((lastX != null && lastX + 3 > xPos) || xPos + ts.width > width) continue
      ctx.beginPath()
      ctx.moveTo(plotX0 + i * res[0] + res[0] / 2, plotY0 + plotHeight + 1)
      ctx.lineTo(plotX0 + i * res[0] + res[0] / 2, plotY0 + plotHeight + 2 + spacer)
      ctx.stroke()
      ctx.fillText(cFreq, xPos, plotY0 + plotHeight + spacer + fontSize + 2)
      lastX = xPos + ts.width
    }

    const ts = ctx.measureText('Frequency')
    const xLabY = plotY0 + plotHeight + 2 * spacer + 2 * fontSize + 2
    ctx.fillText('Frequency', plotX0 + plotWidth / 2 - ts.width / 2, xLabY)
  }

  /** Draw the data canvas into the plot; `imgCoords` offsets it while dragging. */
  private drawDataImage(imgCoords: [number, number] | null) {
    if (!this.dataReady) {
      this.clearPlot()
      return
    }
    const ctx = this.ctx
    if (imgCoords) {
      ctx.globalAlpha = 0.6
      let dx: number, dy: number, sx: number, sy: number
      if (imgCoords[0] < this.plotX0) {
        dx = this.plotX0
        sx = this.plotX0 - imgCoords[0]
      } else {
        dx = imgCoords[0]
        sx = 0
      }
      if (imgCoords[1] < this.plotY0) {
        dy = this.plotY0
        sy = -imgCoords[1]
      } else {
        dy = imgCoords[1]
        sy = 0
      }
      const sWidth = this.plotWidth
      const sHeight = this.plotHeight - imgCoords[1]
      if (sWidth > 0 && sHeight > 0) {
        ctx.drawImage(this.dataCanvas, sx, sy, sWidth, sHeight, dx, dy, sWidth, sHeight)
      }
    } else {
      ctx.globalAlpha = 1.0
      ctx.drawImage(this.dataCanvas, this.plotX0, this.plotY0)
    }
    this.backgroundCtx.drawImage(this.canvas, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  /** Paint every cell into the hidden data canvas at the current resolution. */
  private updateSpectrumData(data: WaterfallData) {
    const colors = makeColorScale(this.colorlow, this.colorhigh)
    const dctx = this.dataCtx
    const res = this.resolution
    dctx.clearRect(0, 0, this.width, this.height)
    for (let t = 0; t < data.values.length; t++) {
      const row = data.values[t]
      for (let i = 0; i < row.length; i++) {
        const value = row[i]
        if (value == null) continue
        dctx.fillStyle = colors(value)
        dctx.fillRect(i * res[0], t * res[1], res[0] + 1, res[1] + 1)
      }
    }
    this.dataReady = true
  }

  redraw = () => {
    this.ctx.globalAlpha = 1.0
    this.enableInteraction(false)
    if (!hasValues(this.currentData)) {
      this.clearPlot()
      return
    }
    this.enableInteraction(true)
    this.drawAxes(this.currentData)
    this.drawDataImage(null)
  }

  private drawData(data: WaterfallData | null) {
    // a zoom animation still running would paint the old image over new data
    this.intervals.forEach((id) => window.clearInterval(id))
    this.intervals.clear()
    this.ctx.globalAlpha = 1.0
    this.enableInteraction(false)
    this.currentData = data
    if (!hasValues(data)) {
      this.dataReady = false
      this.clearPlot()
      return
    }
    this.enableInteraction(true)
    // drawAxes must run first: it computes the plot area and resolution
    this.drawAxes(data)
    this.updateSpectrumData(data)
    this.redraw()
    this.cb.onMaxNumVals([Math.floor(this.plotWidth), Math.floor(this.plotHeight)])
  }

  private clearPlot() {
    this.ctx.clearRect(0, 0, this.width, this.height)
    this.backgroundCtx.clearRect(0, 0, this.width, this.height)
  }
}

/** Vertical color legend next to the color slider (drawColorLegend). */
export function drawColorLegend(
  canvas: HTMLCanvasElement,
  lowHundredths: number,
  highHundredths: number,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const scaleMax = 40
  const scaleMin = -50
  const colorlow = lowHundredths / 100
  const colorhigh = highHundredths / 100
  const valQ1 = colorlow
  const valMax = colorhigh
  const colors = makeColorScale(colorlow, colorhigh)

  const legendHeight = canvas.height
  const legendWidth = canvas.width
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, legendWidth, legendHeight)

  const textX = 35
  const txt = `${scaleMax} dB`
  ctx.fillStyle = '#999999'
  const m = ctx.measureText(txt)
  const ascent = m.fontBoundingBoxAscent || 10
  ctx.fillText(txt, textX, ascent)
  ctx.fillText(`${scaleMin} dB`, textX, legendHeight)

  const range = scaleMax - scaleMin
  let upperLabelDrawn = false
  let lowerLabelDrawn = false
  for (let i = 0; i < legendHeight; i++) {
    const v = scaleMax - (range / legendHeight) * i
    if (v < valMax && !upperLabelDrawn && valMax < scaleMax) {
      ctx.fillStyle = '#000000'
      ctx.fillText(`${valMax} dB`, textX, Math.max(ascent * 2, i + ascent / 2))
      upperLabelDrawn = true
    } else if (v < valQ1 && !lowerLabelDrawn) {
      ctx.fillStyle = '#000000'
      ctx.fillText(`${valQ1} dB`, textX, Math.min(legendHeight - ascent, i + ascent / 2))
      lowerLabelDrawn = true
      ctx.fillStyle = '#ffffff'
    } else {
      ctx.fillStyle = colors(v)
    }
    ctx.fillRect(10, i, 20, 1)
  }
}
