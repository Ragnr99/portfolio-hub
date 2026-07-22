import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // served from the domain root at https://nicholaslubold.com/
  // (custom domain; GitHub redirects the old ragnr99.github.io/portfolio-hub path here)
  base: '/',
  plugins: [react()],
})
