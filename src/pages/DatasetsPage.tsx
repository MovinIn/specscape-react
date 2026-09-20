export default function DatasetsPage() {
  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-12">
          <div className="page-header">
            <h2>Datasets</h2>
          </div>

          <div className="panel panel-default">
            <div className="panel-heading" id="balloon">
              Weather Balloon Measurements
            </div>
            <div className="panel-body">
              <p className="text-justify">
                The full dataset of weather balloon measurements as
                described in our MobiSys '20 paper:
              </p>

              <blockquote className="publication">
                <strong>
                  SkySense: Terrestrial and Aerial Spectrum Use Analysed
                  Using Lightweight Sensing Technology with Weather Balloons
                </strong>
                <br />
                B.&nbsp;Reynders, F.&nbsp;Minucci, E.&nbsp;Perenda,
                H.&nbsp;Sallouha, R.&nbsp;Calvo-Palomino, Y.&nbsp;Lizarribar,
                M.&nbsp;Fuchs, M.&nbsp;Schäfer, M.&nbsp;Engel, B.&nbsp;Van den
                Bergh, S.&nbsp;Pollin, D.&nbsp;Giustiniano, G.&nbsp;Bovet,
                V.&nbsp;Lenders
                <br />
                <i>
                  The 18th ACM International Conference on Mobile Systems,
                  Applications and Services (MobiSys), 15-19 June 2020,
                  Toronto, Canada
                </i>
                <small>
                  <a
                    href="https://lirias.kuleuven.be/3036711?limo=0"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="glyphicon glyphicon-link" />
                    URL
                  </a>
                </small>
              </blockquote>

              <p className="pull-right">
                <a
                  href="https://repository.electrosense.org/datasets/mobisys20"
                  className="btn btn-default"
                  target="_blank"
                  rel="noreferrer"
                >
                  Browse Data
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
