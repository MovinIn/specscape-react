import { useEffect, useRef, useState } from 'react'

type Props = {
  /** Unit (as a Hz multiplier string, e.g. "1000000") shown when the frequency changes externally. */
  defaultUnit: string
  selectedFrequency: number
  isDisabled?: boolean
  onChange: (freq: number) => void
}

/** Port of the es-sel-freq component: a number field plus a Hz/kHz/MHz/GHz unit select. */
export function EsSelFreq({ defaultUnit, selectedFrequency, isDisabled, onChange }: Props) {
  const [selectedUnit, setSelectedUnit] = useState(defaultUnit)
  const [fieldValue, setFieldValue] = useState(() => String(selectedFrequency / Number(defaultUnit)))
  const internal = useRef(selectedFrequency)

  // a change from outside resets the unit to the default and re-derives the field
  useEffect(() => {
    if (internal.current === selectedFrequency) return
    internal.current = selectedFrequency
    setSelectedUnit(defaultUnit)
    setFieldValue(String(selectedFrequency / Number(defaultUnit)))
  }, [selectedFrequency, defaultUnit])

  function update(unit: string, field: string) {
    const freq = parseInt(unit, 10) * Number(field)
    if (!Number.isFinite(freq)) return
    internal.current = freq
    onChange(freq)
  }

  return (
    <form className="form form-inline" onSubmit={(e) => e.preventDefault()}>
      <input
        type="text"
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
        className="form-control input-sm"
        value={selectedUnit}
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
    </form>
  )
}
