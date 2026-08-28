import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  // Cloudflare Pages serves this app from the domain root (unlike the
  // old GitHub Pages project-site path), and a later Capacitor build
  // (capacitor://) needs a root-relative base too — so no path prefix.
}))
