export default function PartnersPage() {
  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-12">
          <div className="page-header">
            <h2>Partners</h2>
          </div>

          <p className="text-justify">
            SpecScape is a project that could not exist without its feeders
            and supporters from industry, academia, and private
            enthusiasts. We would like to thank everyone for their
            contributions! If your company or institution wants to become a
            partner of the SpecScape Network, you can support us, e.g., by
            sponsoring a receiver or helping us improve our network with
            your expertise. In return, you can work together closely with
            our researchers and developers and directly benefit from our
            knowledge. If you are supporting the SpecScape Network but the
            logo of your organization is missing, please contact us.
          </p>
          <div className="row" style={{ marginTop: 25 }}>
            <div className="col-sm-offset-1 col-sm-3 text-center img-space">
              <a
                href="http://www.ar.admin.ch/internet/armasuisse/de/home/themen/armasuisseWissenschaftundTechnologie.html"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src="/images/armasuisse_logo.gif"
                  width={220}
                  height={69}
                  alt="armasuisse"
                />
              </a>
            </div>
            <div className="col-sm-3 text-center img-space">
              <a href="http://www.networks.imdea.org" target="_blank" rel="noreferrer">
                <img src="/images/imdea_logo.png" alt="IMDEA Networks" />
              </a>
            </div>
            <div className="col-sm-3 text-center img-space">
              <a href="http://www.kuleuven.be/" target="_blank" rel="noreferrer">
                <img
                  src="/images/ku_leuven_logo.png"
                  width={180}
                  height={65}
                  alt="KU Leuven"
                />
              </a>
            </div>
          </div>
          <div className="row" style={{ marginTop: 25 }}>
            <div className="col-sm-offset-1 col-sm-3 text-center img-space">
              <a href="https://sero-systems.de" target="_blank" rel="noreferrer">
                <img
                  src="/images/sero_systems_logo.png"
                  width={140}
                  height={70}
                  alt="SERO systems"
                />
              </a>
            </div>
            <div className="col-sm-3 text-center img-space">
              <a href="https://www.uni-lj.si/eng/" target="_blank" rel="noreferrer">
                <img
                  src="/images/ljubliana.png"
                  width={220}
                  height={100}
                  alt="University of Ljubljana"
                />
              </a>
            </div>
            <div className="col-sm-3 text-center img-space">
              <a href="https://jetvision.de" target="_blank" rel="noreferrer">
                <img
                  src="/images/jetvision_logo.png"
                  width={190}
                  height={71}
                  alt="Jetvision"
                />
              </a>
            </div>
          </div>
          <div className="row" style={{ marginTop: 25 }}>
            <div className="col-sm-offset-4 col-sm-3 text-center img-space">
              <a href="https://www.um.es" target="_blank" rel="noreferrer">
                <img
                  src="/images/um_logo.png"
                  width={200}
                  height={53}
                  alt="University of Murcia"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
