import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// SystemJS format build for Electron
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/main.tsx'),
      formats: ['system'],
      fileName: () => 'app.js'
    },
    rollupOptions: {
      external: [],
      output: {
        format: 'system',
        // Ensure all imports are bundled
        preserveModules: false,
        compact: true
      }
    },
    target: 'es2015',
    minify: false
  }
});