import type { ReactNode } from 'react'

export function WorkspaceHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <header className="lx-page-heading">
      <div>
        <p className="lx-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lx-page-description">{description}</p>
      </div>
      {children && <div className="lx-heading-actions">{children}</div>}
    </header>
  )
}
