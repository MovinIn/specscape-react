import { useEffect, useRef } from 'react'

type LiveWaterfallProps = {
  /** Latest PSD line (byte values, typically signed power). */
  line: number[] | null
  minFreq?: number
  maxFreq?: number
  height?: number
}

/**
 * Scrolling live waterfall — one PSD row scrolled in from the top each update.
 */
export function LiveWaterfall({
  line,
  minFreq = 0,
  maxFreq = 1,
  height = 240,
}: LiveWaterfallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rowRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !line?.length) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.clientWidth || 640
    if (canvas.width !== Math.floor(cssW * dpr)) {
      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#041018'
      ctx.fillRect(0, 0, cssW, height)
      rowRef.current = 0
    }

    // Scroll existing content down one row
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
    ctx.putImageData(image, 0, dpr)

    let min = Infinity
    let max = -Infinity
    for (const v of line) {
      if (v < min) min = v
      if (v > max) max = v
    }
    const span = max - min || 1

    const y = 0
    for (let x = 0; x < cssW; x++) {
      const idx = Math.min(
        line.length - 1,
        Math.floor((x / cssW) * line.length),
      )
      const t = (line[idx] - min) / span
      const r = Math.floor(10 + t * 220)
      const g = Math.floor(40 + t * 180)
      const b = Math.floor(80 + t * 120)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(x, y, 1, 1)
    }

    rowRef.current += 1
  }, [line, height])

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="leaflet-map"
        style={{ width: '100%', height, display: 'block' }}
      />
      <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
        {formatBand(minFreq)} – {formatBand(maxFreq)}
      </p>
    </div>
  )
}

function formatBand(hz: number): string {
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} MHz`
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kHz`
  return `${hz} Hz`
}
