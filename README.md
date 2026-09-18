# SpecScape (React)

Modern React rewrite of the SpecScape / ElectroSense AngularJS frontend.

## Stack

- Vite + React 19 + TypeScript
- React Router 7
- Leaflet / react-leaflet
- Dev proxy: `/api` → `VITE_API_PROXY_TARGET` (default `https://electrosense.org`, TLS verify off)

> **Note:** As of Sep 2026, `electrosense.org` HTTPS presents a Hetzner
> `*.your-server.de` certificate and returns an “HTTPS Not Available” HTML
> page for `/api/*`. Point `VITE_API_PROXY_TARGET` at a working backend (e.g.
> `http://localhost:8080`) until production SSL is restored.

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

## Structure

- `src/layout` — shared nav + footer shell
- `src/auth` — session, login, route guards
- `src/api` — REST client (cookies + CSRF + JWT storage)
- `src/pages` — marketing, account, and app feature routes
- `src/components` — map, notifier, captcha, page header

Optional: set `VITE_RECAPTCHA_SITE_KEY` to override the default site key.
