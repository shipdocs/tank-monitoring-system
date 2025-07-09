import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        format: 'iife',
        entryFileNames: '[name].js',
        inlineDynamicImports: true,
      },
    },
    target: 'es2015',
    minify: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});