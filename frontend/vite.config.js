import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    hmr: {
      overlay: false // Disable the error overlay
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5008',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5008',
        changeOrigin: true,
        secure: false,
        ws: true,
      }
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
