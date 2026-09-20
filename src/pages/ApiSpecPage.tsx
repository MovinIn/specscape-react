type Param = {
  name: string
  description: string
  type: string
  format?: string
  in: 'path' | 'query'
  required?: boolean
}

type Response = {
  status: string
  label: string
  description: string
  schemaRef: string
  schemaName: string
}

type Operation = {
  pathId: string
  operationId: string
  path: string
  summary: string
  description: React.ReactNode
  params?: Param[]
  responses: Response[]
  hasSecurity?: boolean
}

const operations: Operation[] = [
  {
    pathId: 'path--sensor-list',
    operationId: 'operation--sensor-list-get',
    path: '/sensor/list',
    summary: 'Get a list of all sensors',
    description: (
      <p>
        Sensor information for others&apos; sensors does not contain exact
        location information to preserve privacy.
      </p>
    ),
    responses: [
      {
        status: '200',
        label: '200 OK',
        description: 'Details for all sensors',
        schemaRef: '#/definitions/Sensor',
        schemaName: 'Sensor',
      },
      {
        status: '400',
        label: '400 Bad Request',
        description: 'Bad Request (wrong or missing parameters)',
        schemaRef: '#/definitions/ErrorMessages',
        schemaName: 'ErrorMessages',
      },
    ],
    hasSecurity: true,
  },
  {
    pathId: 'path--sensor--serial-',
    operationId: 'operation--sensor--serial--get',
    path: '/sensor/details/{serial}',
    summary: 'Get information about a single sensor',
    description: (
      <p>
        By default, information is returned for the current state of the
        sensor. As this information is subject to change, e.g., when the
        location changes, the meta information for a device can be retrieved
        for an arbitrary point in time.
      </p>
    ),
    params: [
      {
        name: 'serial',
        description: 'sensor serial number',
        type: 'integer',
        format: 'int64',
        in: 'path',
        required: true,
      },
      {
        name: 'time',
        description:
          'Time to retrieve meta information in seconds since epoch (Unix time), default is the time of the method call.',
        type: 'integer',
        format: 'int32',
        in: 'query',
      },
    ],
    responses: [
      {
        status: '200',
        label: '200 OK',
        description: 'Details for the requested sensor',
        schemaRef: '#/definitions/Sensor',
        schemaName: 'Sensor',
      },
      {
        status: '400',
        label: '400 Bad Request',
        description: 'Bad Request (wrong or missing parameters)',
        schemaRef: '#/definitions/ErrorMessages',
        schemaName: 'ErrorMessages',
      },
      {
        status: '404',
        label: '404 Not Found',
        description: 'No sensor with the given name',
        schemaRef: '#/definitions/ErrorMessages',
        schemaName: 'ErrorMessages',
      },
    ],
    hasSecurity: true,
  },
  {
    pathId: 'path--spectrum-aggregated',
    operationId: 'operation--spectrum-aggregated-get',
    path: '/spectrum/aggregated',
    summary: 'Retrieve (aggregated) spectrum measurements of a particular sensor',
    description: (
      <>
        <p>
          Data can be retrieved for a single sensor within a time window
          [timeBegin, timeEnd] and for frequency range [freqMin, freqMax].
          Aggregation takes place in time and frequency domain with the given
          resolutions aggTime and aggFreq. Samples having time tSample and
          frequency fSample are put into bins with{' '}
        </p>
        <ul>
          <li>time tBin = tSample - tSample mod aggTime</li>
          <li>frequency fBin = fSample - fSample mod aggFreq</li>
        </ul>
        <p>
          Each bin contains a single value which results from the
          application of an aggregation function over all squared magnitudes
          of the bin&apos;s samples. It can be chosen between the maximum and
          the average.
        </p>
        <h3 id="limitations">Limitations</h3>
        <ul>
          <li>No restrictions for own device</li>
          <li>
            Highest resolution for all other devices: 60s, 100kHz. This means
            that the lowest values for aggTime and aggFreq are 60 and 100000
            if you want to retrieve data other than from your own device.
          </li>
          <li>
            The query must not ask for more than an expected number of 2
            million result values. The expected number of values depends on
            all parameters and can be computed using the following formula:
            |V| = ((freqMax - freqMin) / aggFreq) * ((timeEnd - timeBegin) /
            aggTime)
          </li>
        </ul>
      </>
    ),
    params: [
      {
        name: 'sensor',
        description: 'sensor serial number',
        type: 'number',
        in: 'query',
        required: true,
      },
      {
        name: 'timeBegin',
        description: 'start time in seconds since epoch (Unix time)',
        type: 'number',
        in: 'query',
        required: true,
      },
      {
        name: 'timeEnd',
        description: 'end time in seconds since epoch (Unix time)',
        type: 'number',
        in: 'query',
        required: true,
      },
      {
        name: 'freqMin',
        description: 'lower bound for frequency in Hz',
        type: 'number',
        in: 'query',
        required: true,
      },
      {
        name: 'freqMax',
        description: 'upper bound for frequency in Hz',
        type: 'number',
        in: 'query',
        required: true,
      },
      {
        name: 'aggFreq',
        description: 'frequency resolution',
        type: 'number',
        in: 'query',
        required: true,
      },
      {
        name: 'aggTime',
        description: 'time resolution',
        type: 'number',
        in: 'query',
        required: true,
      },
      {
        name: 'aggFun',
        description:
          'aggregation function, either "MAX" or "AVG", default is "AVG"',
        type: 'string',
        in: 'query',
      },
    ],
    responses: [
      {
        status: '200',
        label: '200 OK',
        description: 'Aggregated spectrum data',
        schemaRef: '#/definitions/AggregatedData',
        schemaName: 'AggregatedData',
      },
      {
        status: '400',
        label: '400 Bad Request',
        description: 'Bad Request (wrong or missing parameters)',
        schemaRef: '#/definitions/ErrorMessages',
        schemaName: 'ErrorMessages',
      },
    ],
  },
  {
    pathId: 'path--spectrum-fft',
    operationId: 'operation--spectrum-fft-get',
    path: '/spectrum/fft',
    summary: 'Retrieve FFT measurements as received by the sensor',
    description: (
      <>
        <p>Access FFT measurements as we receive them by the sensor.</p>
        <h3 id="limitations-fft">Limitations</h3>
        <ul>
          <li>No restrictions for own device</li>
          <li>No access for all other devices</li>
          <li>
            The query must not ask for more than 3 minutes of data, i.e., it
            must hold that timeEnd - timeBegin &lt;= 180.
          </li>
        </ul>
      </>
    ),
    params: [
      {
        name: 'sensor',
        description: 'sensor serial number',
        type: 'integer',
        format: 'int64',
        in: 'query',
        required: true,
      },
      {
        name: 'timeBegin',
        description: 'start time in seconds since epoch (Unix time)',
        type: 'number',
        in: 'query',
        required: true,
      },
      {
        name: 'timeEnd',
        description: 'end time in seconds since epoch (Unix time)',
        type: 'number',
        in: 'query',
        required: true,
      },
    ],
    responses: [
      {
        status: '200',
        label: '200 OK',
        description: 'Raw FFT measurements for the requested time span',
        schemaRef: '#/definitions/RawFFTData',
        schemaName: 'RawFFTData',
      },
      {
        status: '400',
        label: '400 Bad Request',
        description: 'Bad Request (wrong or missing parameters)',
        schemaRef: '#/definitions/ErrorMessages',
        schemaName: 'ErrorMessages',
      },
    ],
    hasSecurity: true,
  },
]

