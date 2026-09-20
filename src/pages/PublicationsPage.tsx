type Pub = {
  title: string
  authors: string
  venue: string
  url: string
}

const articles: Pub[] = [
  {
    title:
      'Learning the unknown: Improving modulation classification performance in unseen scenarios',
    authors: 'E. Perenda, S. Rajendran, G. Bovet, S. Pollin, M. Zheleva',
    venue:
      'IEEE INFOCOM 2021 - IEEE Conference on Computer Communications, 2021, pp. 1-10, May 2021',
    url: 'http://www.cs.albany.edu/~mariya/lab/papers/m67919-perenda.pdf',
  },
  {
    title:
      'Large Scale Collaborative Detection and Location of Threats in the Electromagnetic Space',
    authors: 'D. Giustiniano, V. Lenders, S. Pollin',
    venue:
      'Book chapter in Palestini C. (eds) Advanced Technologies for Security Applications. NATO Science for Peace and Security Series B: Physics and Biophysics, June 2020',
    url: 'https://eprints.networks.imdea.org/2168/1/SOCRATES.pdf',
  },
  {
    title: 'Large‐scale Wireless Spectrum Monitoring',
    authors: 'S. Rajendran, S. Pollin',
    venue:
      'Book chapter in Spectrum Sharing (eds C.B. Papadias, T. Ratnarajah and D.T. Slock), April 2020',
    url: 'https://onlinelibrary.wiley.com/doi/pdf/10.1002/9781119551539.ch16',
  },
  {
    title:
      'SkySense: Terrestrial and Aerial Spectrum Use Analysed Using Lightweight Sensing Technology with Weather Balloons',
    authors:
      'B. Reynders, F. Minucci, E. Perenda, H. Sallouha, R. Calvo-Palomino, Y. Lizarribar, M. Fuchs, M. Schäfer, M. Engel, B. Van den Bergh, S. Pollin, D. Giustiniano, G. Bovet, V. Lenders',
    venue:
      'The 18th ACM International Conference on Mobile Systems, Applications and Services (MobiSys), 15-19 June 2020, Toronto, Canada',
    url: 'https://eprints.networks.imdea.org/2146/',
  },
  {
    title: 'Electrosense+: Crowdsourcing Radio Spectrum Decoding using IoT Receivers',
    authors:
      'R. Calvo-Palomino, H. Cordobés de la Calle, M. Engel, M. Fuchs, P. Jain, M. Liechti, S. Rajendran, M. Schäfer, B. Van den Bergh, S. Pollin, D. Giustiniano, V. Lenders',
    venue: 'Computer Networks, vol. 174, June 2020',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S1389128619314471?dgcid=rss_sd_all',
  },
  {
    title: 'Crowdsourced wireless spectrum anomaly detection',
    authors: 'S. Rajendran, V. Lenders, W. Meert, S. Pollin',
    venue:
      'IEEE Transactions on Cognitive Communications and Networking, vol. 6, no. 2, pp. 694-703, June 2020',
    url: 'https://arxiv.org/abs/1903.05408',
  },
  {
    title: 'Unsupervised Wireless Spectrum Anomaly Detection With Interpretable Features',
    authors: 'S. Rajendran, W. Meert, V. Lenders, S. Pollin',
    venue:
      'IEEE Transactions on Cognitive Communications and Networking, vol. 5, no. 3, pp. 637-647, September 2019',
    url: 'https://ieeexplore.ieee.org/abstract/document/8692627',
  },
  {
    title: 'Automatic Modulation Classification Using Parallel Fusion of Convolutional Neural Networks',
    authors: 'E. Perenda, S. Rajendran, S. Pollin',
    venue:
      'Third International Balkan Conference on Communications and Networking, 10-12 June 2019, Skopje, North Macedonia',
    url: 'https://lirias.kuleuven.be/retrieve/546033',
  },
  {
    title: 'Collaborative Wideband Signal Decoding using Non-coherent Receivers',
    authors: 'R. Calvo-Palomino, H. Cordobes de la Calle, F. Ricciato, D. Giustiniano, V. Lenders',
    venue:
      'ACM/IEEE International Conference on Information Processing in Sensor Networks (IPSN 2019), 14-16 April 2019, Montreal, Canada',
    url: 'http://eprints.networks.imdea.org/1962/1/Collaborative_Wideband_Signal_Decoding_using_Non-coherent_Receivers_2019_EN.pdf',
  },
  {
    title: 'SAIFE: Unsupervised Wireless Spectrum Anomaly Detection with Interpretable Features',
    authors: 'S. Rajendran, W. Meert, V. Lenders, S. Pollin',
    venue:
      'IEEE International Symposium on Dynamic Spectrum Access Networks (DySPAN 2018), 22-25 October 2018, Seoul, South Korea',
    url: 'https://arxiv.org/pdf/1807.08316',
  },
  {
    title: 'Deep Learning Models for Wireless Signal Classification with Distributed Low-Cost Spectrum Sensors',
    authors: 'S. Rajendran, W. Meert, D. Giustiniano, V. Lenders, S. Pollin',
    venue: 'IEEE Transactions on Cognitive Communications and Networking, 11 May 2018',
    url: 'https://ieeexplore.ieee.org/abstract/document/8357902/',
  },
  {
    title: 'LTESS-track: A Precise and Fast Frequency Offset Estimation for Low-cost SDR Platforms',
    authors: 'R. Calvo-Palomino, F. Ricciato, D. Giustiniano, V. Lenders',
    venue:
      'ACM Workshop on Wireless Network Testbeds, Experimental evaluation & Characterization (WINTECH), Oct 2017, Utah, USA',
    url: 'http://www.lenders.ch/publications/conferences/WINTECH17.pdf',
  },
  {
    title: 'Measuring Spectrum Similarity in Distributed Radio Monitoring Systems',
    authors: 'R. Calvo-Palomino, D. Giustiniano, V. Lenders',
    venue:
      'Tyrrhenian International Workshop on Digital Communications (TIWDC 2017), 18-20 September 2017, Mondello (Palermo), Italy',
    url: 'http://eprints.networks.imdea.org/1650/1/paper.pdf',
  },
  {
    title: 'Crowdsourcing Spectrum Data Decoding',
    authors: 'R. Calvo-Palomino, D. Giustiniano, V. Lenders, A. Fakhreddine',
    venue: 'IEEE INFOCOM 2017, 1-4 May 2017, Atlanta, GA, USA',
    url: 'http://eprints.networks.imdea.org/1524/1/paper_camera_ready_4628451.pdf',
  },
  {
    title: 'A Software-defined Sensor Architecture for Large-scale Wideband Spectrum Monitoring',
    authors: 'D. Pfammatter, D. Giustiniano, V. Lenders',
    venue:
      'ACM/IEEE International Conference on Information Processing in Sensor Networks (IPSN 2015), 13-16 April 2015, Seattle, USA',
    url: 'http://eprints.networks.imdea.org/998/1/Spectrum_IPSN2015.pdf',
  },
]

