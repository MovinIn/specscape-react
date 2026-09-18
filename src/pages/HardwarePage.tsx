import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

const antennas = [
  {
    model: 'RTL-SDR default whip',
    range: 'Varies by kit',
    gain: '—',
    size: '~15 cm',
    remarks: 'Included with many RTL-SDR dongles; fine for a quick start indoors.',
    price: 'Included',
  },
  {
    model: '30 dBi DVB-T indoor',
    range: '174–230 MHz, 470–862 MHz',
    gain: '30 dBi (claimed)',
    size: '~18 cm',
    remarks: 'Compact indoor option for broadcast-oriented bands.',
    price: '~€12',
  },
  {
    model: 'SE-1300 discone',
    range: '25–1300 MHz',
    gain: '—',
    size: '~150 cm',
    remarks: 'Wideband; best outdoors given the physical size.',
    price: '~€50',
  },
]

export default function HardwarePage() {
  return (
    <div className="page">
      <PageHeader
        title="Compatible Hardware"
        lead="A SpecScape node is a single-board computer, an SDR frontend, and an antenna—nothing exotic."
      />
      <div className="prose stack">
        <p>
          Building your own sensor is inexpensive. We have validated several ARM
          boards and RTL-SDR class receivers; the combinations below are our
          recommended starting points. When you are ready to flash and register,
          follow the <Link to="/sensor-setup">setup guide</Link> or browse{' '}
          <Link to="/join">hosting options</Link>.
        </p>

        <div className="grid-2">
          <section className="panel stack">
            <h2>ARM computer</h2>
            <ul>
              <li>
                <a
                  href="https://www.raspberrypi.org/products/raspberry-pi-3-model-b/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Raspberry Pi 3
                </a>{' '}
                <span className="muted">(preferred)</span>
              </li>
              <li>
                <a
                  href="https://www.raspberrypi.org/products/raspberry-pi-2-model-b/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Raspberry Pi 2
                </a>
              </li>
            </ul>
          </section>
          <section className="panel stack">
            <h2>Radio frontend</h2>
            <ul>
              <li>
                <a
                  href="https://www.amazon.com/dp/B011HVUEME"
                  target="_blank"
                  rel="noreferrer"
                >
                  RTL-SDR Blog V3
                </a>{' '}
                <span className="muted">(preferred)</span>
              </li>
              <li>
                <a
                  href="http://www.nooelec.com/store/sdr/sdr-receivers/nesdr-smart-sdr.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  NooElec NESDR SMArt
                </a>
              </li>
              <li>
                <a
                  href="http://www.nooelec.com/store/sdr/sdr-receivers/nesdr-mini2-rtl2832u-r820t2.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  NooElec NESDR Mini 2
                </a>
              </li>
              <li>
                <a
                  href="http://www.nooelec.com/store/sdr/sdr-receivers/nesdr-mini-rtl2832-r820t.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  NooElec NESDR Mini
                </a>
              </li>
            </ul>
          </section>
        </div>

        <h2>Antennas</h2>
        <p>
          Choose an antenna for the bands you care about and whether the node
          will live indoors or outdoors. If you use something not listed here,{' '}
          <Link to="/contact">tell us</Link>—we continually extend this table.
        </p>
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Frequency range</th>
                <th>Gain</th>
                <th>Size</th>
                <th>Remarks</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {antennas.map((row) => (
                <tr key={row.model}>
                  <td>{row.model}</td>
                  <td>{row.range}</td>
                  <td>{row.gain}</td>
                  <td>{row.size}</td>
                  <td>{row.remarks}</td>
                  <td>{row.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
