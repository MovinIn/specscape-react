import { Link } from 'react-router-dom'
export function Footer() {
  return <footer className="workspace-footer"><div>
    <span><strong>SpecScape</strong> <span className="footer-credit">Powered by Electrosense · University of Wisconsin–Madison</span></span>
    <nav aria-label="Footer"><Link to="/contact">Contact</Link><Link to="/terms-of-service">Terms</Link><Link to="/privacy-policy">Privacy</Link><a href="https://github.com/electrosense" target="_blank" rel="noreferrer" aria-label="Electrosense on GitHub"><i className="fa-brands fa-github" aria-hidden="true" /></a></nav>
  </div></footer>
}
