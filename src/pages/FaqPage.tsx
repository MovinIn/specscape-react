import { Link } from 'react-router-dom'
import { AccordionPanel } from '../components/AccordionPanel'

export default function FaqPage() {
  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-12">
          <div className="page-header">
            <h2>Frequently Asked Questions</h2>
          </div>

          <p className="text-justify">
            On this page you will find a list with common questions and
            answers. If your question is not answered here, there is a{' '}
            <a
              href="https://groups.google.com/forum/#!forum/specscape"
              target="_blank"
              rel="noreferrer"
            >
              Google Group
            </a>{' '}
            where we will be happy to help you.
            <br />
            If you do not have a Google Account, you can simply send an
            e-mail to specscape at googlegroups dot com.
          </p>

          <hr />

          <div className="panel-group">
            <AccordionPanel
              heading="What are the requirements to host a sensor?"
              defaultOpen
            >
              <p>
                It doesn't take much to host a sensor. First of all, if you
                do not have registered, yet, <strong>create a{' '}
                <Link to="/account/register">SpecScape account</Link></strong>.
                If you have the <Link to="/hardware">necessary equipment</Link>{' '}
                you can start off and follow{' '}
                <Link to="/join">our guide to build your own</Link>.
                Otherwise, you can apply for a device from our stock using{' '}
                <a href="/sensor-application/add">the sponsoring form</a>.
                There are a few constraints regarding the sensor's
                environment:
              </p>
              <ul>
                <li>
                  <strong>Permanent internet connection</strong> - a
                  permanent internet connection which enables to feed data
                  24/7.
                </li>
                <li>
                  <strong>Ethernet connectivity</strong> - our sensors do
                  not have a WiFi module as it would caused interference
                  distorting measurements.
                </li>
                <li>
                  <strong>Low interference location</strong> - the sensor
                  should be set up at least 1m away from unshielded
                  electro-magnetical sources, such as WiFi access points to
                  avoid distorted measurements.
                </li>
              </ul>
            </AccordionPanel>

            <AccordionPanel
              heading="I have applied for a free sensor. How long does it take until I get it?"
              defaultOpen
            >
              <p>
                We have a limit amount of sensors on stock and decide how to
                distribute them on a regular basis. Usually we collect
                applications for a time span of four weeks and then decide
                on how to distrubute the current batch.
              </p>
            </AccordionPanel>

            <AccordionPanel
              heading="How long does it take to set up a sensor?"
              defaultOpen
            >
              <p>
                Setting up a sensor can be done within minutes. If you
                receive a device from our stock and your network supports
                DHCP, you just need to plug in the cables and that's it.
                <br />
                If you build your own sensor, we offer a pre-configured
                image which needs to be copied to an SD card. The whole
                process takes less than 15 minutes.
              </p>
            </AccordionPanel>

            <AccordionPanel
              heading="What is the best location for my sensor?"
              defaultOpen
            >
              <p>
                The sensors are meant to have a general perspective on the
                electro-magnetic spectrum. Thus, they should not be placed
                directly nearby strong, unshielded emitters such as WiFi
                access points or radio transmitters. We have seen strange
                measurements if the sensor's antenna is placed less than 1m
                away from such sources of noise.
              </p>
            </AccordionPanel>

            <AccordionPanel
              heading="Where do I find the current firmware for my Raspberry Pi?"
              defaultOpen
            >
              <p>
                The current version and installation instructions for your
                Raspberry Pi can be found{' '}
                <Link to="/open-source#image">here</Link>.
              </p>
            </AccordionPanel>

            <AccordionPanel heading="How can I log in on the sensor?" defaultOpen>
              <p>
                The sensor consists of a RaspberryPi and a software-defined
                radio. The latter implies that radio signals are processed
                in software on the CPU. Our sensors are constantly measuring
                the spectrum and occupy significant resources on the CPU and
                GPU. For this reason, other applications running on the same
                device could interfere with the measurements and cause
                incorrect time stamps. Therefore, we do not recommend to run
                any other software on the RaspberryPi and have disabled SSH
                login. You can view the data in the SpecScape web interface
                or use the <Link to="/api-spec">open API</Link> to retrieve
                data.
              </p>
            </AccordionPanel>

            <AccordionPanel
              heading="What is the extension board good for?"
              defaultOpen
            >
              <p>
                The RTL-SDR dongle used on our sensors has a limited
                frequency range between 24 and 1766MHz. This is already
                pretty good, but more interesting bands can be found above
                this limit. For this purpose, we have created an extension
                board that enables us to scan frequencies up to 6GHz which
                includes common ISM bands with lots of applications.
              </p>
            </AccordionPanel>

            <AccordionPanel
              heading="Where can I find your code and hardware design?"
              defaultOpen
            >
              <p>
                All our sensing software and hardware is open, so it's easy
                for anyone to have a look at how things actually work. For
                more information, have a look at the{' '}
                <Link to="/open-source">Open Source page</Link> or our{' '}
                <a
                  href="https://github.com/electrosense"
                  target="_blank"
                  rel="noreferrer"
                >
                  Github profile
                </a>
                .
              </p>
            </AccordionPanel>
          </div>
        </div>
      </div>
    </div>
  )
}
