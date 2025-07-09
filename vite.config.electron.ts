import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Minimal Vite config for Electron that outputs classic scripts
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    target: 'chrome89', // Electron 28 uses Chromium 89
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        format: 'iife',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Single bundle for Electron
        manualChunks: undefined,
        inlineDynamicImports: true,
      },
    },
  },
  esbuild: {
    target: 'chrome89',
    format: 'iife',
  },
});