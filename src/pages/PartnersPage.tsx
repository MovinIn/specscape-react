import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

const partners = [
  {
    name: 'armasuisse Science and Technology',
    href: 'http://www.ar.admin.ch/internet/armasuisse/de/home/themen/armasuisseWissenschaftundTechnologie.html',
  },
  {
    name: 'IMDEA Networks',
    href: 'http://www.networks.imdea.org',
  },
  {
    name: 'KU Leuven',
    href: 'http://www.kuleuven.be/',
  },
  {
    name: 'SERO systems',
    href: 'https://sero-systems.de',
  },
  {
    name: 'University of Ljubljana',
    href: 'https://www.uni-lj.si/eng/',
  },
  {
    name: 'Jetvision',
    href: 'https://jetvision.de',
  },
  {
    name: 'University of Murcia',
    href: 'https://www.um.es',
  },
]

export default function PartnersPage() {
  return (
    <div className="page page-narrow">
      <PageHeader
        title="Partners"
        lead="SpecScape exists because of feeders, researchers, and industry supporters who keep the network alive."
      />
      <div className="prose stack">
        <p>
          SpecScape is a collaborative spectrum monitoring initiative that would
          not scale without hosts and partners from academia, industry, and the
          enthusiast community. Organizations can sponsor receivers, contribute
          expertise, and work closely with the research and engineering teams
          behind the platform. If you already support the network but your
          organization is missing here, please{' '}
          <Link to="/contact">contact us</Link>.
        </p>
        <div className="grid-2">
          {partners.map((partner) => (
            <a
              key={partner.name}
              className="panel"
              href={partner.href}
              target="_blank"
              rel="noreferrer"
            >
              <strong>{partner.name}</strong>
            </a>
          ))}
        </div>
        <p>
          Interested in a deeper collaboration? See{' '}
          <Link to="/work-with-us">Work with Us</Link> or{' '}
          <Link to="/join">host a sensor</Link>.
        </p>
      </div>
    </div>
  )
}
