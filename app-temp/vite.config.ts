import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Tablaperiodica/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('openai')) return 'vendor-openai';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('react')) return 'vendor-react';
          return 'vendor';
        },
      },
    },
  },
})
