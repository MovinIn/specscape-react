import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="lx-footer">
      <span>
        Open spectrum. Shared discovery.
        <small>Powered by ElectroSense · University of Wisconsin–Madison</small>
      </span>
      <nav aria-label="Footer">
        <Link to="/contact">Contact</Link>
        <Link to="/terms-of-service">Terms</Link>
        <Link to="/privacy-policy">Privacy</Link>
        <a
          href="https://github.com/electrosense"
          target="_blank"
          rel="noreferrer"
          aria-label="ElectroSense on GitHub"
        >
          <i className="fa-brands fa-github" aria-hidden="true" />
        </a>
      </nav>
    </footer>
  )
}
