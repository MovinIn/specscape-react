import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="text-muted footer navbar-fixed-bottom">
      © The SpecScape Network |{' '}
      <a
        href="https://github.com/electrosense"
        style={{ color: 'black', fontSize: 25 }}
        target="_blank"
        rel="noreferrer"
      >
        <i className="fab fa-github" />
      </a>{' '}
      |{' '}
      <a
        href="https://twitter.com/electrosensenet"
        style={{ fontSize: 25 }}
        target="_blank"
        rel="noreferrer"
      >
        <i className="fab fa-twitter" />
      </a>{' '}
      | <Link to="/terms-of-service">Terms of Service</Link> |{' '}
      <Link to="/privacy-policy">Privacy Policy</Link> |{' '}
      <Link to="/contact">Contact</Link>
    </footer>
  )
}