const demos: Pub[] = [
  {
    title: 'Electrosense - Spectrum Sensing with Increased Frequency Range (Demo)',
    authors:
      'F. Minucci, B. Van den Bergh, S. Rajendran, D. Giustiniano, H. Cordobés de la Calle, M. Fuchs, R. Calvo-Palomino, V. Lenders, S. Pollin',
    venue:
      'The 15th International Conference on Embedded Wireless Systems and Networks (EWSN 2018), 14-16 February 2018, Madrid, Spain',
    url: 'http://eprints.networks.imdea.org/1765/1/203_204_minucci.pdf',
  },
  {
    title: 'Electrosense: Crowdsourcing Spectrum Monitoring (Demo)',
    authors:
      'B. Van den Bergh, D. Giustiniano, H. Cordobes de la Calle, M. Fuchs, R. Calvo-Palomino, S. Pollin, S. Rajendran, V. Lenders',
    venue:
      'IEEE International Symposium on Dynamic Spectrum Access Networks (DySPAN 2017), 6-9 March 2017, Baltimore, MD, USA',
    url: 'http://eprints.networks.imdea.org/1555/1/1570331174.pdf',
  },
  {
    title: 'A Low-cost Sensor Platform for Large-scale Wideband Spectrum Monitoring (Demo)',
    authors: 'R. Calvo-Palomino, D. Pfammatter, D. Giustiniano, V. Lenders',
    venue: 'ACM/IEEE IPSN 2015, 13-16 April 2015, Seattle, USA',
    url: 'http://eprints.networks.imdea.org/999/1/demo_IPSN2015.pdf',
  },
]

function PublicationEntry({ pub }: { pub: Pub }) {
  return (
    <blockquote className="publication">
      <strong>{pub.title}</strong>
      <br />
      {pub.authors}
      <br />
      <i>{pub.venue}</i>
      <small>
        <a href={pub.url} target="_blank" rel="noreferrer">
          <span className="glyphicon glyphicon-link" />
          URL
        </a>
      </small>
    </blockquote>
  )
}

export default function PublicationsPage() {
  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-12">
          <div className="page-header">
            <h2>Publications</h2>
          </div>

          <p>
            An extensive description of the ElectroSense project, its
            goals, technology and contribution to the scientific community
            can be found in our magazine article:
          </p>

          <blockquote>
            <strong>Electrosense: Open and Big Spectrum Data</strong>
            <br />
            S. Rajendran, R. Calvo-Palomino, M. Fuchs, B. Van den Bergh, H.
            Cordobés, D. Giustiniano, S. Pollin, V. Lenders
            <br />
            <i>IEEE Communications Magazine, January 2018</i>
            <br />
            <small>
              <a
                href="http://eprints.networks.imdea.org/1733/1/08121869.pdf"
                target="_blank"
                rel="noreferrer"
              >
                <span className="glyphicon glyphicon-link" />
                URL
              </a>
            </small>
          </blockquote>

          <h3>Citing ElectroSense</h3>

          <p>
            If you create a publication (including web pages, papers
            published by a third party, and publicly available
            presentations) using data from ElectroSense, you should cite
            the above magazine article.
          </p>

          <h3>Publications using ElectroSense</h3>

          <h4>Articles</h4>

          {articles.map((pub) => (
            <PublicationEntry key={pub.title} pub={pub} />
          ))}

          <h4>Demos</h4>

          {demos.map((pub) => (
            <PublicationEntry key={pub.title} pub={pub} />
          ))}
        </div>
      </div>
    </div>
  )
}
