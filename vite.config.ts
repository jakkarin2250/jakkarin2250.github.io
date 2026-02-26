
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: './' helps the built html file find assets when opened directly or in subfolders
  base: './',
  define: {
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
