import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    hmr: {
      overlay: false // Disable the error overlay
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom'], // Pre-bundle common dependencies
  },
  build: {
    incremental: true,
    cache: true,
    minify: false, // Disable minification during development
    sourcemap: 'inline'
  }
})
