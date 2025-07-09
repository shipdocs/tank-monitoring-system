import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// UMD build configuration for Electron compatibility
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.tsx'),
      name: 'TankMonitoringApp',
      formats: ['umd'],
      fileName: () => 'app.js'
    },
    outDir: 'dist-umd',
    emptyOutDir: true,
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        // Inline all CSS
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'app.css';
          return assetInfo.name;
        }
      }
    },
    target: 'es2015',
    minify: false // Disable minification for debugging
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});