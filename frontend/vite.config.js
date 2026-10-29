import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5100,
    strictPort: true, // Forces Vite to always use 5100 (fails if 5100 is unavailable instead of changing port)
    host: true,
  },
  preview: {
    port: 5100,
    strictPort: true,
  }
})
