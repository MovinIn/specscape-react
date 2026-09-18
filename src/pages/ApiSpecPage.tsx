import { PageHeader } from '../components/PageHeader'

const endpoints = [
  {
    method: 'GET',
    path: '/sensor/list',
    description:
      'List sensors. Exact coordinates are omitted for other users’ devices to protect privacy.',
  },
  {
    method: 'GET',
    path: '/sensor/details/{serial}',
    description:
      'Sensor metadata for a serial. Optional time query retrieves historical meta when a node moved or changed frontend.',
  },
  {
    method: 'GET',
    path: '/spectrum/aggregated',
    description:
      'Aggregated spectrum for a sensor over [timeBegin, timeEnd] and [freqMin, freqMax], with aggTime / aggFreq resolution and AVG or MAX aggregation.',
  },
  {
    method: 'GET',
    path: '/spectrum/fft',
    description:
      'Raw FFT frames as received from a sensor. Restricted to your own devices; windows limited to a few minutes.',
  },
]

export default function ApiSpecPage() {
  return (
    <div className="page page-narrow">
      <PageHeader
        title="SpecScape Data API"
        lead="Retrieve sensor catalogs and spectrum measurements over HTTPS."
      />
      <div className="prose stack">
        <p className="panel">
          This page is a concise overview. The full OpenAPI / Swagger
          specification remains published with the Electrosense / SpecScape
          backend documentation (historically at electrosense.org). For working
          snippets, see the{' '}
          <a
            href="https://github.com/electrosense/api-examples"
            target="_blank"
            rel="noreferrer"
          >
            api-examples
          </a>{' '}
          repository.
        </p>

        <p>
          <strong>Base URL:</strong> <code>/api</code>
          <br />
          <strong>Version:</strong> 1.1 (released 2019-08-10)
          <br />
          <strong>Scheme:</strong> HTTPS
        </p>
        <p>
          The API exposes raw and aggregated spectrum data for research,
          education, and integration. Authenticate with HTTP basic auth using
          your SpecScape credentials (
          <code>https://user:pass@host/api/…</code>).
        </p>

        <h2>Main endpoints</h2>
        <div className="stack">
          {endpoints.map((ep) => (
            <section key={ep.path} className="panel stack">
              <h3>
                <code>
                  {ep.method} {ep.path}
                </code>
              </h3>
              <p>{ep.description}</p>
            </section>
          ))}
        </div>

        <h2>Aggregation limits (summary)</h2>
        <ul>
          <li>No resolution limits for your own sensors.</li>
          <li>
            Other sensors: coarsest allowed resolution is typically 60&nbsp;s
            and 100&nbsp;kHz.
          </li>
          <li>
            Aggregated queries must stay under roughly two million expected
            cells:{' '}
            <code>
              ((freqMax − freqMin) / aggFreq) × ((timeEnd − timeBegin) /
              aggTime)
            </code>
            .
          </li>
          <li>
            FFT queries are limited to about three minutes of wall time per
            request.
          </li>
        </ul>
      </div>
    </div>
  )
}
