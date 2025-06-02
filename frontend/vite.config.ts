import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173, // Explicitly set frontend port if needed, though Vite usually picks one
    proxy: {
      // Proxy API requests starting with /api to backend server
      '/api': {
        target: 'http://localhost:5000', // Backend server address
        changeOrigin: true, // Recommended for virtual hosted sites
        // secure: false, // Uncomment if your backend is on http and you encounter SSL issues with https proxying
        // If your backend routes are not prefixed with /api, you might need a rewrite:
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
