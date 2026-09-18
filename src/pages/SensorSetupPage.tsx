import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export default function SensorSetupPage() {
  return (
    <div className="page page-narrow">
      <PageHeader
        title="Sensor Installation and Setup"
        lead="Flash the SpecScape image, connect Ethernet, and register the node with your account."
      />
      <div className="prose stack">
        <p>
          SpecScape ships a pre-configured Raspberry Pi image. Sensing is
          CPU-intensive; the image disables interactive login so measurement
          timing stays clean. Prefer Ethernet for the uplink used while sensing.
          Optional setup Wi‑Fi (USB dongle) is only for reaching the on-device
          wizard.
        </p>

        <h2>Image installation</h2>
        <p>
          Always use the latest release. Changelog:{' '}
          <a
            href="https://repository.electrosense.org/images/CHANGELOG.txt"
            target="_blank"
            rel="noreferrer"
          >
            CHANGELOG.txt
          </a>
          . Downloads also appear on{' '}
          <Link to="/open-source#image">Open Source</Link>.
        </p>

        <section className="panel stack">
          <h3>Linux</h3>
          <ol>
            <li>
              Download:{' '}
              <code>
                wget
                https://repository.electrosense.org/images/electrosense_latest.img.gz
              </code>
            </li>
            <li>
              Decompress: <code>gunzip electrosense_latest.img.gz</code>
            </li>
            <li>
              Write to an SD card (4&nbsp;GB+), e.g.{' '}
              <code>
                sudo dd if=electrosense_latest.img of=/dev/mmcblk0 bs=4M
              </code>{' '}
              — confirm the device node for your reader first.
            </li>
            <li>
              Flush caches: <code>sudo sync</code>
            </li>
            <li>Insert the card, power the Pi, then continue with registration.</li>
          </ol>
        </section>

        <section className="panel stack">
          <h3>Windows / macOS</h3>
          <ol>
            <li>
              Download{' '}
              <a href="https://repository.electrosense.org/images/electrosense_latest.img.gz">
                electrosense_latest.img.gz
              </a>
              .
            </li>
            <li>Insert a 4&nbsp;GB+ SD card (USB reader is fine).</li>
            <li>
              Flash with{' '}
              <a href="https://balena.io/etcher" target="_blank" rel="noreferrer">
                balena Etcher
              </a>{' '}
              (or equivalent).
            </li>
            <li>Boot the Pi and proceed to registration below.</li>
          </ol>
        </section>

        <h2>Sensor setup and registration</h2>
        <p>
          Open the sensor’s local web UI from a browser on the same network.
          With an external Wi‑Fi dongle, the node can briefly advertise an{' '}
          <strong>es-sensor</strong> AP (password <strong>electrosense</strong>
          ); the wizard is then reachable at <code>10.0.1.1</code> for about
          thirty minutes after boot.
        </p>

        <ol className="stack">
          <li>
            <strong>Start the wizard</strong> — choose Setup Wizard from the
            sensor UI menu.
          </li>
          <li>
            <strong>Mode</strong> — Wizard Mode (DHCP) for most hosts; Expert
            Mode for static addressing.
          </li>
          <li>
            <strong>Link</strong> — prefer wired Ethernet for continuous
            sensing; wireless is for configuration convenience.
          </li>
          <li>
            <strong>Identity &amp; location</strong> — name the sensor and mark
            the <em>antenna</em> position (it may differ from the Pi if you use
            a long cable). Public maps use obfuscated coordinates.
          </li>
          <li>
            <strong>Register</strong> — enter your SpecScape username and a
            short-lived registration token from your account. Tokens rotate
            frequently and are single-use.
          </li>
        </ol>

        <p>
          Need hardware first? See <Link to="/join">Host a Sensor</Link> or{' '}
          <Link to="/hardware">Compatible Hardware</Link>. Questions?{' '}
          <Link to="/contact">Contact us</Link>.
        </p>
      </div>
    </div>
  )
}
