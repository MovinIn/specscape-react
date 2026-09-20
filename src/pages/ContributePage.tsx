import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export default function ContributePage() {
  return (
    <div className="page page-narrow">
      <PageHeader
        title="Contribute"
        lead="SpecScape grows through the people who host sensors, share expertise, and build on the data."
      />
      <div className="prose stack">
        <p>
          There are a few ways to get involved, whether you have hardware to
          spare, engineering time to offer, or just want to help extend
          coverage in your area.
        </p>

        <section className="panel stack" id="host">
          <h3>Host a Sensor</h3>
          <p>
            Set up a low-cost radio sensor at your location and join the
            network. Build your own from a Raspberry Pi and an RTL-SDR
            dongle, or apply for a sponsored device if stock is available.
          </p>
          <p>
            <Link className="btn btn-primary" to="/join">
              Get Started
            </Link>
          </p>
        </section>

        <section className="panel stack" id="develop">
          <h3>Contribute Code or Hardware</h3>
          <p>
            SpecScape publishes its sensor firmware, backend services, and
            hardware designs as open source. Bug reports, pull requests, and
            new hardware ports are welcome.
          </p>
          <p>
            <Link to="/open-source">Browse the Open Source page</Link>
          </p>
        </section>

        <section className="panel stack" id="work">
          <h3>Work with Us</h3>
          <p>
            Interested in a research collaboration, integration, or use of
            the aggregated dataset for your organization?
          </p>
          <p>
            <Link className="btn btn-default" to="/work-with-us">
              Work with Us
            </Link>
          </p>
        </section>

        <p>
          Not sure where to start? <Link to="/contact">Contact us</Link> and
          we'll point you in the right direction.
        </p>
      </div>
    </div>
  )
}
