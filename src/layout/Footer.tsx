import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>© The SpecScape Network</p>
        <nav aria-label="Footer">
          <Link to="/terms-of-service">Terms of Service</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  )
}
