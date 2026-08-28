import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deploys to Cloudflare Pages at the domain root, so this never needs
// a build-only base prefix.
export default defineConfig({
  plugins: [react()],
})