function OperationPanel({ op }: { op: Operation }) {
  return (
    <>
      <span id={op.pathId} />
      <div id={op.operationId} className="swagger--panel-operation-get panel">
        <div className="panel-heading">
          <div className="operation-summary">{op.summary}</div>
          <h3 className="panel-title">
            <span className="operation-name">GET</span>{' '}
            <strong>{op.path}</strong>
          </h3>
        </div>
        <div className="panel-body">
          <section className="sw-operation-description">
            {op.description}
          </section>

          {op.params && (
            <section className="sw-request-params">
              <table className="table">
                <thead>
                  <tr>
                    <th className="sw-param-name" />
                    <th className="sw-param-description" />
                    <th className="sw-param-type" />
                    <th className="sw-param-data-type" />
                    <th className="sw-param-annotation" />
                  </tr>
                </thead>
                <tbody>
                  {op.params.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>
                        <p>{p.description}</p>
                      </td>
                      <td>{p.in}</td>
                      <td>
                        <span className="json-property-type">{p.type}</span>
                        {p.format ? (
                          <>
                            {' '}
                            <span className="json-property-format">
                              ({p.format})
                            </span>
                          </>
                        ) : null}
                      </td>
                      <td>
                        {p.required ? (
                          <span className="json-property-required" />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="sw-responses">
            <dl>
              {op.responses.map((r) => (
                <div key={r.status}>
                  <dt className={`sw-response-${r.status}`}>{r.label}</dt>
                  <dd className={`sw-response-${r.status}`}>
                    <div className="row">
                      <div className="col-md-12">
                        <p>{r.description}</p>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 sw-response-model">
                        <div className="panel panel-definition">
                          <div className="panel-body">
                            <a className="json-schema-ref" href={r.schemaRef}>
                              {r.schemaName}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {op.hasSecurity && (
            <section className="sw-request-security">
              <table className="table">
                <thead>
                  <tr>
                    <th className="sw-request-security-schema" />
                    <th className="sw-request-security-scopes" />
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <a href="#security-definition-basicAuth">basicAuth</a>
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </>
  )
}

export default function ApiSpecPage() {
  return (
    <div className="container">
      <div className="container">
        <h1>SpecScape Data API</h1>

        <div className="alert alert-success">
          For code snippets and examples on how to use this API, have a look
          at the{' '}
          <a
            href="https://github.com/electrosense/api-examples"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#e7f0f7', fontWeight: 'bold' }}
          >
            Github repository
          </a>
          .
        </div>

        <p className="sw-info">
          Base URL: <span className="sw-info-basePath">/api</span>, Version:{' '}
          <span className="sw-info-version">1.1 (released 2019-08-10)</span>
        </p>
        <p>This Web API allows for retrieval of raw and aggregated spectrum data.</p>

        <div id="sw-schemes" className="sw-default-value">
          <span className="sw-default-value-header">Schemes:</span> https
        </div>

        <h2 id="swagger--summary-no-tags">Summary</h2>
        <table className="table table-bordered table-condensed swagger--summary">
          <thead>
            <tr>
              <th>Path</th>
              <th>Operation</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((op) => (
              <tr key={op.path}>
                <td className="swagger--summary-path" rowSpan={1}>
                  <a href={`#${op.pathId}`}>{op.path}</a>
                </td>
                <td>
                  <a href={`#${op.operationId}`}>GET</a>
                </td>
                <td>
                  <p>{op.summary}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Security</h2>

        <div
          id="security-definition-basicAuth"
          className="panel panel-security-definition panel-security-definition-basic"
        >
          <div className="panel-heading">
            <h3 className="panel-title">
              <span className="security-name">basicAuth</span>
            </h3>
            Type: basic
          </div>
          <div className="panel-body">
            <section className="sw-security-properties">
              <p>
                Access via basic auth is simple. Just include username and
                password in the request URI like this:{' '}
                <i>https://username:password@specscape.org/api/...</i>
              </p>
            </section>
          </div>
        </div>

        <h2>Paths</h2>

        {operations.map((op) => (
          <OperationPanel key={op.path} op={op} />
        ))}

        <h2>Schema definitions</h2>

        <div id="definition-AggregatedData" className="panel panel-definition">
          <div className="panel-heading">
            <h3 className="panel-title">
              <a id="/definitions/AggregatedData" />
              AggregatedData:{' '}
              <span className="json-property-type">object</span>
            </h3>
          </div>
          <div className="panel-body">
            <section className="json-schema-properties">
              <dl>
                <dt>
                  <span className="json-property-name">startFreq:</span>{' '}
                  <span className="json-property-type">integer</span>{' '}
                  <span className="json-property-format">(int64)</span>{' '}
                  <span className="json-property-required" />
                </dt>
                <dd>
                  <p>Frequency of the first entry in &apos;values&apos;</p>
                </dd>
                <dt>
                  <span className="json-property-name">startTime:</span>{' '}
                  <span className="json-property-type">integer</span>{' '}
                  <span className="json-property-format">(int64)</span>{' '}
                  <span className="json-property-required" />
                </dt>
                <dd>
                  <p>Time of the first entry in &apos;values&apos;</p>
                </dd>
                <dt>
                  <span className="json-property-name">timeRes:</span>{' '}
                  <span className="json-property-type">integer</span>{' '}
                  <span className="json-property-format">(int64)</span>{' '}
                  <span className="json-property-required" />
                </dt>
                <dd>
                  <p>
                    Time difference between two consecutive rows in
                    &apos;values&apos;. The i-th row in values has time
                    startTime + i*(timeRes - 1)
                  </p>
                </dd>
                <dt>
                  <span className="json-property-name">freqRes:</span>{' '}
                  <span className="json-property-type">integer</span>{' '}
                  <span className="json-property-format">(int64)</span>{' '}
                  <span className="json-property-required" />
                </dt>
                <dd>
                  <p>
                    Difference in frequency between two consecutive columns
                    in &apos;values&apos;. The j-th column in values has
                    frequency startFreq + j*(freqRes - 1)
                  </p>
                </dd>
                <dt>
                  <span className="json-property-name">noiseFloor:</span>{' '}
                  <span className="json-property-type">number</span>{' '}
                  <span className="json-property-format">(float)</span>
                </dt>
                <dd>
                  <p>
                    An estimation for the noise floor. See the external
                    documentation.
                  </p>
                </dd>
                <dt>
                  <span className="json-property-name">values:</span>{' '}
                  <span className="json-property-type">number[][]</span>
                </dt>
                <dd>
                  <p>
                    A two-dimensional Array (Matrix) of SNR values in dB.
                    Each row contains (aggregated) measurements for the same
                    time t, each column measurements for the same frequency
                    f. An entry v[i][j] has time startTime + i*(timeRes - 1)
                    and frequency startFreq + j*(freqRes - 1).
                  </p>
                  <p>
                    There might be no measurements available for certain
                    frequencies and times. In this case the entry v[i][j] =
                    &apos;null&apos;.
                  </p>
                  <p>
                    The SNR is computed based on the estimated noise floor.
                    If you need the squared magnitudes, add the value of the{' '}
                    <code>noiseFloor</code> field.
                  </p>
                  <div className="json-inner-schema">
                    <section className="json-schema-array-items">
                      <span className="json-property-type">number[]</span>
                      <div className="json-inner-schema">
                        <section className="json-schema-array-items">
                          <span className="json-property-type">number</span>{' '}
                          <span className="json-property-format">
                            (float)
                          </span>
                        </section>
                      </div>
                    </section>
                  </div>
                </dd>
              </dl>
            </section>
          </div>
        </div>

        <div id="definition-ErrorMessages" className="panel panel-definition">
          <div className="panel-heading">
            <h3 className="panel-title">
              <a id="/definitions/ErrorMessages" />
              ErrorMessages:{' '}
              <span className="json-property-type">string[]</span>
            </h3>
          </div>
          <div className="panel-body">
            <section className="json-schema-description">
              <p>Contains a list of errors</p>
            </section>
            <section className="json-schema-array-items">
              <span className="json-property-type">string</span>
            </section>
          </div>
        </div>

        <div id="definition-RawFFTData" className="panel panel-definition">
          <div className="panel-heading">
            <h3 className="panel-title">
              <a id="/definitions/RawFFTData" />
              RawFFTData:{' '}
              <span className="json-property-type">object</span>
            </h3>
          </div>
          <div className="panel-body">
            <section className="json-schema-properties">
              <dl>
                <dt>
                  <span className="json-property-name">SenId:</span>{' '}
                  <span className="json-property-type">integer</span>{' '}
                  <span className="json-property-format">(int64)</span>{' '}
                  <span className="json-property-required" />
                </dt>
                <dd>
                  <p>
                    sensor serial number (MAC address in decimal
                    representation)
                  </p>
                </dd>
                <dt>
                  <span className="json-property-name">SenConf:</span>{' '}
                  <span className="json-property-type">object</span>{' '}
                  <span className="json-property-required" />
                </dt>
                <dd>
                  <div className="json-inner-schema">
                    <section className="json-schema-properties">
                      <dl>
                        <dt>
                          <span className="json-property-name">
                            HoppingStrategy:
                          </span>{' '}
                          <span className="json-property-type">integer</span>
                        </dt>
                        <dd>
                          <p>
                            Identifier of the hopping strategy used to
                            overcome the bandwidth limitations of the RF
                            front-end. [0:Sequential, 1:Random, 2:Similarity]
                          </p>
                        </dd>
                        <dt>
                          <span className="json-property-name">
                            WindowingFunction:
                          </span>{' '}
                          <span className="json-property-type">integer</span>
                        </dt>
                        <dd>
                          <p>
                            Identifier of the windowing function used to
                            reshape the time-domain samples. [0:Rectangular,
                            1:Hanning, 2:BlackmanHarris]
                          </p>
                        </dd>
                        <dt>
                          <span className="json-property-name">
                            FFTSize:
                          </span>{' '}
                          <span className="json-property-type">integer</span>
                        </dt>
                        <dd>
                          <p>
                            Size of the fast Fourier transform (FFT), i.e.
                            the number of samples in the frequency-domain
                            representation of a signal. [2^i, where i in
                            {'{8,...,17}'}]
                          </p>
                        </dd>
                        <dt>
                          <span className="json-property-name">
                            AveragingFactor:
                          </span>{' '}
                          <span className="json-property-type">integer</span>
                        </dt>
                        <dd>
                          <p>
                            Number of frequency-domain signals to average.
                            [&gt;0]
                          </p>
                        </dd>
                        <dt>
                          <span className="json-property-name">
                            FrequencyOverlap:
                          </span>{' '}
                          <span className="json-property-type">number</span>
                        </dt>
                        <dd>
                          <p>
                            Fraction of the frequency-domain signals to drop
                            due to non-linear frequency responses of the RF
                            front-end. The effective number of samples in
                            frequency-domain signals is reduced from FFTSize
                            to (1-FrequencyOverlap)*(FFTSize+1). The
                            bandwidth of the frequency-domain signals is
                            reduced from FFTSize*FrequencyResolution to
                            (1-FrequencyOverlap)*FFTSize*FrequencyResolution.
                            [0,...,1]
                          </p>
                        </dd>
                        <dt>
                          <span className="json-property-name">
                            FrequencyResolution:
                          </span>{' '}
                          <span className="json-property-type">number</span>
                        </dt>
                        <dd>
                          <p>
                            Frequency difference in Hz between successive
                            samples within the frequency-domain signals.
                            [&gt;0]
                          </p>
                        </dd>
                        <dt>
                          <span className="json-property-name">Gain:</span>{' '}
                          <span className="json-property-type">number</span>
                        </dt>
                        <dd>
                          <p>
                            RF gain in dB. [-1 for automatic gain control]
                          </p>
                        </dd>
                      </dl>
                    </section>
                  </div>
                </dd>
                <dt>
                  <span className="json-property-name">SenPos:</span>{' '}
                  <span className="json-property-type">object</span>
                </dt>
                <dd>
                  <div className="json-inner-schema">
                    <section className="json-schema-properties">
                      <dl>
                        <dt>
                          <span className="json-property-name">
                            PosSys:
                          </span>{' '}
                          <span className="json-property-type">string</span>
                        </dt>
                        <dd>
                          <p>
                            Description/identification of the used
                            positioning system.
                          </p>
                        </dd>
                        <dt>
                          <span className="json-property-name">
                            PosVal:
                          </span>{' '}
                          <span className="json-property-type">
                            number[]
                          </span>
                        </dt>
                        <dd>
                          <p>Position values in the corresponding positioning system.</p>
                          <div className="json-inner-schema">
                            <section className="json-schema-array-items">
                              <span className="json-property-type">
                                number
                              </span>
                            </section>
                          </div>
                        </dd>
                      </dl>
                    </section>
                  </div>
                </dd>
                <dt>
                  <span className="json-property-name">SenTemp:</span>{' '}
                  <span className="json-property-type">number</span>
                </dt>
                <dd>
                  <p>
                    Optional Filed - Ambient temperature of the sensor in
                    degrees Celsius.
                  </p>
                </dd>
                <dt>
                  <span className="json-property-name">SenTime:</span>{' '}
                  <span className="json-property-type">object</span>{' '}
                  <span className="json-property-required" />
                </dt>
                <dd>
                  <div className="json-inner-schema">
                    <section className="json-schema-properties">
                      <dl>
                        <dt>
                          <span className="json-property-name">
                            TimeSecs:
                          </span>{' '}
                          <span className="json-property-type">integer</span>{' '}
                          <span className="json-property-format">
                            (int64)
                          </span>
                        </dt>
                        <dd>
                          <p>
                            Number of seconds since the UNIX epoch start on
                            January 1st, 1970 at UTC.
                          </p>
                        </dd>
                        <dt>
                          <span className="json-property-name">
                            TimeMicrosecs:
                          </span>{' '}
                          <span className="json-property-type">integer</span>{' '}
                          <span className="json-property-format">
                            (int32)
                          </span>
                        </dt>
                        <dd>
                          <p>Microseconds extension for the UNIX time stamp.</p>
                        </dd>
                      </dl>
                    </section>
                  </div>
                </dd>
                <dt>
                  <span className="json-property-name">SenData:</span>{' '}
                  <span className="json-property-type">object</span>{' '}
                  <span className="json-property-required" />
                </dt>
                <dd>
                  <div className="json-inner-schema">
                    <section className="json-schema-properties">
                      <dl>
                        <dt>
                          <span className="json-property-name">
                            CenterFreq:
                          </span>{' '}
                          <span className="json-property-type">integer</span>
                        </dt>
                        <dd>
                          <p>
                            Center frequency in Hz to which the RF front-end
                            was tuned to while recording the associated
                            spectrum data.
                          </p>
                        </dd>
                        <dt>
                          <span className="json-property-name">
                            SquaredMag:
                          </span>{' '}
                          <span className="json-property-type">
                            number[]
                          </span>
                        </dt>
                        <dd>
                          <p>
                            Actual spectrum data recorded for the associated
                            center frequency. The
                            (1-FrequencyOverlap)*(FFTSize+1) data points
                            represent the squared magnitudes of the
                            frequency-domain signal on a dB scale.
                          </p>
                          <div className="json-inner-schema">
                            <section className="json-schema-array-items">
                              <span className="json-property-type">
                                number
                              </span>{' '}
                              <span className="json-property-format">
                                (float)
                              </span>
                            </section>
                          </div>
                        </dd>
                      </dl>
                    </section>
                  </div>
                </dd>
              </dl>
            </section>
          </div>
        </div>

        <div id="definition-Sensor" className="panel panel-definition">
          <div className="panel-heading">
            <h3 className="panel-title">
              <a id="/definitions/Sensor" />
              Sensor: <span className="json-property-type">object</span>
            </h3>
          </div>
          <div className="panel-body">
            <section className="json-schema-properties">
              <dl>
                <dt>
                  <span className="json-property-name">type:</span>{' '}
                  <span className="json-property-type">string</span>
                </dt>
                <dd>
                  <p>Device type (&apos;esraspi2psdr&apos; or &apos;misc&apos;)</p>
                </dd>
                <dt>
                  <span className="json-property-name">id:</span>{' '}
                  <span className="json-property-type">integer</span>{' '}
                  <span className="json-property-format">(int32)</span>
                </dt>
                <dd>
                  <p>Unique sensor id for internal use.</p>
                </dd>
                <dt>
                  <span className="json-property-name">serial:</span>{' '}
                  <span className="json-property-type">integer</span>{' '}
                  <span className="json-property-format">(int64)</span>
                </dt>
                <dd>
                  <p>
                    Sensor&apos;s serial number. This is used as an
                    identifier for the API.
                  </p>
                </dd>
                <dt>
                  <span className="json-property-name">name:</span>{' '}
                  <span className="json-property-type">string</span>
                </dt>
                <dd>
                  <p>A unique name for the sensor (which user can choose)</p>
                </dd>
                <dt>
                  <span className="json-property-name">uid:</span>{' '}
                  <span className="json-property-type">string</span>
                </dt>
                <dd>
                  <p>
                    Username of device owner. Can be &apos;null&apos; in case
                    he wants for privacy reasons.
                  </p>
                </dd>
                <dt>
                  <span className="json-property-name">operator:</span>{' '}
                  <span className="json-property-type">string</span>
                </dt>
                <dd>
                  <p>
                    Full name of device owner. Can be &apos;null&apos; in
                    case he wants for privacy reasons.
                  </p>
                </dd>
                <dt>
                  <span className="json-property-name">contact:</span>{' '}
                  <span className="json-property-type">string</span>
                </dt>
                <dd>
                  <p>
                    Contact address of device owner. Can be &apos;null&apos;
                    in case he wants for privacy reasons.
                    <i>Legacy Note: This field will be removed in the future.</i>
                  </p>
                </dd>
                <dt>
                  <span className="json-property-name">address:</span>{' '}
                  <span className="json-property-type">string</span>
                </dt>
                <dd>
                  <p>
                    Address of the sensor&apos;s location. Only shown for own
                    sensors, otherwise &apos;null&apos;!
                  </p>
                </dd>
                <dt>
                  <span className="json-property-name">position:</span>{' '}
                  <span className="json-property-type">object</span>
                </dt>
                <dd>
                  <p>Geographical coordinates of the device.</p>
                  <div className="json-inner-schema">
                    <section className="json-schema-properties">
                      <dl>
                        <dt>
                          <span className="json-property-name">
                            longitude:
                          </span>{' '}
                          <span className="json-property-type">number</span>{' '}
                          <span className="json-property-format">
                            (double)
                          </span>
                        </dt>
                        <dd />
                        <dt>
                          <span className="json-property-name">
                            latitude:
                          </span>{' '}
                          <span className="json-property-type">number</span>{' '}
                          <span className="json-property-format">
                            (double)
                          </span>
                        </dt>
                        <dd />
                        <dt>
                          <span className="json-property-name">
                            altitude:
                          </span>{' '}
                          <span className="json-property-type">number</span>{' '}
                          <span className="json-property-format">
                            (double)
                          </span>
                        </dt>
                        <dd />
                        <dt>
                          <span className="json-property-name">
                            indoor:
                          </span>{' '}
                          <span className="json-property-type">boolean</span>
                        </dt>
                        <dd />
                      </dl>
                    </section>
                  </div>
                </dd>
                <dt>
                  <span className="json-property-name">anonymized:</span>{' '}
                  <span className="json-property-type">boolean</span>
                </dt>
                <dd>
                  <p>
                    If &apos;true&apos; the user did not provide the exact
                    position for privacy reasons.
                  </p>
                </dd>
                <dt>
                  <span className="json-property-name">deployed:</span>{' '}
                  <span className="json-property-type">string</span>{' '}
                  <span className="json-property-format">(date-time)</span>
                </dt>
                <dd>
                  <p>
                    Date and time of this sensor&apos;s deployment in
                    seconds since epoch (Unix time). The date will change
                    under certain conditions, i.e.,
                  </p>
                  <ul>
                    <li>position is changed</li>
                    <li>radio frontend is changed</li>
                    <li>
                      after a firmware upgrade which has large influence on
                      measured values
                    </li>
                  </ul>
                </dd>
                <dt>
                  <span className="json-property-name">frontend:</span>{' '}
                  <span className="json-property-type">string</span>
                </dt>
                <dd>
                  <p>Radio Frontend of the device. Can be null</p>
                </dd>
                <dt>
                  <span className="json-property-name">antenna:</span>{' '}
                  <span className="json-property-type">object</span>
                </dt>
                <dd>
                  <p>
                    Detailed information about the antenna used. Can be
                    &apos;null&apos; if information is missing.
                  </p>
                  <div className="json-inner-schema">
                    <section className="json-schema-properties">
                      <dl>
                        <dt>
                          <span className="json-property-name">
                            directional:
                          </span>{' '}
                          <span className="json-property-type">boolean</span>
                        </dt>
                        <dd>
                          <p>true for a directional antenna</p>
                        </dd>
                        <dt>
                          <span className="json-property-name">angle:</span>{' '}
                          <span className="json-property-type">number</span>{' '}
                          <span className="json-property-format">
                            (float)
                          </span>
                        </dt>
                        <dd>
                          <p>
                            Only for directional antenna. In decimal degrees,
                            north is 0, counting up clockwise.
                          </p>
                        </dd>
                        <dt>
                          <span className="json-property-name">gain:</span>{' '}
                          <span className="json-property-type">number</span>{' '}
                          <span className="json-property-format">
                            (float)
                          </span>
                        </dt>
                        <dd>
                          <p>Antenna&apos;s gain</p>
                        </dd>
                        <dt>
                          <span className="json-property-name">
                            minFreq:
                          </span>{' '}
                          <span className="json-property-type">integer</span>{' '}
                          <span className="json-property-format">
                            (int64)
                          </span>
                        </dt>
                        <dd>
                          <p>Minimum frequency of the antenna according to its specs.</p>
                        </dd>
                        <dt>
                          <span className="json-property-name">
                            maxFreq:
                          </span>{' '}
                          <span className="json-property-type">integer</span>{' '}
                          <span className="json-property-format">
                            (int64)
                          </span>
                        </dt>
                        <dd>
                          <p>Maximum frequency of the antenna according to its specs.</p>
                        </dd>
                      </dl>
                    </section>
                  </div>
                </dd>
                <dt>
                  <span className="json-property-name">sensing:</span>{' '}
                  <span className="json-property-type">boolean</span>
                </dt>
                <dd>
                  <p>Indicates that sensor is currently collecting measurements</p>
                </dd>
                <dt>
                  <span className="json-property-name">
                    lastConnectionEvent:
                  </span>{' '}
                  <span className="json-property-type">integer</span>{' '}
                  <span className="json-property-format">(int32)</span>
                </dt>
                <dd>
                  <p>
                    Date and time of last connection state update in seconds
                    since epoch (Unix time). If &apos;connected&apos; is
                    false this gives the last time the device has been
                    connected to SpecScape. If &apos;connected&apos; is
                    true, this field provides the time since the device is
                    connected.
                  </p>
                </dd>
                <dt>
                  <span className="json-property-name">country:</span>{' '}
                  <span className="json-property-type">string</span>
                </dt>
                <dd>
                  <p>
                    Country where sensor is deployed. This value is provided
                    by the user on device registration.
                  </p>
                </dd>
              </dl>
            </section>
          </div>
        </div>

        <div className="alert alert-success">
          For code snippets and examples on how to use this API, have a look
          at the{' '}
          <a
            href="https://github.com/electrosense/api-examples"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#e7f0f7', fontWeight: 'bold' }}
          >
            Github repository
          </a>
          .
        </div>
      </div>
    </div>
  )
}
