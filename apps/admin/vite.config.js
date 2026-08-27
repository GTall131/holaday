import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deploys to Vercel/Netlify at the domain root, not a GitHub Pages
// project path, so — unlike apps/traveler — this never needs a
// build-only base prefix.
export default defineConfig({
  plugins: [react()],
})
