import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Only the production build is served from GitHub Pages as a project
  // site (https://gtall131.github.io/holaday/), not the domain root, so
  // only `vite build` needs the repo-name prefix on asset URLs — `vite
  // dev` keeps serving at "/" so the local dev URL doesn't change.
  base: command === 'build' ? '/holaday/' : '/',
}))
