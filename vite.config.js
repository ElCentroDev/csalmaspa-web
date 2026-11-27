import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
  build: {
    chunkSizeWarningLimit: 650,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'vendor-three'
          if (id.includes('node_modules/gsap')) return 'vendor-gsap'
          if (id.includes('node_modules/react')) return 'vendor-react'
        },
      },
    },
  },
})
