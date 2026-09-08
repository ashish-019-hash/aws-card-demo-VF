import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendUrl = process.env.E2E_API_BASE_URL ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': { target: backendUrl, changeOrigin: true },
    },
  },
})
