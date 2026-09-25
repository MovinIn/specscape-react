import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { SpectrumBand } from '../../api/types'
import { formatHz } from '../../lib/spectrum'
import {
  WATERFALL_HEIGHT,
  WaterfallEngine,
  drawColorLegend,
  type RowData,
  type WaterfallCallbacks,
  type WaterfallData,
} from './waterfallEngine'

/** IEEE bands shown when the API returns no usable allocation overlay. */
const GENERIC_BANDS: SpectrumBand[] = [
  { freqMin: 3000000, freqMax: 30000000, label: 'HF' },
  { freqMin: 30000000, freqMax: 300000000, label: 'VHF' },
  { freqMin: 300000000, freqMax: 1000000000, label: 'UHF' },
  { freqMin: 1000000000, freqMax: 2000000000, label: 'L' },
]

const SLIDER_FLOOR = -5000
const SLIDER_CEIL = 4000

type Props = {
  data: WaterfallData | null
  bands?: { categories?: SpectrumBand[]; applications?: SpectrumBand[] } | null
  /** Color thresholds in hundredths of a dB (legacy colorprops.median / high). */
  colorLow: number
  colorHigh: number
  onColorChange: (low: number, high: number) => void
  loading: boolean
  isError: boolean
  message: string
  noMoveEvent: boolean
  selFreq: number | null
  onSelect: WaterfallCallbacks['onSelect']
  onRowData: (row: RowData) => void
  onZoom: WaterfallCallbacks['onZoom']
  onBboxChange: WaterfallCallbacks['onBboxChange']
  onMaxNumVals: WaterfallCallbacks['onMaxNumVals']
}

/**
 * Port of the es-waterfall component: band labels, color slider + legend,
 * and the time x frequency waterfall with drag-to-pan, Shift+drag zoom and
 * Ctrl+scroll zoom.
 */
