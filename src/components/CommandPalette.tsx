import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pageInfo } from '../config/pages'
import { researchTools } from '../config/navigation'

const pages = [
  ...new Map(
    [
      { to: '/', title: 'Overview', group: 'WORKSPACE' },
      ...researchTools.map((tool) => ({
        to: tool.to,
        title: tool.title,
        group: 'RESEARCH TOOLS',
      })),
      ...Object.entries(pageInfo).map(([to, page]) => ({
        to,
        title: page.title,
        group: page.group,
      })),
    ].map((page) => [page.to, page]),
  ).values(),
]
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const results = useMemo(
    () =>
      pages
        .filter((page) =>
          (page.title + ' ' + page.group)
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 16),
    [query],
  )
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    input.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])
  function choose(to: string) {
    navigate(to)
    onClose()
  }
  return (
    <div className="lx-command-backdrop" onClick={onClose}>
      <section
        className="lx-command-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Jump to a page"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setIndex((current) =>
              results.length ? (current + 1) % results.length : 0,
            )
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setIndex((current) =>
              results.length
                ? (current - 1 + results.length) % results.length
                : 0,
            )
          }
          if (event.key === 'Enter' && results[index]) {
            event.preventDefault()
            choose(results[index].to)
          }
          if (event.key === 'Tab') {
            event.preventDefault()
            input.current?.focus()
          }
        }}
      >
        <div className="lx-command-input">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls="page-results"
            aria-activedescendant={
              results[index] ? 'page-result-' + index : undefined
            }
            aria-label="Search pages and tools"
            placeholder="Where would you like to go?"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setIndex(0)
            }}
          />
          <button type="button" onClick={onClose} aria-label="Close search">
            esc
          </button>
        </div>
        <div
          className="lx-command-results"
          id="page-results"
          role="listbox"
          aria-label="Pages"
        >
          {results.map((page, i) => (
            <button
              type="button"
              role="option"
              id={'page-result-' + i}
              aria-selected={i === index}
              key={page.to}
              onMouseEnter={() => setIndex(i)}
              onClick={() => choose(page.to)}
            >
              <span className="lx-command-symbol">
                <i className="fa-solid fa-arrow-turn-down" aria-hidden="true" />
              </span>
              <span>
                <strong>{page.title}</strong>
                <small>{page.group}</small>
              </span>
              <span>↗</span>
            </button>
          ))}
          {!results.length && (
            <p className="lx-empty">
              No pages found. Try “sensor”, “campaign” or “account”.
            </p>
          )}
        </div>
        <footer>
          <span>ONE WORKSPACE. EVERY POSSIBILITY.</span>
          <span>↑ ↓ to navigate · ↵ to open</span>
        </footer>
      </section>
    </div>
  )
}
