import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const HASHED_ASSET = /\/assets\/.+-[\w-]{8,}\.\w+$/

function cachePolicy(url = '') {
  const path = url.split('?')[0]
  return HASHED_ASSET.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache'
}

function cacheHeaders() {
  return {
    name: 'cache-headers',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('Cache-Control', cachePolicy(req.url))
        next()
      })
    },
  }
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), cacheHeaders()],
  server: { host: '0.0.0.0', port: 9091, strictPort: true, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 9091, strictPort: true, allowedHosts: true },
})
