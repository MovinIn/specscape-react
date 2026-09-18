import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export default function WorkWithUsPage() {
  return (
    <div className="page page-narrow">
      <PageHeader title="Work with Us" />
      <div className="prose stack">
        <p>
          There are no open PhD positions available at the moment. If you would
          like to contribute to the project, we are happy to welcome you as a
          host for one of our sensors!
        </p>
        <p>
          <Link className="btn btn-primary" to="/join">
            Host a Sensor
          </Link>
        </p>
      </div>
    </div>
  )
}
