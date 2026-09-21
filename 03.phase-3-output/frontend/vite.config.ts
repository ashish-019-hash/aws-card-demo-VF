/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      // Proxy API calls to the Spring Boot backend so cookies (JSESSIONID / XSRF-TOKEN)
      // are treated as same-origin by the browser during local development.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // The backend's CORS allow-list only trusts http://localhost:5173. When this
        // dev server is reached through a public preview tunnel, the browser's real
        // Origin header is the tunnel host, which the backend would reject. Rewrite it
        // to the trusted dev origin so proxied requests are treated the same regardless
        // of which hostname the browser used to reach this dev server.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'http://localhost:5173')
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
  },
})
