import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export default function JoinPage() {
  return (
    <div className="page page-narrow">
      <PageHeader title="Join SpecScape" />
      <div className="prose stack">
        <p>There are three steps to becoming a contributor</p>
        <ol>
          <li>
            <Link to="/account/register">Create a free account</Link> to become a
            member of the SpecScape community
          </li>
          <li>Set up a sensor at your place</li>
          <li>
            Make your data available to the community by adding your sensor in
            our <Link to="/sensors/add">SpecScape App</Link>
          </li>
        </ol>

        <hr />

        <h3>Getting a Sensor</h3>

        <section className="panel stack" id="build">
          <h3>Build Your Own Sensor</h3>
          <p>
            Is is easy to set up a{' '}
            <a
              href="https://www.raspberrypi.org/"
              target="_blank"
              rel="noreferrer"
            >
              Raspberry Pi
            </a>{' '}
            as a SpecScape sensor. For this purpose you will need:
          </p>
          <ul>
            <li>A Raspberry Pi (or compatible ARM computer) ~ $45</li>
            <li>
              A radio front-end supported by the{' '}
              <a
                href="http://sdr.osmocom.org/trac/wiki/rtl-sdr"
                target="_blank"
                rel="noreferrer"
              >
                rtl-sdr library
              </a>{' '}
              ~ $30
            </li>
            <li>
              The SpecScape Raspberry Pi image. You can find the download{' '}
              <Link to="/open-source">here</Link>, on our open source page.
            </li>
          </ul>
          <p>
            Further details on particular products can be found in our{' '}
            <Link to="/hardware">list of compatible hardware</Link>.
          </p>
          <p>
            For detailed installation and setup instructions have a look at the{' '}
            <Link to="/sensor-setup">setup guide</Link>.
          </p>
        </section>

        <section className="panel stack" id="apply">
          <h3>Apply for a Sensor</h3>
          <p>
            If you cannot build your own sensor, you can apply for a sponsored
            device. Tell us about your site—we review applications periodically
            when stock is available.
          </p>
          <p>
            <Link className="btn btn-primary" to="/contact">
              Apply for a Sensor!
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
