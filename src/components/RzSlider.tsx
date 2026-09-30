import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

type Props = {
  value: number
  /** When set, the slider is a range with a second (high) handle. */
  high?: number
  floor: number
  ceil: number
  step?: number
  vertical?: boolean
  showTicks?: boolean
  disabled?: boolean
  onChange: (value: number, high?: number) => void
  /** Fired once when the user releases a handle (rzslider's onEnd). */
  onEnd?: (value: number, high?: number) => void
  style?: CSSProperties
}

const HANDLE = 32

/**
 * React stand-in for angularjs-slider (rzslider) with its default look:
 * 4px bar, 32px round handles with a value bubble, optional ticks.
 * Limit labels are hidden, matching `hideLimitLabels: true`.
 */
export function RzSlider({
  value,
  high,
  floor,
  ceil,
  step = 1,
  vertical = false,
  showTicks = false,
  disabled = false,
  onChange,
  onEnd,
  style,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'low' | 'high' | null>(null)
  const [active, setActive] = useState<'low' | 'high' | null>(null)

  const span = ceil - floor || 1
  const frac = (v: number) => Math.min(1, Math.max(0, (v - floor) / span))
  const pos = (t: number) => `calc((100% - ${HANDLE}px) * ${t})`
  const center = (t: number) => `calc((100% - ${HANDLE}px) * ${t} + ${HANDLE / 2}px)`

  function valueAt(clientX: number, clientY: number) {
    const rect = rootRef.current!.getBoundingClientRect()
    const t = vertical
      ? (rect.bottom - clientY - HANDLE / 2) / (rect.height - HANDLE)
      : (clientX - rect.left - HANDLE / 2) / (rect.width - HANDLE)
    const raw = floor + Math.min(1, Math.max(0, t)) * span
    const snapped = floor + Math.round((raw - floor) / step) * step
    return Math.min(ceil, Math.max(floor, Number(snapped.toFixed(10))))
  }

  function apply(which: 'low' | 'high', v: number) {
    if (high === undefined) onChange(v)
    else if (which === 'low') onChange(Math.min(v, high), high)
    else onChange(value, Math.max(v, value))
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return
    const v = valueAt(e.clientX, e.clientY)
    const which = high !== undefined && Math.abs(v - high) < Math.abs(v - value) ? 'high' : 'low'
    dragging.current = which
    setActive(which)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
    apply(which, v)
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    apply(dragging.current, valueAt(e.clientX, e.clientY))
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    dragging.current = null
    setActive(null)
    e.currentTarget.releasePointerCapture(e.pointerId)
    onEnd?.(value, high)
  }

  const lowT = frac(value)
  const highT = high !== undefined ? frac(high) : lowT
  const selStart = high !== undefined ? lowT : 0
  const selEnd = high !== undefined ? highT : lowT

  const along = vertical ? 'bottom' : 'left'
  const extent = vertical ? 'height' : 'width'

  const pointer = (t: number, key: string) => (
    <span
      key={key}
      className={`rz-pointer${active === key ? ' rz-active' : ''}`}
      style={{ [along]: pos(t) }}
    />
  )
  const bubble = (t: number, v: number, key: string) => (
    <span
      key={`${key}-b`}
      className="rz-bubble"
      style={vertical ? { bottom: pos(t) } : { left: center(t), transform: 'translateX(-50%)' }}
    >
      {v}
    </span>
  )

  const ticks: number[] = []
  if (showTicks) for (let v = floor; v <= ceil; v += step) ticks.push(v)

  return (
    <div
      ref={rootRef}
      className={`rzslider${vertical ? ' rz-vertical' : ''}`}
      data-disabled={disabled ? 'true' : undefined}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span className="rz-bar-wrapper">
        <span className="rz-bar" />
      </span>
      <span className="rz-bar-wrapper" style={{ [along]: center(selStart), [extent]: `calc((100% - ${HANDLE}px) * ${selEnd - selStart})` }}>
        <span className="rz-bar rz-selection" />
      </span>
      {pointer(lowT, 'low')}
      {high !== undefined ? pointer(highT, 'high') : null}
      {bubble(lowT, value, 'low')}
      {high !== undefined ? bubble(highT, high, 'high') : null}
      {showTicks ? (
        <ul className="rz-ticks">
          {ticks.map((v) => {
            const selected = high !== undefined ? v >= value && v <= high : v <= value
            return (
              <li
                key={v}
                className={`rz-tick${selected ? ' rz-selected' : ''}`}
                style={{ [along]: center(frac(v)) }}
              />
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
