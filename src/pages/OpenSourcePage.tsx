import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export default function OpenSourcePage() {
  return (
    <div className="page page-narrow">
      <PageHeader
        title="Open Source Software & Hardware"
        lead="Designs, images, and tooling so anyone can inspect—and improve—how SpecScape senses the airwaves."
      />
      <div className="prose stack">
        <nav className="stack">
          <a href="#downconverter">Frequency extension board</a>
          <a href="#image">Raspberry Pi image</a>
          <a href="#gnuradio">GNU Radio blocks</a>
          <a href="#github">Samples & more</a>
        </nav>

        <section className="panel stack" id="downconverter">
          <h2>Frequency extension board</h2>
          <p>
            SpecScape targets dense deployments on affordable RTL-SDR class
            hardware. Those dongles typically stop around 1.8&nbsp;GHz, yet many
            interesting allocations sit higher. Our open frequency extension
            board, paired with an RTL-SDR, enables monitoring from a few kHz up
            to about 6&nbsp;GHz while keeping node cost reasonable.
          </p>
          <p>
            The board talks to the Raspberry Pi over USB for control and power,
            exposes four SMA inputs and one SMA output to the SDR, and can drive
            other SDR frontends—the mixing path is independent of the RTL chip.
            Schematics and layout live on{' '}
            <a
              href="https://github.com/electrosense/hardware"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            . Hosts with strong 24/7 uptime and useful coverage may be eligible
            for a sponsored board via <Link to="/join">Join</Link>.
          </p>
        </section>

        <section className="panel stack" id="image">
          <h2>Raspberry Pi image</h2>
          <p>
            A Raspbian-based image turns a Pi into a SpecScape node: flash an SD
            card, boot, and register. Updates land automatically when possible;
            we notify feeders if a manual step is required.
          </p>
          <p>
            Installation steps: <Link to="/sensor-setup">Sensor Setup</Link>.
          </p>
          <h3>Current release</h3>
          <p>
            <strong>2022-02-06</strong>{' '}
            <a
              className="btn btn-primary"
              href="https://repository.electrosense.org/images/electrosense_latest.img.gz"
            >
              Download image
            </a>
          </p>
          <p className="muted">
            MD5: <code>7c2addb168153500047295e68e9444a4</code>
          </p>
        </section>

        <section className="panel stack" id="gnuradio">
          <h2>GNU Radio blocks</h2>
          <p>
            Devices that speak GNU Radio can participate too. Custom blocks and
            flowgraph helpers are published at{' '}
            <a
              href="https://github.com/electrosense/gr-electrosense"
              target="_blank"
              rel="noreferrer"
            >
              gr-electrosense
            </a>
            .
          </p>
        </section>

        <section className="panel stack" id="github">
          <h2>Samples & more</h2>
          <p>
            Additional repositories, API examples, and sample code live under the{' '}
            <a
              href="https://github.com/electrosense"
              target="_blank"
              rel="noreferrer"
            >
              electrosense
            </a>{' '}
            GitHub organization.
          </p>
        </section>
      </div>
    </div>
  )
}
