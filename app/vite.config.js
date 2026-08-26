import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served from GitHub Pages as a project site (https://gtall131.github.io/holaday/),
  // not the domain root, so asset URLs need the repo-name prefix in production.
  base: '/holaday/',
})
