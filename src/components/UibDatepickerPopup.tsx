import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'

/*
 * Port of angular-ui-bootstrap 1.3.3's uib-datepicker-popup (en-US locale) as the
 * legacy app used it: an <input> plus a dropdown calendar inserted right after it.
 * Markup follows template/datepicker/{day,month,year}.html and
 * template/datepickerPopup/popup.html; behaviour follows datepicker.js / popup.js.
 */

type Mode = 'day' | 'month' | 'year'
const MODES: Mode[] = ['day', 'month', 'year']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
/** en-US FIRSTDAYOFWEEK is 6, so startingDay = (6 + 8) % 7 = 0 (Sunday). */
const STARTING_DAY = 0
const YEAR_COLUMNS = 5
const YEAR_RANGE = 4 * YEAR_COLUMNS

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/** dateFilter(date, 'yyyy-MM-dd') */
function formatYmd(d: Date): string {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * uibDateParser.parse(viewValue, 'yyyy-MM-dd', baseDate): strict match; the time
 * of day comes from `base` when given. Returns undefined when it does not parse.
 */
function parseYmd(text: string, base: Date | null | undefined): Date | undefined {
  const m = /^(\d{4})-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])$/.exec(text)
  if (!m) return undefined
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])]
  const daysInMonth = new Date(y, mo + 1, 0).getDate()
  if (d < 1 || d > daysInMonth) return undefined
  const r = base && !isNaN(base.getTime()) ? new Date(base) : new Date(1900, 0, 1, 0, 0, 0, 0)
  r.setFullYear(y, mo, d)
  return r
}

const dayKey = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const compareBy: Record<Mode, (a: Date, b: Date) => number> = {
  day: (a, b) => dayKey(a) - dayKey(b),
  month: (a, b) => new Date(a.getFullYear(), a.getMonth()).getTime() - new Date(b.getFullYear(), b.getMonth()).getTime(),
  year: (a, b) => a.getFullYear() - b.getFullYear(),
}
const startingYear = (year: number) => Math.floor((year - 1) / YEAR_RANGE) * YEAR_RANGE + 1
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

type Props = {
  id?: string
  /** ng-model: a Date, null after "Clear", undefined while the typed text is invalid. */
  value: Date | null | undefined
  onChange: (value: Date | null | undefined) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  minDate?: Date
  maxDate?: Date
  required?: boolean
  closeText?: string
}

