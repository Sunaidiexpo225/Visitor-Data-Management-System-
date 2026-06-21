import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Allow access through tunnels / preview proxies (e.g. *.trycloudflare.com)
    allowedHosts: true,
  },
})
