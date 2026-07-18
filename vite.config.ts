import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // served from https://ragnr99.github.io/portfolio-hub/
  base: '/portfolio-hub/',
  plugins: [react()],
})
