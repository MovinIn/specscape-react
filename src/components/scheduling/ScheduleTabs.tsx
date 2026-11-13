type Props = {
  byArea: boolean
  onChange: (byArea: boolean) => void
}

/** How the booking picks its sensors: by name, or everything free inside a drawn area. */
export function ScheduleTabs({ byArea, onChange }: Props) {
  const tab = (area: boolean, label: string) => (
    <li role="presentation">
      <a href={area ? '?by=area' : '?'} role="tab" aria-selected={byArea === area}
        className={byArea === area ? 'xs-tab-active' : undefined}
        onClick={(e) => { e.preventDefault(); if (byArea !== area) onChange(area) }}>
        {label}
      </a>
    </li>
  )
  return (
    <ul className="nav nav-tabs xs-tabs" role="tablist" style={{ marginBottom: 20 }}>
      {tab(false, 'Specific sensors')}
      {tab(true, 'Area')}
    </ul>
  )
}
