import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'https://sqms-backend-gd00.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'wss://sqms-backend-gd00.onrender.com',
        ws: true,
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://sqms-backend-gd00.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
