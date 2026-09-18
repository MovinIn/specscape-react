import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export default function TermsPage() {
  return (
    <div className="page page-narrow">
      <PageHeader
        title="Terms of Use & Data License"
        lead="Acceptable use and licensing for SpecScape / Electrosense data and services."
      />
      <div className="prose stack">
        <p>
          The following terms comprise the Acceptable Use Policy and Data
          License Agreement (the “AGREEMENT”) for data sets made available by
          Electrosense, a non-profit association under Article 60 ff. of the
          Swiss Civil Code, Burgdorf, Switzerland, operating the SpecScape
          network. Supplemental provisions may apply to particular data sets.
          Electrosense may refuse or discontinue access at its discretion. For
          access concerns, use the <Link to="/contact">contact form</Link> or
          email contact@electrosense.org. By requesting or using SpecScape
          data you agree to this AGREEMENT under Swiss law. You may terminate by
          written notice acknowledged by Electrosense.
        </p>

        <h2>1. License</h2>
        <p>
          Access grants a limited, non-exclusive, non-transferable, terminable
          license to copy, modify, and use the data solely for non-profit
          research, education, testing, or commercial internal evaluation. No
          other license is implied. The AGREEMENT may be modified or revoked;
          feedback you provide may be used for Electrosense’s non-profit
          educational and research purposes.
        </p>

        <h2>2. General conditions</h2>
        <p>
          You will not impersonate others or conceal your identity from
          Electrosense. You consent that Electrosense may disclose your name,
          affiliated institution, data sets received, and the purpose you
          stated. Material modifications will be emailed and become effective
          fifteen days after notice; continued use constitutes assent. If you
          disagree, you must stop access and notify Electrosense immediately.
        </p>

        <h2>3. Use restrictions</h2>
        <p>
          Respect privacy in non-anonymized data; anonymize personally
          identifiable information and precise sensor locations before
          publication. Do not reverse-engineer anonymized data. Do not
          redistribute data sets outside collaborators employed by your
          organization—other collaborators must request access directly. All
          restrictions travel with subsequent use.
        </p>

        <h2>4. Use obligations</h2>
        <p>
          Publications that use SpecScape / Electrosense data must provide a
          copy or link within three months and cite:
        </p>
        <blockquote>Electrosense / SpecScape, https://electrosense.org</blockquote>
        <p>
          Expunge retained copies when research concludes, allowing a reasonable
          period for scientific reproducibility.
        </p>

        <h2>5. Accountability</h2>
        <p>
          Safeguard sensitive data with at least reasonable care. Confidential
          data includes marked material and information whose disclosure would
          reasonably cause harm. Exceptions include prior knowledge, independent
          development, public availability without your wrongful act, and
          legally compelled disclosure with prior notice when permitted.
        </p>

        <h2>6. Intellectual property (commercial evaluation)</h2>
        <p>
          For commercial internal testing licenses, intellectual property
          developed using Electrosense information for commercial use is jointly
          owned as described in the full AGREEMENT, with Electrosense retaining
          rights for non-profit educational and research purposes unless a
          written exemption is granted.
        </p>

        <h2>7. Data collection and transmission</h2>
        <p>
          Hosting sensors and uploading measurements is voluntary and without
          compensation; you may stop at any time. Fabricated or manipulated data
          is forbidden unless explicitly agreed. By contributing, you grant
          Electrosense a royalty-free, worldwide, perpetual license to use,
          reproduce, modify, publish, and distribute the data, and you warrant
          that contributions do not infringe third-party rights or applicable
          law.
        </p>

        <h2>8. Personal data</h2>
        <p>
          Electrosense stores registration data under Swiss privacy law for
          account operation and may display username, sensor name, and
          (obfuscated) location. You may update or deactivate your account via
          the contact channels above. Addresses are not used for spam;
          informational mail may be sent unless you opt out.
        </p>

        <h2>9. User account</h2>
        <p>
          You are responsible for activity under your credentials and for
          reporting suspected compromise. Electrosense may delete accounts that
          violate these Terms.
        </p>

        <h2>10. Free-issue materials</h2>
        <p>
          Sponsored sensors or boards must be used as agreed, placed into
          operation promptly, protected from damage, and returned within two
          weeks if requested. Notify Electrosense immediately if you can no
          longer operate free-issue equipment.
        </p>

        <p className="muted">
          This page summarizes the AGREEMENT for readability. In case of
          conflict, the governing legal text maintained by Electrosense
          controls. See also the <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
