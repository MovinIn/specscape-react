import { useState, type ReactNode } from 'react'

type AccordionPanelProps = {
  heading: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  /** Controlled mode: when provided, this value drives open state instead of internal state. */
  open?: boolean
  onToggle?: (open: boolean) => void
}

/** Bootstrap 3 panel-group accordion item (mirrors angular-ui-bootstrap's uib-accordion-group). */
export function AccordionPanel({
  heading,
  defaultOpen = false,
  children,
  open: controlledOpen,
  onToggle,
}: AccordionPanelProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  function toggle() {
    if (isControlled) onToggle?.(!open)
    else setUncontrolledOpen((v) => !v)
  }

  return (
    <div className="panel panel-default">
      <div className="panel-heading">
        <button
          type="button"
          className="accordion-toggle"
          aria-expanded={open}
          onClick={toggle}
        >
          {heading}{' '}
          <span
            className={`pull-right glyphicon ${
              open ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right'
            }`}
          />
        </button>
      </div>
      <div className={`panel-collapse collapse${open ? ' in' : ''}`}>
        <div className="panel-body">{children}</div>
      </div>
    </div>
  )
}
