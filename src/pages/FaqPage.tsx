import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

const faqs = [
  {
    question: 'What are the requirements to host a sensor?',
    answer: (
      <>
        <p>
          Hosting a sensor is straightforward. Create a{' '}
          <Link to="/account/register">SpecScape account</Link>, then either
          follow our guide with{' '}
          <Link to="/hardware">compatible hardware</Link> or{' '}
          <Link to="/join">apply for a sponsored device</Link>. A few
          constraints apply to the environment:
        </p>
        <ul>
          <li>
            <strong>Permanent internet</strong> — a connection that can feed
            data 24/7.
          </li>
          <li>
            <strong>Ethernet preferred for sensing</strong> — Wi‑Fi radios near
            the antenna can distort measurements; wired uplinks keep the RF
            path quieter.
          </li>
          <li>
            <strong>Low-interference placement</strong> — keep the antenna at
            least about 1&nbsp;m from unshielded emitters such as Wi‑Fi access
            points.
          </li>
        </ul>
      </>
    ),
  },
  {
    question: 'I applied for a free sensor. How long until I receive it?',
    answer: (
      <p>
        Sponsored stock is limited. Applications are typically reviewed in
        batches every few weeks, then devices are allocated based on coverage
        needs and host readiness.
      </p>
    ),
  },
  {
    question: 'How long does setup take?',
    answer: (
      <p>
        A pre-configured kit with DHCP can be online in minutes: plug in power
        and Ethernet. Building your own sensor from the SpecScape image usually
        takes under fifteen minutes to flash an SD card and boot.
      </p>
    ),
  },
  {
    question: 'What is the best location for my sensor?',
    answer: (
      <p>
        Sensors are meant to observe the ambient spectrum, not sit next to a
        strong transmitter. Avoid placing the antenna within about a metre of
        Wi‑Fi APs, cordless bases, or other unshielded RF sources—those
        placements often produce misleading occupancy and power readings.
      </p>
    ),
  },
  {
    question: 'Where do I find the current Raspberry Pi firmware?',
    answer: (
      <p>
        Releases and checksums live on the{' '}
        <Link to="/open-source#image">Open Source</Link> page, with install
        steps on <Link to="/sensor-setup">Sensor Setup</Link>.
      </p>
    ),
  },
  {
    question: 'How can I log in on the sensor?',
    answer: (
      <p>
        SpecScape nodes continuously process SDR samples and keep the CPU busy.
        Extra userland services can skew timing, so interactive SSH login is
        disabled on the sensing image. Explore live and historical data in the
        web app, or use the <Link to="/api-spec">open API</Link>.
      </p>
    ),
  },
  {
    question: 'What is the frequency extension board for?',
    answer: (
      <p>
        Stock RTL-SDR dongles typically cover roughly 24–1766&nbsp;MHz. The open
        extension board mixes bands up to about 6&nbsp;GHz so the same low-cost
        frontend can observe common ISM and microwave allocations. Designs are
        published on the <Link to="/open-source">Open Source</Link> page.
      </p>
    ),
  },
  {
    question: 'Where can I find code and hardware designs?',
    answer: (
      <p>
        Sensing software and hardware are open. Start at{' '}
        <Link to="/open-source">Open Source</Link> or the{' '}
        <a
          href="https://github.com/electrosense"
          target="_blank"
          rel="noreferrer"
        >
          Electrosense GitHub organization
        </a>
        .
      </p>
    ),
  },
]

export default function FaqPage() {
  return (
    <div className="page page-narrow">
      <PageHeader
        title="Frequently Asked Questions"
        lead="Common questions about hosting sensors, firmware, and data access."
      />
      <div className="prose stack">
        <p>
          If your question is not covered here, join the{' '}
          <a
            href="https://groups.google.com/forum/#!forum/specscape"
            target="_blank"
            rel="noreferrer"
          >
            SpecScape Google Group
          </a>{' '}
          or email{' '}
          <a href="mailto:specscape@googlegroups.com">
            specscape@googlegroups.com
          </a>
          . You can also reach the team via the{' '}
          <Link to="/contact">contact form</Link>.
        </p>
        {faqs.map((item) => (
          <details key={item.question} className="panel" open>
            <summary>
              <strong>{item.question}</strong>
            </summary>
            <div className="stack">{item.answer}</div>
          </details>
        ))}
      </div>
    </div>
  )
}
