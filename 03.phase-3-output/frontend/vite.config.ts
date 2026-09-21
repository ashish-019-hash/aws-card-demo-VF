import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// Finding 9: only bind to all interfaces / relax the Host header check when a preview
// tunnel host is explicitly configured. Plain local development (no VITE_PREVIEW_HOST)
// binds to localhost only and keeps Vite's default (localhost-only) allowedHosts, instead
// of the previous host: '0.0.0.0' + allowedHosts: true, which accepted a request claiming
// *any* Host header. See README "Troubleshooting" for how/when to set this env var.
const previewHost = process.env.VITE_PREVIEW_HOST

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: previewHost ? '0.0.0.0' : 'localhost',
    allowedHosts: previewHost ? [previewHost] : undefined,
    proxy: {
      // Proxy API calls to the Spring Boot backend so cookies (JSESSIONID / XSRF-TOKEN)
      // are treated as same-origin by the browser during local development.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // The backend's CORS allow-list only trusts http://localhost:5173. A plain
        // localhost dev server already sends that Origin, so no rewrite is needed there.
        // When reached through the explicitly-configured preview host (VITE_PREVIEW_HOST,
        // and only requests with that Host header make it past allowedHosts above), the
        // browser's real Origin is the tunnel host, which the backend would reject; rewrite
        // that verified case to the trusted dev origin so proxied requests are treated the
        // same regardless of which hostname the browser used to reach this dev server.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (previewHost) {
              proxyReq.setHeader('origin', 'http://localhost:5173')
            }
          })
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // The e2e/ directory contains Playwright specs (run via `npm run test:e2e`), not
    // Vitest specs. Exclude it so `npx vitest run` doesn't try to load them.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
