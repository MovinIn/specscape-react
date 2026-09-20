import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * electrosense.org currently serves a mismatched Hetzner cert
 * (*.your-server.de) and an "HTTPS Not Available" page. `secure: false`
 * stops Vite from failing TLS verification; override the target when you
 * have a working API (local backend or fixed host).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_PROXY_TARGET || 'https://electrosense.org'

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
          secure: false,
        },
      },
    },
  }
})
