import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

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
