import { Link } from 'react-router-dom'
import { AccordionPanel } from '../components/AccordionPanel'

export default function JoinPage() {
  return (
    <div className="container">
      <div className="row text-justify">
        <div className="col-sm-12">
          <div className="page-header">
            <h2>Join SpecScape</h2>
          </div>

          <p>There are three steps to becoming a contributor</p>
          <ol>
            <li>
              <Link to="/account/register">Create a free account</Link> to
              become a member of the SpecScape community
            </li>
            <li>Set up a sensor at your place</li>
            <li>
              Make your data available to the community by adding your
              sensor in our <Link to="/sensors/add">SpecScape App</Link>
            </li>
          </ol>
          <hr />

          <h3>Getting a Sensor</h3>

          <div className="panel-group">
            <AccordionPanel heading="Build Your Own Sensor">
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
                  ~ $30{' '}
                </li>
                <li>
                  The SpecScape Raspberry Pi image. You can find the download{' '}
                  <Link to="/open-source">here</Link>, on our open source
                  page.
                </li>
              </ul>
              <p>
                Further details on particular products can be found in our{' '}
                <Link to="/hardware">list of compatible hardware</Link>.
              </p>

              <h4>Installation and Setup</h4>

              For detailed installation and setup instructions have a look at
              the following guide:
              <br />
              <br />

              <div className="panel-group">
                <AccordionPanel heading="Setup guide">
                  <div className="row panel-body">
                    <div className="row text-justify">
                      <div className="col-sm-12">
                        <div className="page-header">
                          <h2>Sensor Installation and Setup</h2>
                        </div>

                        <p>
                          When it comes to software, we provide a
                          pre-configured image. At the moment there is no
                          possibility to set it up with WiFi, so you need to
                          connect the device over ethernet. However, that's
                          all you need to do. We will take care of the
                          measurements and all updates!
                          <br />
                          Spectrum sensing is a quite resource-intensive task
                          such that your Raspberry Pi will be busy and it is
                          not recommended to use it for other tasks. For this
                          reason, our image does not allow user login on the
                          device.
                        </p>

                        <h3>Image Installation</h3>

                        <p>
                          The pre-configured image is under active
                          development. You should ensure that you are running
                          the latest release. For a list of improvements, we
                          refer to the{' '}
                          <a
                            href="http://repository.electrosense.org/images/CHANGELOG.txt"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Changelog
                          </a>
                          . If you want to set up a sensor, follow the
                          instructions below, depending on your computer's
                          operating system.
                        </p>

                        <div className="panel-group">
                          <AccordionPanel heading="Linux">
                            <ol>
                              <li>
                                Download the latest firmware
                                <pre>
                                  $ wget
                                  http://repository.electrosense.org/images/electrosense_latest.img.gz
                                </pre>
                              </li>
                              <li>
                                Decompress the firmware
                                <pre>$ gunzip electrosense_latest.img.gz</pre>
                              </li>
                              <li>
                                Insert an SD card into your computer (4GB or
                                more) and copy the image
                                <pre>
                                  $ sudo dd if=electrosense_latest.img
                                  of=/dev/mmcblk0 bs=4M
                                </pre>
                                (<i>/dev/mmcblk0</i> may be different on your
                                computer. It is the device node of your SD
                                card reader)
                              </li>
                              <li>
                                When copying has finished, ensure that all
                                data has been written:
                                <pre>$ sudo sync</pre>
                              </li>
                              <li>
                                Remove the SD card from your computer and
                                insert it into the Raspberry Pi. Boot up the
                                sensor and proceed with the sensor
                                registration below.
                              </li>
                            </ol>
                          </AccordionPanel>

                          <AccordionPanel heading="Windows">
                            <ol>
                              <li>
                                Download the latest firmware from{' '}
                                <a href="http://repository.electrosense.org/images/electrosense_latest.img.gz">
                                  the repository.
                                </a>
                              </li>
                              <li>
                                Insert an SD card into your computer (min. 4GB
                                in size). If you don't have an internal card
                                reader, you will have to use some external
                                USB SD card reader device.
                              </li>
                              <li>
                                You also need a tool to flash the image to
                                the SD card. We recommend to download and
                                install{' '}
                                <a
                                  href="https://balena.io/etcher"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  balena Etcher
                                </a>
                                .
                              </li>
                              <li>
                                Open balena Etcher and select the downloaded
                                SpecScape image file and your SD card drive.
                                Click "Burn" to write the SpecScape image to
                                the card.
                              </li>
                              <li>
                                Remove the card from your computer and insert
                                it into the Raspberry Pi. You can now boot
                                your sensor and proceed with the sensor
                                registration below.
                              </li>
                            </ol>
                          </AccordionPanel>
                        </div>

                        <hr />

                        <h3>Sensor Setup and Registration</h3>

                        <p>
                          After the image has been successfully installed or
                          you purchased one of our kits, you need to register
                          the sensor with our platform. You can do this by
                          visiting the web ui of your sensor with a browser.
                        </p>

                        <h4>Connecting via Wi-Fi</h4>
                        The SpecScape sensor can provide a Wi-Fi access point
                        for quick access to the web ui. Unfortunately the
                        internal Wi-Fi chip of the Raspberry Pi doesn't
                        support access point mode, so an external Wi-Fi
                        dongle has to be connected via USB (available at the
                        tech store of your choice). Once the dongle is
                        plugged in, reboot your sensor. A Wi-Fi network "
                        <b>es-sensor</b>" should be available soon after. It
                        is encrypted with the password "
                        <b>electrosense</b>". Please refer to this exemplary
                        step-by-step tutorial for iPhones:
                        <br />
                        <br />

                        <div className="panel-group">
                          <AccordionPanel heading="Connect your iPhone">
                            Open the <b>Settings</b> app on your iPhone and
                            select <b>Wi-Fi</b>.
                            <br />
                            <img
                              src="/images/wizard/iPhone_1.jpg"
                              alt="..."
                              className="img-rounded text-center"
                              style={{
                                margin: 10,
                                maxWidth: 400,
                                height: 'auto',
                              }}
                            />
                            <br />
                            Make sure <b>Wi-Fi</b> is turned on. Your iPhone
                            will start searching for new networks.
                            <br />
                            <img
                              src="/images/wizard/iPhone_2.jpg"
                              alt="..."
                              className="img-rounded text-center"
                              style={{
                                margin: 10,
                                maxWidth: 400,
                                height: 'auto',
                              }}
                            />
                            <br />
                            Always after powering up your sensor it will
                            provide a Wi-Fi access point for thirty minutes.
                            If you already have it running for longer than
                            that disconnect and reconnect power to trigger a
                            reboot. It should show up on your iPhone as a new
                            network at the bottom:
                            <br />
                            <img
                              src="/images/wizard/iPhone_3.jpg"
                              alt="..."
                              className="img-rounded text-center"
                              style={{
                                margin: 10,
                                maxWidth: 400,
                                height: 'auto',
                              }}
                            />
                            <br />
                            Select the network and enter the password{' '}
                            <b>electrosense</b>.
                            <br />
                            <img
                              src="/images/wizard/iPhone_4.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{
                                margin: 10,
                                maxWidth: 400,
                                height: 'auto',
                              }}
                            />
                            <br />
                            Submit and wait for the connection process to
                            finish. Soon after that it should show as
                            connected, indicated by a small, blue check mark:
                            <br />
                            <img
                              src="/images/wizard/iPhone_5_2.jpg"
                              alt="..."
                              className="img-rounded text-center"
                              style={{
                                margin: 10,
                                maxWidth: 400,
                                height: 'auto',
                              }}
                            />
                            <br />
                            Your iPhone should also indicate a Wi-Fi
                            connection at the top:
                            <br />
                            <img
                              src="/images/wizard/iPhone_5.jpg"
                              alt="..."
                              className="img-rounded text-center"
                              style={{
                                margin: 10,
                                maxWidth: 400,
                                height: 'auto',
                              }}
                            />
                            <br />
                            Switch to your preferred Browser app. When the
                            Wi-Fi connection to your receiver is active your
                            sensor will always be available at the IP address{' '}
                            <b>10.0.1.1</b>. Type this in the address field
                            and submit.
                            <br />
                            <img
                              src="/images/wizard/iPhone_6.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{
                                margin: 10,
                                maxWidth: 400,
                                height: 'auto',
                              }}
                            />
                            <br />
                            Shortly after the web-ui will show up.
                            <br />
                            <img
                              src="/images/wizard/iPhone_8.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{
                                margin: 10,
                                maxWidth: 400,
                                height: 'auto',
                              }}
                            />
                            <br />
                            Tap the menu button in the top left to access the
                            wizard.
                            <br />
                            <img
                              src="/images/wizard/iPhone_9.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{
                                margin: 10,
                                maxWidth: 400,
                                height: 'auto',
                              }}
                            />
                          </AccordionPanel>
                        </div>

                        <br />
                        <h4>1. Starting the Wizard</h4>
                        Select <b>Setup Wizard</b> in the menu at the right
                        side of the web ui.
                        <br />
                        <br />

                        <div className="panel-group">
                          <AccordionPanel heading="Open the setup wizard">
                            <img
                              src="/images/wizard/1.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{ margin: 10 }}
                            />
                          </AccordionPanel>
                        </div>

                        <br />
                        <h4>2. Wizard Modes</h4>
                        You can select between two modes. <b>Wizard Mode</b>{' '}
                        is for you if you want to use DHCP and don't need to
                        manually set a network configuration. If you don't
                        know what this means, select <b>Wizard Mode</b>.{' '}
                        <b>Expert mode</b> offers you network settings other
                        than DHCP.
                        <br />
                        <br />

                        <div className="panel-group">
                          <AccordionPanel heading="Mode select">
                            <img
                              src="/images/wizard/2.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{ margin: 10 }}
                            />
                          </AccordionPanel>
                        </div>

                        <br />
                        <h4>3. Wifi or Ethernet</h4>
                        Select whether you wish to connect your receiver via
                        a local Wifi or prefer to hook it up via an Ethernet
                        cable. If you select <b>Wireless Connection</b>{' '}
                        proceed with step <b>4</b> of this guide. If you
                        select <b>Wired Connection</b> in <b>Wizard Mode</b>{' '}
                        the network setup is now complete. In that case to
                        straight to step <b>6</b>. If you selected{' '}
                        <b>Expert Mode</b> earlier proceed with step{' '}
                        <b>5</b>.
                        <br />
                        <br />

                        <div className="panel-group">
                          <AccordionPanel heading="Wired and wireless options">
                            <img
                              src="/images/wizard/3.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{ margin: 10 }}
                            />
                          </AccordionPanel>
                        </div>

                        <br />
                        <h4>4. Wifi Setup</h4>
                        If you chose <b>Wifi</b> in step <b>3</b> you are now
                        presented with a connection interface. Select your
                        wifi network in the dropdown menu and enter the
                        password.
                        <br />
                        <br />

                        <div className="panel-group">
                          <AccordionPanel heading="Wifi setup">
                            <img
                              src="/images/wizard/4.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{ margin: 10 }}
                            />
                          </AccordionPanel>
                        </div>

                        <br />
                        <h4>5. [Expert Mode] Network Setup</h4>
                        If you chose <b>Expert Mode</b> in step <b>2</b> and{' '}
                        <b>Wired Connection</b> in step <b>3</b> you are now
                        presented with an interface for network settings.
                        Proceed with step <b>6</b> if you are either in{' '}
                        <b>Wizard Mode</b> or use a <b>Wireless Connection</b>
                        .
                        <br />
                        <br />

                        <div className="panel-group">
                          <AccordionPanel heading="Network setup">
                            <img
                              src="/images/wizard/10.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{ margin: 10 }}
                            />
                          </AccordionPanel>
                        </div>

                        <br />
                        <h4>6. Sensor Setup</h4>
                        You can now choose a name for your sensor to make it
                        more easily distinguishable in case you have multiple
                        sensors registered. Also, in order to be able to use
                        the data your sensor collects, we need to know where{' '}
                        <b>the antenna</b> is located. If you have a long
                        cable this position can be different from the
                        location of your sensor. Fill out all fields. You can
                        click on the antenna location in the map to quickly
                        determine the latitude and longitude values.
                        <br />
                        <br />

                        <div className="panel-group">
                          <AccordionPanel heading="Sensor details">
                            <img
                              src="/images/wizard/5.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{ margin: 10 }}
                            />
                          </AccordionPanel>
                        </div>

                        <br />
                        <h4>7. Registration</h4>
                        To finish up the wizard you need to register your
                        sensor at{' '}
                        <a href="https://specscape.org">specscape.org</a>.
                        The wizard now presents you with two input fields,
                        your electrosense username and the current sensor
                        registration token.
                        <br />
                        <br />

                        <div className="panel-group">
                          <AccordionPanel heading="Sensor registration interface">
                            <img
                              src="/images/wizard/6.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{ margin: 10 }}
                            />
                          </AccordionPanel>
                        </div>

                        <br />
                        If you don't have an account yet{' '}
                        <Link to="/account/register">create one</Link> first,
                        because your sensor will be associated with it. The
                        token changes every 5 minutes and expires after one
                        use or a failed registration attempt. Access your
                        token at{' '}
                        <a href="https://specscape.org/sensor-token">
                          specscape.org/sensor-token
                        </a>
                        .
                        <br />
                        <br />

                        <div className="panel-group">
                          <AccordionPanel heading="Sensor registration token">
                            <img
                              src="/images/wizard/7.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{ margin: 10 }}
                            />
                          </AccordionPanel>
                        </div>

                        <br />
                        Copy the token to the input field in the wizard
                        interface.
                        <br />
                        <br />

                        <div className="panel-group">
                          <AccordionPanel heading="Enter the token">
                            <img
                              src="/images/wizard/8.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{ margin: 10 }}
                            />
                          </AccordionPanel>
                        </div>

                        <br />
                        <h4>8. Finish</h4>
                        After clicking <b>Register</b> the wizard registers
                        your sensor and confirms the process by showing the
                        following screen:
                        <br />
                        <br />

                        <div className="panel-group">
                          <AccordionPanel heading="Registration finished">
                            <img
                              src="/images/wizard/9.png"
                              alt="..."
                              className="img-rounded text-center"
                              style={{ margin: 10 }}
                            />
                          </AccordionPanel>
                        </div>

                        <br />
                        The setup is now complete and you can close the
                        wizard.
                        <br />
                      </div>
                    </div>
                  </div>
                </AccordionPanel>
              </div>
            </AccordionPanel>

            <AccordionPanel heading="Buy a Sensor">
              <p>
                Purchasing a sensor is the easiest way to get started
                contributing to the SpecScape project. We will link to a
                product page when one is available.
              </p>
            </AccordionPanel>
          </div>
        </div>
      </div>
    </div>
  )
}
