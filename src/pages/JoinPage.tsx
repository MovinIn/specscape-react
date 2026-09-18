import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export default function JoinPage() {
  return (
    <div className="page page-narrow">
      <PageHeader
        title="Host a Sensor"
        lead="Join SpecScape by registering, deploying a node, and sharing spectrum with the community."
      />
      <div className="prose stack">
        <p>Three steps to contribute:</p>
        <ol>
          <li>
            <Link to="/account/register">Create a free account</Link>
          </li>
          <li>Set up a sensor at your location</li>
          <li>
            Register the node so its measurements appear in the SpecScape
            network
          </li>
        </ol>

        <section className="panel stack" id="apply">
          <h2>Apply for a sensor</h2>
          <p>
            Sponsored devices are allocated periodically to hosts who can offer
            reliable power, Ethernet, and geographically useful coverage. Tell
            us about your site and motivation—we review applications in batches
            and ship when stock allows.
          </p>
          <p>
            <Link className="btn btn-primary" to="/contact">
              Start an application conversation
            </Link>
          </p>
        </section>

        <section className="panel stack" id="buy">
          <h2>Buy a sensor</h2>
          <p>
            Purchasing a pre-built kit is the fastest path if you prefer not to
            assemble parts yourself. Product links are published when kits are
            in stock; until then, reach out and we will point you to current
            options.
          </p>
          <p>
            <Link className="btn btn-ghost" to="/contact">
              Ask about kits
            </Link>
          </p>
        </section>

        <section className="panel stack" id="build">
          <h2>Build your own</h2>
          <p>
            A SpecScape node is typically a Raspberry Pi (or similar ARM board),
            an RTL-SDR class frontend (~$30), and the SpecScape sensing image.
            See <Link to="/hardware">compatible hardware</Link> for validated
            combinations, then follow the install and registration walkthrough.
          </p>
          <p>
            <Link className="btn btn-primary" to="/sensor-setup">
              Open sensor setup guide
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
