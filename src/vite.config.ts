import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
      '@physicslab/shared-types': path.resolve(__dirname, '../packages/shared-types/src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Code-split por simulación para bundles pequeños en móviles
        manualChunks: id => {
          if (id.includes('simulations/constant-acceleration')) return 'sim-aceleracion'
          if (id.includes('simulations/three-forces')) return 'sim-fuerzas-equilibrio'
          if (id.includes('simulations/force-composition')) return 'sim-composicion'
          if (id.includes('node_modules/react-router-dom')) return 'router'
          if (id.includes('node_modules/react')) return 'react'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
