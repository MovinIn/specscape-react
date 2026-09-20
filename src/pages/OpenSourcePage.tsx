export default function OpenSourcePage() {
  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-12">
          <div className="page-header">
            <h2>Open Source Software &amp; Hardware</h2>
          </div>

          <ul>
            <li>
              <a href="#downconverter">Frequency Extension Board</a>
            </li>
            <li>
              <a href="#image">Raspberry Pi Image</a>
            </li>
            <li>
              <a href="#gnuradio">GNU Radio Blocks</a>
            </li>
            <li>
              <a href="#github">Samples &amp; More</a>
            </li>
          </ul>

          <hr />

          <div className="panel panel-default">
            <div className="panel-heading" id="downconverter">
              Frequency Extension Board
            </div>
            <div className="panel-body">
              <img
                className="pull-right"
                style={{ margin: 20 }}
                src="/images/extension_board.png"
                alt="RaspberryPi"
                width={450}
                height={228}
              />

              <p className="text-justify">
                From the beginning of the project, SpecScape aimed for
                large-scale deployments using affordable hardware. Sensors
                were designed using cheap software-defined radios such as
                RTL-SDR dongles. However, these sensors don't cover all the
                interesting frequency bands, but rather come with a limited
                frequency range between 20MHz and 1.8GHz. To overcome this
                issue, while still providing sensors at a reasonable price,
                we have designed a frequency extension board. In combination
                with the RTL-SDR, it allows spectrum monitoring from few kHz
                and up to 6GHz. The board is connected to the Raspberry Pi
                via a USB port to exchange control data and power. It is
                equipped with 4 SMA antenna inputs and 1 SMA output to be
                connected to the RTL-SDR. In principle, the board can be
                used with any other SDR as its functionality is independent
                from the RTL dongle. The design is openly available on{' '}
                <a href="https://github.com/electrosense/hardware" target="_blank" rel="noreferrer">
                  Github
                </a>
                .
                <br />
                If your sensor is not equipped with the frequency extension
                board, you can{' '}
                <a href="/sensor-application/add">apply for a device</a>. If
                your sensor is online 24/7 and at a good location, you may
                be eligible for a free board.
              </p>
            </div>
          </div>

          <hr />

          <div id="rpi-image" className="panel panel-default">
            <div className="panel-heading" id="image">
              Raspberry Pi Image
            </div>
            <div className="panel-body">
              <img
                className="pull-right"
                style={{ margin: 10 }}
                src="/images/raspberry-pi.png"
                alt="RaspberryPi"
                width={70}
                height={90}
              />

              <p className="text-justify">
                In order to turn any Raspberry Pi device into an SpecScape
                sensor we have created an image based on Raspbian. It
                includes all software needed to connect a node to the
                SpecScape network. You just need to copy it to an SD Card,
                insert the card into your Raspberry Pi and you are ready to
                go.
                <br />
                There will be releases every once in a while, but in
                general, updates are applied automatically which reduces
                maintenance for people hosting a sensor. We will notify our
                feeders in case manual intervention is needed.
              </p>

              <h3>Installation</h3>

              <p>
                For installation instructions please refer to{' '}
                <a href="/sensor-setup">this guide</a>.
              </p>

              <h3>Releases</h3>

              <dl className="dl-horizontal">
                <dt>Current Release</dt>
                <dd>
                  <strong>2022-02-06</strong>
                  <span style={{ marginRight: 100 }}>&nbsp;</span>
                  <a
                    className="btn btn-primary btn-xs"
                    href="https://repository.electrosense.org/images/electrosense_latest.img.gz"
                  >
                    <i className="glyphicon glyphicon-floppy-save" />
                    &nbsp;Download
                  </a>
                  <small style={{ marginLeft: '2em' }} className="text-muted">
                    MD5 checksum: 7c2addb168153500047295e68e9444a4
                  </small>
                </dd>

                <dt>Older Releases</dt>
                <dd>
                  <ul className="list-unstyled">
                    <li>2025-10-02</li>
                  </ul>
                </dd>
              </dl>
            </div>
          </div>

          <hr />

          <div className="panel panel-default">
            <div className="panel-heading" id="gnuradio">
              GNU Radio Blocks
            </div>
            <div className="panel-body">
              <img
                className="pull-right"
                style={{ margin: 20 }}
                src="/images/gnuradio_logo.svg"
                alt="GNURadio"
                width={400}
                height={100}
              />
              <p className="text-justify">
                Basically any device compatible with GNU Radio can join the
                SpecScape network. We have developed some custom blocks for
                you. For more details have a look at the{' '}
                <a
                  href="https://github.com/electrosense/gr-electrosense"
                  target="_blank"
                  rel="noreferrer"
                >
                  Github repository
                </a>
                .
              </p>
            </div>
          </div>

          <div className="panel panel-default">
            <div className="panel-heading" id="github">
              Samples &amp; More
            </div>
            <div className="panel-body">
              <img
                className="pull-right"
                style={{ margin: 20 }}
                src="/images/github-lg.png"
                alt="Github"
                width={70}
                height={70}
              />
              <p className="text-justify">
                Even more software and sample code can be found in our{' '}
                <a
                  href="https://github.com/electrosense"
                  target="_blank"
                  rel="noreferrer"
                >
                  Github profile
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
