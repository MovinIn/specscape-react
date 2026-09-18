type PageHeaderProps = {
  title: string
  lead?: string
}

export function PageHeader({ title, lead }: PageHeaderProps) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {lead ? <p className="muted">{lead}</p> : null}
    </header>
  )
}

export default PageHeader
