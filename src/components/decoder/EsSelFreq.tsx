import { useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  /**
   * Unit (Hz multiplier) used when the frequency changes externally. Pass it as
   * the legacy template did: `default-unit="$ctrl.defaultUnit"` gave a string,
   * while a bare `default-unit="1000000"` gave a number. AngularJS compares the
   * select's model strictly, so a number matches no option and the unit select
   * starts blank (an unknown option) until the user picks a unit.
   */
  defaultUnit: string | number
  selectedFrequency: number
  isDisabled?: boolean
  onChange: (freq: number) => void
  /**
   * The legacy template is a nested <form>. Inside another form, render a div
   * instead (React rejects nested forms) and swallow Enter, which in the legacy
   * page only submitted the inner form and so did nothing.
   */
  nested?: boolean
}

/** Port of the es-sel-freq component: a number field plus a Hz/kHz/MHz/GHz unit select. */
export function EsSelFreq({
  defaultUnit,
  selectedFrequency,
  isDisabled,
  onChange,
  nested,
}: Props) {
  const [selectedUnit, setSelectedUnit] = useState<string | number>(
    String(defaultUnit),
  )
  const [fieldValue, setFieldValue] = useState(() =>
    String(selectedFrequency / Number(defaultUnit)),
  )
  const internal = useRef(selectedFrequency)
  const lastDefault = useRef(String(defaultUnit))

  // a change from outside resets the unit to the default and re-derives the field
  useEffect(() => {
    if (
      internal.current === selectedFrequency &&
      lastDefault.current === String(defaultUnit)
    )
      return
    lastDefault.current = String(defaultUnit)
    internal.current = selectedFrequency
    setSelectedUnit(String(defaultUnit))
    setFieldValue(String(selectedFrequency / Number(defaultUnit)))
  }, [selectedFrequency, defaultUnit])

  function update(unit: string | number, field: string) {
    const freq = parseInt(String(unit), 10) * Number(field)
    if (!field.trim() || !Number.isFinite(freq) || freq < 0) return
    internal.current = freq
    onChange(freq)
  }

  const content: ReactNode = (
    <>
      <input
        type="number"
        aria-label="Center frequency"
        min={0}
        step="any"
        className="form-control input-sm"
        value={fieldValue}
        disabled={isDisabled}
        onChange={(e) => {
          setFieldValue(e.target.value)
          update(selectedUnit, e.target.value)
        }}
      />{' '}
      <select
        name="selected-unit"
        aria-label="Frequency unit"
        className="form-control input-sm"
        value={String(selectedUnit)}
        disabled={isDisabled}
        onChange={(e) => {
          setSelectedUnit(e.target.value)
          update(e.target.value, fieldValue)
        }}
      >
        <option value="1">Hz</option>
        <option value="1000">kHz</option>
        <option value="1000000">MHz</option>
        <option value="1000000000">GHz</option>
      </select>
    </>
  )

  if (nested) {
    return (
      <div
        className="form form-inline"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement)
            e.preventDefault()
        }}
      >
        {content}
      </div>
    )
  }
  return (
    <form className="form form-inline" onSubmit={(e) => e.preventDefault()}>
      {content}
    </form>
  )
}
