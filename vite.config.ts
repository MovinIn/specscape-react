import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

/**
 * Auth depends on cookies (JSESSIONID + XSRF-TOKEN) that the API sets on
 * /api/user/principal. The upstream sends them without a Domain attribute
 * and, in production, with the Secure flag — neither of which a browser
 * will accept from http://localhost. `cookieDomainRewrite` and the
 * Secure-stripping below make the session survive the proxy hop in dev.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_PROXY_TARGET || 'https://specscape.org'

  return {
    plugins: [react()],
    css: {
      preprocessorOptions: {
        scss: {
          loadPaths: ['node_modules'],
          quietDeps: true,
          silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        // Dev only: with VITE_SCHEDULE_PROXY_TARGET set (e.g. http://127.0.0.1:8050), the
        // scheduling routes the lambda will provide go straight to a controller's /task/* API.
        // No login or owner checks happen here; the lambda adds those in production.
        ...(env.VITE_SCHEDULE_PROXY_TARGET
          ? ({
              '^/api/schedule(/|$)': {
                target: env.VITE_SCHEDULE_PROXY_TARGET,
                changeOrigin: true,
                configure: (proxy) => {
                  proxy.on('proxyReq', (proxyReq, req) => {
                    const u = new URL(req.url ?? '', 'http://localhost')
                    const rest = u.pathname.replace(/^\/api\/schedule/, '')
                    const byId = /^\/bookings\/(\d+)$/.exec(rest)
                    let path: string | null = null
                    if (rest === '/availability') path = '/task/availability'
                    else if (rest === '/bookings') path = req.method === 'POST' ? '/task/add' : '/task/list'
                    else if (byId) path = `/task/${byId[1]}`
                    if (path) proxyReq.path = path + u.search
                  })
                },
              },
            } as Record<string, ProxyOptions>)
          : {}),
        '^/api(/|$)': {
          target,
          changeOrigin: true,
          secure: true,
          cookieDomainRewrite: '',
          cookiePathRewrite: '/',
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, req) => {
              const cookies = proxyRes.headers['set-cookie']
              if (cookies) {
                proxyRes.headers['set-cookie'] = cookies.map((c) =>
                  c.replace(/;\s*Secure/gi, '').replace(/;\s*SameSite=None/gi, ''),
                )
              }
              // Never let the browser cache an API response. A cached error
              // page (e.g. from a previously wrong proxy target) is otherwise
              // replayed from disk forever and looks like a broken backend.
              proxyRes.headers['cache-control'] = 'no-store, no-cache, must-revalidate'
              proxyRes.headers['pragma'] = 'no-cache'
              delete proxyRes.headers['etag']
              delete proxyRes.headers['last-modified']

              // Set VITE_PROXY_DEBUG=1 to trace what the upstream actually
              // returns — invaluable when the API answers with an HTML
              // error page instead of JSON.
              if (process.env.VITE_PROXY_DEBUG) {
                console.log(
                  `[proxy] ${req.method} ${req.url} -> ${proxyRes.statusCode} ` +
                    `(${proxyRes.headers['content-type'] ?? 'no content-type'})`,
                )
              }
            })
          },
        },
      },
    },
  }
})