export function EsWaterfall(props: Props) {
  const { data, bands, colorLow, colorHigh, loading, isError, message, noMoveEvent, selFreq } = props
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataCanvasRef = useRef<HTMLCanvasElement>(null)
  const legendRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<WaterfallEngine | null>(null)
  const propsRef = useRef(props)
  const [hint, setHint] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
  const [hoverBand, setHoverBand] = useState<string | null>(null)

  useEffect(() => {
    propsRef.current = props
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const dataCanvas = dataCanvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !dataCanvas || !wrap) return
    let hintTimer: number | undefined
    const engine = new WaterfallEngine(canvas, dataCanvas, {
      onSelect: (sel) => propsRef.current.onSelect(sel),
      onRowData: (row) => propsRef.current.onRowData(row),
      onZoom: (...a) => propsRef.current.onZoom(...a),
      onBboxChange: (...a) => propsRef.current.onBboxChange(...a),
      onMaxNumVals: (v) => propsRef.current.onMaxNumVals(v),
      onHint: (msg) => {
        setHint(msg)
        window.clearTimeout(hintTimer)
        hintTimer = window.setTimeout(() => setHint(null), 1000)
      },
    })
    engineRef.current = engine
    const ro = new ResizeObserver(() => engine.resize(wrap.clientWidth))
    ro.observe(wrap)
    return () => {
      ro.disconnect()
      window.clearTimeout(hintTimer)
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    engineRef.current?.setData(data)
  }, [data])

  useEffect(() => {
    engineRef.current?.setColors(colorLow, colorHigh)
    if (legendRef.current) drawColorLegend(legendRef.current, colorLow, colorHigh)
  }, [colorLow, colorHigh])

  useEffect(() => {
    engineRef.current?.setLoading(loading)
  }, [loading])

  useEffect(() => {
    if (engineRef.current) engineRef.current.isError = isError
  }, [isError])

  useEffect(() => {
    if (engineRef.current) engineRef.current.noMoveEvent = noMoveEvent
  }, [noMoveEvent])

  const hasData = data != null && data.values.length > 0
  const shownMessage = hint ?? (message || (hasData ? '' : 'No Data'))

  // the legacy template's three mutually exclusive label sets
  const cats = bands?.categories
  const apps = bands?.applications
  let labels: SpectrumBand[] = []
  if (bands != null && cats != null && apps != null && cats.length < 20 && apps.length >= 20) labels = cats
  if (bands != null && apps != null && apps.length < 20) labels = apps
  if (bands == null || (apps != null && cats != null && apps.length >= 20 && cats.length >= 20)) {
    labels = GENERIC_BANDS
  }

  return (
    <div style={{ position: 'relative' }}>
      <div id="es-specmap-labels">
        {labels.map((band, idx) => {
          const key = `${band.label}-${band.freqMin}-${idx}`
          const min = band.freqMin ?? 0
          const max = band.freqMax ?? 0
          const active = selFreq != null && selFreq >= min && selFreq <= max
          return (
            <span key={key} style={{ position: 'relative', display: 'inline-block' }}>
              <span
                className={`freq-label ${active ? 'label-success' : 'label-primary'}`}
                onMouseOver={() => {
                  setHoverBand(key)
                  engineRef.current?.highlightFreqRange(min, max)
                }}
                onMouseLeave={() => {
                  setHoverBand(null)
                  engineRef.current?.redraw()
                }}
                onClick={() => engineRef.current?.zoomFreqRange(min, max)}
              >
                {band.label}
              </span>
              {active || hoverBand === key ? (
                <div
                  className="tooltip top in"
                  role="tooltip"
                  style={{
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}
                >
                  <div className="tooltip-arrow" />
                  <div className="tooltip-inner">
                    Start: {formatHz(min)}
                    <br />
                    End: {formatHz(max)}
                  </div>
                </div>
              ) : null}
            </span>
          )
        })}
      </div>

      {shownMessage ? (
        <div>
          <p className="waterfall-msg">{shownMessage}</p>
        </div>
      ) : null}

      <div className="row">
        <div className="col-sm-1" id="es-waterfall-slider-container">
          <div style={{ height: 15 }}>&nbsp;</div>
          <div style={{ display: 'flex', flexDirection: 'row', height: WATERFALL_HEIGHT }}>
            <VerticalRangeSlider
              low={colorLow}
              high={colorHigh}
              onChange={props.onColorChange}
            />
            <canvas ref={legendRef} id="es-color-legend-container" width={80} height={WATERFALL_HEIGHT} />
          </div>
        </div>
        <div className="col-sm-11" ref={wrapRef}>
          <canvas
            ref={canvasRef}
            id="es-specmap-container-2"
            className={moving ? 'move' : undefined}
            width={1000}
            height={WATERFALL_HEIGHT}
            onMouseDown={() => setMoving(true)}
            onMouseUp={() => setMoving(false)}
            onMouseLeave={() => setMoving(false)}
            style={{ backgroundColor: '#ffffff', textAlign: 'center', marginTop: 15 }}
          />
          <canvas
            ref={dataCanvasRef}
            id="es-specmap-container-3"
            width={1000}
            height={WATERFALL_HEIGHT}
            style={{ backgroundColor: '#ffffff', display: 'none' }}
          />
        </div>
      </div>
    </div>
  )
}

/** Two-handle vertical slider standing in for the legacy vertical rzslider. */
function VerticalRangeSlider({
  low,
  high,
  onChange,
}: {
  low: number
  high: number
  onChange: (low: number, high: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const span = SLIDER_CEIL - SLIDER_FLOOR
  const toPct = (v: number) => ((SLIDER_CEIL - v) / span) * 100

  function valueAt(clientY: number): number {
    const rect = trackRef.current!.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
    return Math.round(SLIDER_CEIL - t * span)
  }

  function handlers(which: 'low' | 'high') {
    return {
      onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        e.preventDefault()
      },
      onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
        const v = valueAt(e.clientY)
        if (which === 'low') onChange(Math.min(v, high), high)
        else onChange(low, Math.max(v, low))
      },
    }
  }

  return (
    <div className="es-vslider" style={{ flex: '1 1 auto' }}>
      <div className="es-vslider-track" ref={trackRef}>
        <div
          className="es-vslider-selection"
          style={{ top: `${toPct(high)}%`, height: `${toPct(low) - toPct(high)}%` }}
        />
        <div
          className="es-vslider-handle"
          style={{ top: `${toPct(high)}%` }}
          title={`${high / 100} dB`}
          {...handlers('high')}
        />
        <div
          className="es-vslider-handle"
          style={{ top: `${toPct(low)}%` }}
          title={`${low / 100} dB`}
          {...handlers('low')}
        />
      </div>
    </div>
  )
}
