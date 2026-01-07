import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: ['remake-puoi.preview.emergentagent.com', 'localhost', '.emergentagent.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      }
    }
  }
})
