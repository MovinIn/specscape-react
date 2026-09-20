export default function HardwarePage() {
  return (
    <div className="container">
      <div className="row text-justify">
        <div className="col-sm-12">
          <div className="page-header">
            <h2>Compatible Hardware</h2>
          </div>

          <p>
            Setting up your own sensor is easy and cheap. You only need a
            simple single-board computer, an SDR dongle and an antenna. We
            have tested several computers and antennas and provide you with
            our recommended setup below.
            <br />
          </p>

          <div className="row" id="hw-row">
            <div className="col-sm-3 col-sm-offset-2">
              <div className="thumbnail hw-box">
                <img
                  src="/images/raspberry-pi.png"
                  alt="RaspberryPi"
                  width={122}
                  height={154}
                />
                <div className="caption">
                  <h3>ARM Computer</h3>
                  <ul>
                    <li>
                      <a href="https://www.raspberrypi.org/products/raspberry-pi-3-model-b/">
                        Raspberry Pi 3
                      </a>{' '}
                      <span className="label label-primary">preferred</span>
                    </li>
                    <li>
                      <a href="https://www.raspberrypi.org/products/raspberry-pi-2-model-b/">
                        Raspberry Pi 2
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-sm-1">
              <div className="hw-box plusbox text-center">
                <span>+</span>
              </div>
            </div>
            <div className="col-sm-3">
              <div className="thumbnail hw-box">
                <img
                  src="/images/silver-v3.png"
                  alt="rtl-sdr"
                  width={250}
                  height={155}
                />
                <div className="caption">
                  <h3>Radio Frontend</h3>
                  <ul>
                    <li>
                      <a
                        href="https://www.amazon.com/dp/B011HVUEME"
                        target="_blank"
                        rel="noreferrer"
                      >
                        RTL-SDR Silver v3
                      </a>{' '}
                      <span className="label label-primary">preferred</span>
                    </li>
                    <li>
                      <a
                        href="http://www.nooelec.com/store/sdr/sdr-receivers/nesdr-smart-sdr.html"
                        target="_blank"
                        rel="noreferrer"
                      >
                        NooElec NESDR SMArt Premium
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
                        NooElec NESDR Mini SDR
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <h3>Antenna</h3>

          <p>
            The right antenna for your setup depends on the frequency range
            you are interested in and if you want to measure indoors or
            outdoors. Here is a table of antennas that we use in different
            setups with their respective properties, advantages and
            disadvantages. If you are using other antennas, feel free to
            send us your hardware setup so we can continuously extend this
            list.
          </p>

          <table className="table table-striped">
            <thead>
              <tr>
                <th>Model</th>
                <th>Frequency Range</th>
                <th>Gain</th>
                <th>Size</th>
                <th>Remarks</th>
                <th>Price</th>
                <th>Buy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>RTLSDR Default</td>
                <td></td>
                <td></td>
                <td>15cm</td>
                <td>Antenna which comes with most RTL-SDR dongles</td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>30dbi DVB-T antenna</td>
                <td>174-230 MHz, 470-862MHz</td>
                <td>30dBi</td>
                <td>18cm</td>
                <td></td>
                <td>~12€</td>
                <td></td>
              </tr>
              <tr>
                <td>SE-1300 Discone Antenna</td>
                <td>25-1300 MHz</td>
                <td></td>
                <td>150cm</td>
                <td>Due to size best for outdoor usage</td>
                <td>~50€</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