export function UibDatepickerPopup({
  id, value, onChange, isOpen, onOpenChange, minDate, maxDate, required, closeText = 'Done',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const popupRef = useRef<HTMLUListElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState(() => (value ? formatYmd(value) : ''))
  const lastValue = useRef(value)
  const [mode, setMode] = useState<Mode>('day')
  const [active, setActive] = useState(() => new Date())
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // model -> view, when the model changes from outside the input
  useEffect(() => {
    if (lastValue.current === value) return
    lastValue.current = value
    if (value) setText(formatYmd(value))
    else if (value === null) setText('')
  }, [value])

  function emit(v: Date | null | undefined) {
    lastValue.current = v
    onChange(v)
  }

  // ng-if re-creates the datepicker on every open (day mode, active = model or
  // today), then $uibPosition places it 'auto bottom-left' of the input
  useLayoutEffect(() => {
    if (!isOpen) {
      setPos(null)
      setMode('day')
      return
    }
    setActive(value && !isNaN(value.getTime()) ? new Date(value) : new Date())
    const input = inputRef.current
    const popup = popupRef.current
    if (!input || !popup) return
    const below = input.getBoundingClientRect().bottom + popup.offsetHeight <= window.innerHeight
    const above = input.getBoundingClientRect().top - popup.offsetHeight >= 0
    setPos({
      top: !below && above ? input.offsetTop - popup.offsetHeight : input.offsetTop + input.offsetHeight,
      left: input.offsetLeft,
    })
    pickerRef.current?.focus()
    // only when opening or closing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // close on clicks outside the input and the popup
  useEffect(() => {
    if (!isOpen) return
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (inputRef.current?.contains(t) || popupRef.current?.contains(t)) return
      onOpenChange(false)
    }
    // registered after the opening click has finished, as $timeout did
    const timer = window.setTimeout(() => document.addEventListener('click', onDocClick))
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('click', onDocClick)
    }
  }, [isOpen, onOpenChange])

  function close() {
    onOpenChange(false)
    inputRef.current?.focus()
  }

  function dateSelection(d: Date | null) {
    emit(d)
    setText(d ? formatYmd(d) : '')
    close()
  }

  function isDisabled(d: Date, m: Mode) {
    const cmp = compareBy[m]
    return Boolean((minDate && cmp(d, minDate) < 0) || (maxDate && cmp(d, maxDate) > 0))
  }

  function select(d: Date) {
    if (mode === 'day') {
      const dt = value && !isNaN(value.getTime()) ? new Date(value) : new Date(0, 0, 0, 0, 0, 0, 0)
      dt.setFullYear(d.getFullYear(), d.getMonth(), d.getDate())
      dateSelection(dt)
    } else {
      setActive(new Date(d))
      setMode(MODES[MODES.indexOf(mode) - 1])
      pickerRef.current?.focus()
    }
  }

  function move(direction: number) {
    const step = mode === 'day' ? { y: 0, m: 1 } : mode === 'month' ? { y: 1, m: 0 } : { y: YEAR_RANGE, m: 0 }
    const a = new Date(active)
    a.setFullYear(a.getFullYear() + direction * step.y, a.getMonth() + direction * step.m, 1)
    setActive(a)
  }

  function toggleMode(direction = 1) {
    const next = MODES.indexOf(mode) + direction
    if (next < 0 || next >= MODES.length) return
    setMode(MODES[next])
  }

  function onPickerKeyDown(e: KeyboardEvent) {
    const keys: Record<string, string> = {
      Enter: 'enter', ' ': 'space', PageUp: 'pageup', PageDown: 'pagedown', End: 'end',
      Home: 'home', ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down',
    }
    const key = keys[e.key]
    if (!key || e.shiftKey || e.altKey) return
    e.preventDefault()
    e.stopPropagation()
    if (key === 'enter' || key === 'space') {
      if (!isDisabled(active, mode)) select(active)
      return
    }
    if (e.ctrlKey && (key === 'up' || key === 'down')) {
      toggleMode(key === 'up' ? 1 : -1)
      return
    }
    const a = new Date(active)
    if (mode === 'day') {
      let date = a.getDate()
      if (key === 'left') date -= 1
      else if (key === 'up') date -= 7
      else if (key === 'right') date += 1
      else if (key === 'down') date += 7
      else if (key === 'pageup' || key === 'pagedown') {
        a.setMonth(a.getMonth() + (key === 'pageup' ? -1 : 1), 1)
        date = Math.min(daysIn(a.getFullYear(), a.getMonth()), date)
      } else if (key === 'home') date = 1
      else if (key === 'end') date = daysIn(a.getFullYear(), a.getMonth())
      a.setDate(date)
    } else if (mode === 'month') {
      let month = a.getMonth()
      if (key === 'left') month -= 1
      else if (key === 'up') month -= 3
      else if (key === 'right') month += 1
      else if (key === 'down') month += 3
      else if (key === 'pageup' || key === 'pagedown') a.setFullYear(a.getFullYear() + (key === 'pageup' ? -1 : 1))
      else if (key === 'home') month = 0
      else if (key === 'end') month = 11
      a.setMonth(month)
    } else {
      let year = a.getFullYear()
      if (key === 'left') year -= 1
      else if (key === 'up') year -= YEAR_COLUMNS
      else if (key === 'right') year += 1
      else if (key === 'down') year += YEAR_COLUMNS
      else if (key === 'pageup' || key === 'pagedown') year += (key === 'pageup' ? -1 : 1) * YEAR_RANGE
      else if (key === 'home') year = startingYear(a.getFullYear())
      else if (key === 'end') year = startingYear(a.getFullYear()) + YEAR_RANGE - 1
      a.setFullYear(year)
    }
    setActive(a)
  }

  const today = new Date()
  const model = value && !isNaN(value.getTime()) ? value : null

  function cellButton(d: Date, label: string, m: Mode, extra: { secondary?: boolean; sm?: boolean }) {
    const cmp = compareBy[m]
    const classes = ['btn', 'btn-default']
    if (extra.sm) classes.push('btn-sm')
    if (model && cmp(d, model) === 0) classes.push('btn-info')
    if (cmp(d, active) === 0) classes.push('active')
    const spanClass = [extra.secondary ? 'text-muted' : '', cmp(d, today) === 0 ? 'text-info' : '']
      .filter(Boolean)
      .join(' ')
    return (
      <button
        type="button"
        className={classes.join(' ')}
        onClick={(e) => {
          e.stopPropagation()
          select(d)
        }}
        disabled={isDisabled(d, m)}
        tabIndex={-1}
      >
        <span className={spanClass || undefined}>{label}</span>
      </button>
    )
  }

  function header(title: string, colSpan?: number) {
    return (
      <tr>
        <th>
          <button type="button" className="btn btn-default btn-sm pull-left uib-left" onClick={() => move(-1)} tabIndex={-1}>
            <i className="glyphicon glyphicon-chevron-left" />
          </button>
        </th>
        <th colSpan={colSpan}>
          <button
            type="button"
            className="btn btn-default btn-sm uib-title"
            onClick={() => toggleMode()}
            disabled={mode === 'year'}
            tabIndex={-1}
            role="heading"
            aria-live="assertive"
            aria-atomic="true"
          >
            <strong>{title}</strong>
          </button>
        </th>
        <th>
          <button type="button" className="btn btn-default btn-sm pull-right uib-right" onClick={() => move(1)} tabIndex={-1}>
            <i className="glyphicon glyphicon-chevron-right" />
          </button>
        </th>
      </tr>
    )
  }

  function dayView() {
    const first = new Date(active)
    first.setFullYear(active.getFullYear(), active.getMonth(), 1)
    const diff = STARTING_DAY - first.getDay()
    const fromPrev = diff > 0 ? 7 - diff : -diff
    const start = new Date(first)
    if (fromPrev > 0) start.setDate(-fromPrev + 1)
    const days: Date[] = []
    for (let i = 0, cur = new Date(start); i < 42; i++) {
      days.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    const rows = [0, 1, 2, 3, 4, 5].map((r) => days.slice(r * 7, r * 7 + 7))
    return (
      <table className="uib-daypicker" role="grid">
        <thead>
          {header(`${MONTHS[active.getMonth()]} ${active.getFullYear()}`, 5)}
          <tr>
            {days.slice(0, 7).map((d) => (
              <th key={d.getDay()} className="text-center">
                <small aria-label={DAY_FULL[d.getDay()]}>{DAY_ABBR[d.getDay()]}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="uib-weeks">
              {row.map((d) => (
                <td key={d.getTime()} className="uib-day text-center" role="gridcell">
                  {cellButton(d, pad(d.getDate()), 'day', {
                    sm: true,
                    secondary: d.getMonth() !== active.getMonth(),
                  })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  function monthView() {
    const months = MONTHS.map((_, i) => {
      const d = new Date(active)
      d.setFullYear(active.getFullYear(), i, 1)
      return d
    })
    return (
      <table className="uib-monthpicker" role="grid">
        <thead>{header(String(active.getFullYear()))}</thead>
        <tbody>
          {[0, 1, 2, 3].map((r) => (
            <tr key={r} className="uib-months">
              {months.slice(r * 3, r * 3 + 3).map((d) => (
                <td key={d.getMonth()} className="uib-month text-center" role="gridcell">
                  {cellButton(d, MONTHS[d.getMonth()], 'month', {})}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  function yearView() {
    const startYear = startingYear(active.getFullYear())
    const years = Array.from({ length: YEAR_RANGE }, (_, i) => {
      const d = new Date(active)
      d.setFullYear(startYear + i, 0, 1)
      return d
    })
    return (
      <table className="uib-yearpicker" role="grid">
        <thead>{header(`${pad(startYear, 4)} - ${pad(startYear + YEAR_RANGE - 1, 4)}`, YEAR_COLUMNS - 2)}</thead>
        <tbody>
          {[0, 1, 2, 3].map((r) => (
            <tr key={r} className="uib-years">
              {years.slice(r * YEAR_COLUMNS, r * YEAR_COLUMNS + YEAR_COLUMNS).map((d) => (
                <td key={d.getFullYear()} className="uib-year text-center" role="gridcell">
                  {cellButton(d, pad(d.getFullYear(), 4), 'year', {})}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  const todayDisabled = isDisabled(today, 'day')

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="text"
        className="form-control"
        required={required}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          emit(e.target.value ? parseYmd(e.target.value, model) : null)
        }}
      />
      <div>
        {isOpen ? (
          <ul
            ref={popupRef}
            className={`uib-datepicker-popup dropdown-menu${pos ? '' : ' uib-position-measure'}`}
            style={pos ? { top: pos.top, left: pos.left } : undefined}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                close()
              }
            }}
          >
            <li>
              <div ref={pickerRef} className="uib-datepicker" role="application" tabIndex={0} onKeyDown={onPickerKeyDown}>
                {mode === 'day' ? dayView() : mode === 'month' ? monthView() : yearView()}
              </div>
            </li>
            <li className="uib-button-bar">
              <span className="btn-group pull-left">
                <button
                  type="button"
                  className="btn btn-sm btn-info uib-datepicker-current"
                  disabled={todayDisabled}
                  onClick={() => {
                    const now = new Date()
                    let d: Date
                    if (model) {
                      d = new Date(model)
                      d.setFullYear(now.getFullYear(), now.getMonth(), now.getDate())
                    } else {
                      d = new Date(now.setHours(0, 0, 0, 0))
                    }
                    dateSelection(d)
                  }}
                >
                  Today
                </button>
                <button type="button" className="btn btn-sm btn-danger uib-clear" onClick={() => dateSelection(null)}>
                  Clear
                </button>
              </span>
              <button type="button" className="btn btn-sm btn-success pull-right uib-close" onClick={close}>
                {closeText}
              </button>
            </li>
          </ul>
        ) : null}
      </div>
    </>
  )
}
