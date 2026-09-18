import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export default function PrivacyPage() {
  return (
    <div className="page page-narrow">
      <PageHeader
        title="Privacy Policy"
        lead="How SpecScape / Electrosense processes personal data under Swiss and EU frameworks."
      />
      <div className="prose stack">
        <p>
          Personal data is processed only as needed to operate a functional
          SpecScape website and services. Under Art. 4(1) GDPR, processing
          includes collection, storage, use, disclosure, and erasure of personal
          data. This policy explains controllers, your rights, and processing
          categories. Third-party components used for maps or abuse prevention
          may process data under their own policies.
        </p>

        <h2>I. Controller</h2>
        <p>
          Electrosense
          <br />
          Eyzälg 23
          <br />
          3400 Burgdorf
          <br />
          Switzerland
          <br />
          Contact: <Link to="/contact">contact form</Link>
        </p>

        <h2>II. Rights of users and data subjects</h2>
        <p>You may request, among other rights:</p>
        <ul>
          <li>Confirmation and information about processing (Art. 15 GDPR)</li>
          <li>Correction of inaccurate data (Art. 16 GDPR)</li>
          <li>
            Erasure or restriction where applicable (Arts. 17–18 GDPR)
          </li>
          <li>Data portability (Art. 20 GDPR)</li>
          <li>Complaints to a supervisory authority (Art. 77 GDPR)</li>
        </ul>
        <p>
          You may also object to processing based on legitimate interests,
          including direct marketing (Art. 21 GDPR).
        </p>

        <h2>III. Processing</h2>
        <p>
          Data is deleted or blocked when the purpose ends, unless retention is
          legally required.
        </p>

        <h3>Server data</h3>
        <p>
          Browser type and version, OS, referrer, pages visited, timestamps, and
          IP address are logged for security and stability (Art. 6(1)(f) GDPR).
          Logs are not joined to other profiles and are deleted within about
          seven days unless needed for incident investigation.
        </p>

        <h3>Cookies</h3>
        <p>
          Session cookies support language and session continuity (Art. 6(1)(b)
          or (f) GDPR) and expire when the browser closes. Third-party cookies
          may appear when map or anti-bot services load. You can refuse cookies
          in the browser; some features may then be unavailable.
        </p>

        <h3>User accounts</h3>
        <p>
          Registration data (e.g. username, email) is used to provide the
          account and sensor services. IP and registration time are stored. Data
          is not sold. Legal bases include consent (Art. 6(1)(a)) and contract
          (Art. 6(1)(b)). Consent may be withdrawn with future effect.
        </p>

        <h3>Contact</h3>
        <p>
          Messages sent via email or the contact form are processed to answer
          your inquiry (Art. 6(1)(b) GDPR) and deleted when no longer needed.
        </p>

        <h3>Maps</h3>
        <p>
          Sensor maps may load OpenStreetMap and/or Mapbox tiles. Those
          providers can receive technical data such as IP address; see their
          privacy policies. Legal basis: Art. 6(1)(f) GDPR (site functionality).
        </p>

        <h3>Abuse prevention</h3>
        <p>
          Forms may use Google reCAPTCHA to limit automated abuse (Art. 6(1)(f)
          GDPR). Google may process IP and related telemetry per its privacy
          policy.
        </p>

        <p className="muted">
          Related: <Link to="/terms">Terms of Use</Link>. Model statement
          adapted from Anwaltskanzlei Weiß &amp; Partner guidance.
        </p>
      </div>
    </div>
  )
}
