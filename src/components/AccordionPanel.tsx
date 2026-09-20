import { useState, type ReactNode } from 'react'

type AccordionPanelProps = {
  heading: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

/** Bootstrap 3 panel-group accordion item (mirrors angular-ui-bootstrap's uib-accordion-group). */
export function AccordionPanel({
  heading,
  defaultOpen = false,
  children,
}: AccordionPanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="panel panel-default">
      <div className="panel-heading">
        <button
          type="button"
          className="accordion-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
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
