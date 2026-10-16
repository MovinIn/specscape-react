# SpecScape · Linxiang Frontend

An independent frontend redesign of SpecScape, built on the H3 branch and maintained on `linxiang-frontend-update`.

The redesign preserves the existing pages and backend integration while improving visual consistency, navigation, and research workflows.

## Design Direction

The interface combines Apple-inspired spacing and visual hierarchy, Solana-inspired spectral accents, and an industrial aesthetic.

The visual system uses silver-white surfaces, graphite typography, fine borders, and purple, blue, and cyan accents. Subtle transitions and interaction feedback support the experience, with reduced-motion preferences respected.

The current design focuses on desktop research workflows.

## Getting Started

Use **Node.js 24**, as specified in `.nvmrc`.

```bash
npm ci
npm run dev
```

Open:

```text
http://localhost:5176/
```

The default mode connects to the real SpecScape backend and displays the local administrator workspace.

**Local administrator UI access does not grant administrator permissions on the backend.** Protected data and operations still require an authenticated account with the appropriate permissions.

## Authentication and Data Sources

### Real Backend

The default configuration uses real SpecScape APIs and preserves the existing session cookies, CSRF handling, JWT authentication, and WebSocket/WebRTC integration.

Sign in at `/login` using your SpecScape account.

A session established on `localhost:5173` may also be recognized on `localhost:5176` within the same browser because localhost cookies are shared across ports. Chrome and the Codex in-app browser maintain separate sessions.

Without authentication, public network information remains available. Protected features display an account connection prompt.

Account passwords are not stored in source code or environment configuration.

### H3 Spatial Preview

Real mobile spatial measurements are still awaiting backend integration.

The H3 view therefore defaults to **Mobile H3 preview · simulated**, with a visible notice explaining that the signal levels, routes, and transmitters are generated for demonstration.

The preview supports:

- Frequency presets and custom ranges
- Mean SNR, peak SNR, and occupancy metrics
- H3 resolution selection
- Time-window and sensor filtering
- Simulated tracks and transmitters
- Optional estimated gap filling
- Individual hexagon inspection and spectrum analysis

An optional **Fixed sensor history · real API** source aggregates available historical measurements at reported fixed-sensor locations. This is distinct from real mobile spatial coverage.

In the real-data source, missing measurements remain empty. Failed requests do not automatically fall back to simulated signals.

### Offline Demo

To explore sample data without a backend connection:

```bash
npm run dev:demo
```

Open:

```text
http://localhost:5177/
```

This explicitly labeled demo mode uses local sample data. Supported demo changes persist in browser localStorage. It does not send emails or control real hardware.

## Implemented Improvements

### Navigation and Usability

- Persistent sidebar with Research and Administration areas
- Direct access to core research tools
- Expandable supporting resources
- Command/Control + K page search with keyboard navigation
- Consistent page headings, forms, tables, and feedback states

### Sensor Workflows

- Search and status filtering
- Map and sensor-detail integration
- Direct links to spectrum monitoring, H3 analysis, and decoding
- Table-first sensor management
- Duplicate checks and coordinate validation

### Spectrum Monitoring

- Reorganized sensor, date, time, and aggregation controls
- Waterfall and power-spectrum visualization
- Occupancy analysis
- Zooming, panning, reset, and automatic refresh
- Explicit empty-data and request-error messages

### Signal Decoder

- Existing WebSocket/WebRTC connection flow
- Real-time PSD and waterfall rendering
- Preserved frequency, gain, and volume controls
- Nine decoder modes: FM, AM, ADS-B, AIS, ACARS, LTE, IoT, LoRa, and WiFi

The existing I/Q dataset, ranking, account, campaign, sponsorship, streaming administration, and informational pages are also retained within the shared visual system.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Real API with local administrator UI on port 5176 |
| `npm run dev:preview` | Alias for the default development mode |
| `npm run build` | Type checking and real-API production build |
| `npm run preview` | Serve the built frontend |
| `npm run dev:demo` | Offline sample-data mode on port 5177 |
| `npm run build:demo` | Build the offline demo |
| `npm run dev:backend` | Real API with account-based UI permissions |
| `npm run build:backend` | Build the account-based mode |
| `npm run lint` | Static analysis |
| `npm run test:preview` | Data, H3 aggregation, and download-format tests |

## Configuration

The development server proxies `/api` to `https://specscape.org` by default, with TLS verification enabled.

Available configuration options are documented in `.env.example`:

- `VITE_API_PROXY_TARGET`: Override the backend proxy target
- `VITE_USE_MOCK_API`: Explicitly enable sample-data mode
- `VITE_LOCAL_ADMIN`: Enable local administrator navigation and UI
- `VITE_RECAPTCHA_SITE_KEY`: Configure the public CAPTCHA site key
- `VITE_MAPBOX_TOKEN`: Configure a public Mapbox token

## Validation and Current Limits

Type checking, the real-API build, and seven regression tests pass. Static analysis reports warnings but no errors.

Browser verification includes the main navigation, sensor workflows, spectrum controls, H3 interactions, and the offline page flows. A real Greentree signal was successfully received and rendered as a power spectrum and waterfall.

Subsequent connection attempts encountered data-channel timeouts, and some historical requests returned server errors or timed out. Connection reliability has not been fully validated.

Real mobile H3 data remains pending backend integration. Hardware tuning, every live decoding protocol, email delivery, and administrative write operations have not received complete end-to-end validation.

## Project Structure

- `src/layout/` and `src/config/`: Navigation, runtime modes, and shared layout
- `src/auth/`: Session handling and access checks
- `src/api/`: Real API client, spatial-data loading, and demo data
- `src/pages/`: Research, administration, account, and informational pages
- `src/components/`: Maps, charts, decoder controls, and shared UI
- `src/lib/`: Spectrum processing, H3 aggregation, and utility functions
- `src/linxiang.css`: Shared visual and interaction system
- `tests/preview.test.ts`: Regression tests
- `docs/preview/`: Screenshots and verification artifacts

See [the frontend preview guide](docs/FRONTEND_PREVIEW.md) for the branch comparison, implementation details, and validation notes.
