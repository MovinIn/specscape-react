import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export default function WorkWithUsPage() {
  return (
    <div className="page page-narrow">
      <PageHeader
        title="Work with Us"
        lead="Collaborate on spectrum research, tooling, and network growth."
      />
      <div className="prose stack">
        <section className="panel stack">
          <h2>Open positions</h2>
          <p>
            There are no open PhD positions at the moment. If you want to
            contribute day to day, the highest-impact path is hosting a sensor
            and keeping it online.
          </p>
          <p>
            <Link className="btn btn-primary" to="/join">
              Host a sensor
            </Link>{' '}
            <Link className="btn btn-ghost" to="/contact">
              Contact the team
            </Link>
          </p>
        </section>

        <section className="stack">
          <h2>Other ways to collaborate</h2>
          <ul>
            <li>
              Sponsor coverage in under-served regions — see{' '}
              <Link to="/partners">Partners</Link>.
            </li>
            <li>
              Build on open hardware and software —{' '}
              <Link to="/open-source">Open Source</Link>.
            </li>
            <li>
              Use and cite the corpus — <Link to="/publications">Publications</Link>{' '}
              and <Link to="/datasets">Datasets</Link>.
            </li>
            <li>
              Integrate spectrum feeds — <Link to="/api-spec">Data API</Link>.
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
