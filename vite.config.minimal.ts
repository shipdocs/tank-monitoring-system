import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Minimal Vite config for debugging
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-minimal',
    sourcemap: true,
  },
})
