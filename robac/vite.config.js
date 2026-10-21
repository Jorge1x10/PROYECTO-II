import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo, las llamadas a /api van al servidor de Node (npm run server).
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
})
