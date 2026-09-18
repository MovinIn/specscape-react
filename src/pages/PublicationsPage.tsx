import { PageHeader } from '../components/PageHeader'

type Pub = {
  title: string
  authors: string
  venue: string
  href: string
}

const flagship: Pub = {
  title: 'Electrosense: Open and Big Spectrum Data',
  authors:
    'S. Rajendran, R. Calvo-Palomino, M. Fuchs, B. Van den Bergh, H. Cordobés, D. Giustiniano, S. Pollin, V. Lenders',
  venue: 'IEEE Communications Magazine, January 2018',
  href: 'http://eprints.networks.imdea.org/1733/1/08121869.pdf',
}

const articles: Pub[] = [
  {
    title:
      'Learning the unknown: Improving modulation classification performance in unseen scenarios',
    authors: 'E. Perenda, S. Rajendran, G. Bovet, S. Pollin, M. Zheleva',
    venue: 'IEEE INFOCOM 2021',
    href: 'http://www.cs.albany.edu/~mariya/lab/papers/m67919-perenda.pdf',
  },
  {
    title:
      'Large Scale Collaborative Detection and Location of Threats in the Electromagnetic Space',
    authors: 'D. Giustiniano, V. Lenders, S. Pollin',
    venue:
      'NATO Science for Peace and Security Series B: Physics and Biophysics, June 2020',
    href: 'https://eprints.networks.imdea.org/2168/1/SOCRATES.pdf',
  },
  {
    title: 'Large‐scale Wireless Spectrum Monitoring',
    authors: 'S. Rajendran, S. Pollin',
    venue: 'Spectrum Sharing (Wiley), April 2020',
    href: 'https://onlinelibrary.wiley.com/doi/pdf/10.1002/9781119551539.ch16',
  },
  {
    title:
      'SkySense: Terrestrial and Aerial Spectrum Use Analysed Using Lightweight Sensing Technology with Weather Balloons',
    authors:
      'B. Reynders, F. Minucci, E. Perenda, H. Sallouha, R. Calvo-Palomino, Y. Lizarribar, M. Fuchs, M. Schäfer, M. Engel, B. Van den Bergh, S. Pollin, D. Giustiniano, G. Bovet, V. Lenders',
    venue: 'ACM MobiSys 2020',
    href: 'https://eprints.networks.imdea.org/2146/',
  },
  {
    title: 'Electrosense+: Crowdsourcing Radio Spectrum Decoding using IoT Receivers',
    authors:
      'R. Calvo-Palomino, H. Cordobés de la Calle, M. Engel, M. Fuchs, P. Jain, M. Liechti, S. Rajendran, M. Schäfer, B. Van den Bergh, S. Pollin, D. Giustiniano, V. Lenders',
    venue: 'Computer Networks, vol. 174, June 2020',
    href: 'https://www.sciencedirect.com/science/article/abs/pii/S1389128619314471?dgcid=rss_sd_all',
  },
  {
    title: 'Crowdsourced wireless spectrum anomaly detection',
    authors: 'S. Rajendran, V. Lenders, W. Meert, S. Pollin',
    venue: 'IEEE Transactions on Cognitive Communications and Networking, June 2020',
    href: 'https://arxiv.org/abs/1903.05408',
  },
  {
    title:
      'Unsupervised Wireless Spectrum Anomaly Detection With Interpretable Features',
    authors: 'S. Rajendran, W. Meert, V. Lenders, S. Pollin',
    venue: 'IEEE TCCN, September 2019',
    href: 'https://ieeexplore.ieee.org/abstract/document/8692627',
  },
  {
    title:
      'Collaborative Wideband Signal Decoding using Non-coherent Receivers',
    authors:
      'R. Calvo-Palomino, H. Cordobes de la Calle, F. Ricciato, D. Giustiniano, V. Lenders',
    venue: 'ACM/IEEE IPSN 2019',
    href: 'http://eprints.networks.imdea.org/1962/1/Collaborative_Wideband_Signal_Decoding_using_Non-coherent_Receivers_2019_EN.pdf',
  },
  {
    title:
      'Deep Learning Models for Wireless Signal Classification with Distributed Low-Cost Spectrum Sensors',
    authors: 'S. Rajendran, W. Meert, D. Giustiniano, V. Lenders, S. Pollin',
    venue: 'IEEE TCCN, May 2018',
    href: 'https://ieeexplore.ieee.org/abstract/document/8357902/',
  },
  {
    title:
      'A Software-defined Sensor Architecture for Large-scale Wideband Spectrum Monitoring',
    authors: 'D. Pfammatter, D. Giustiniano, V. Lenders',
    venue: 'ACM/IEEE IPSN 2015',
    href: 'http://eprints.networks.imdea.org/998/1/Spectrum_IPSN2015.pdf',
  },
]

const demos: Pub[] = [
  {
    title: 'Electrosense - Spectrum Sensing with Increased Frequency Range (Demo)',
    authors:
      'F. Minucci, B. Van den Bergh, S. Rajendran, D. Giustiniano, H. Cordobés de la Calle, M. Fuchs, R. Calvo-Palomino, V. Lenders, S. Pollin',
    venue: 'EWSN 2018, Madrid',
    href: 'http://eprints.networks.imdea.org/1765/1/203_204_minucci.pdf',
  },
  {
    title: 'Electrosense: Crowdsourcing Spectrum Monitoring (Demo)',
    authors:
      'B. Van den Bergh, D. Giustiniano, H. Cordobes de la Calle, M. Fuchs, R. Calvo-Palomino, S. Pollin, S. Rajendran, V. Lenders',
    venue: 'IEEE DySPAN 2017, Baltimore',
    href: 'http://eprints.networks.imdea.org/1555/1/1570331174.pdf',
  },
  {
    title:
      'A Low-cost Sensor Platform for Large-scale Wideband Spectrum Monitoring (Demo)',
    authors: 'R. Calvo-Palomino, D. Pfammatter, D. Giustiniano, V. Lenders',
    venue: 'ACM/IEEE IPSN 2015, Seattle',
    href: 'http://eprints.networks.imdea.org/999/1/demo_IPSN2015.pdf',
  },
]

function PubBlock({ pub }: { pub: Pub }) {
  return (
    <blockquote>
      <strong>{pub.title}</strong>
      <br />
      {pub.authors}
      <br />
      <em>{pub.venue}</em>
      <br />
      <a href={pub.href} target="_blank" rel="noreferrer">
        Link
      </a>
    </blockquote>
  )
}

export default function PublicationsPage() {
  return (
    <div className="page page-narrow">
      <PageHeader
        title="Publications"
        lead="Research that shaped SpecScape / Electrosense and work that builds on the open spectrum corpus."
      />
      <div className="prose stack">
        <p>
          An overview of the project goals, technology, and scientific
          contribution appears in the Communications Magazine article below.
          When you publish using SpecScape data, cite this flagship paper.
        </p>
        <PubBlock pub={flagship} />

        <h2>Citing SpecScape</h2>
        <p>
          If you create a publication (papers, web pages, or public talks) that
          uses SpecScape / Electrosense data, cite the magazine article above
          and notify the team when possible.
        </p>

        <h2>Selected articles</h2>
        {articles.map((pub) => (
          <PubBlock key={pub.title} pub={pub} />
        ))}

        <h2>Demos</h2>
        {demos.map((pub) => (
          <PubBlock key={pub.title} pub={pub} />
        ))}
      </div>
    </div>
  )
}
