import { PageHeader } from '../components/PageHeader'

export default function DatasetsPage() {
  return (
    <div className="page page-narrow">
      <PageHeader
        title="Datasets"
        lead="Curated measurement releases for research, teaching, and reproducible experiments."
      />
      <div className="prose stack">
        <section className="panel stack" id="balloon">
          <h2>Weather balloon measurements</h2>
          <p>
            Full dataset accompanying the SkySense MobiSys ’20 paper on
            terrestrial and aerial spectrum use with lightweight sensors flown
            on weather balloons.
          </p>
          <blockquote>
            <strong>
              SkySense: Terrestrial and Aerial Spectrum Use Analysed Using
              Lightweight Sensing Technology with Weather Balloons
            </strong>
            <br />
            B.&nbsp;Reynders, F.&nbsp;Minucci, E.&nbsp;Perenda, H.&nbsp;Sallouha,
            R.&nbsp;Calvo-Palomino, Y.&nbsp;Lizarribar, M.&nbsp;Fuchs,
            M.&nbsp;Schäfer, M.&nbsp;Engel, B.&nbsp;Van den Bergh, S.&nbsp;Pollin,
            D.&nbsp;Giustiniano, G.&nbsp;Bovet, V.&nbsp;Lenders
            <br />
            <em>
              The 18th ACM International Conference on Mobile Systems,
              Applications and Services (MobiSys), June 2020
            </em>
            <br />
            <a
              href="https://lirias.kuleuven.be/3036711?limo=0"
              target="_blank"
              rel="noreferrer"
            >
              Paper link
            </a>
          </blockquote>
          <p>
            <a
              className="btn btn-primary"
              href="https://repository.electrosense.org/datasets/mobisys20"
              target="_blank"
              rel="noreferrer"
            >
              Browse data
            </a>
          </p>
        </section>
        <p className="muted">
          Additional I/Q and campaign datasets appear in the authenticated app
          under I/Q Data Sets when available. Prefer citing SpecScape /
          Electrosense publications when you publish results derived from these
          releases.
        </p>
      </div>
    </div>
  )
}
