import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    testTimeout: 10000, // Increase timeout to 10 seconds
    coverage: {
      // Coverage providers
      provider: 'v8',
      
      // Reports to generate
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary', 'cobertura'],
      
      // Output directory for coverage reports
      reportsDirectory: './coverage',
      
      // Files to exclude from coverage
      exclude: [
        'node_modules/',
        'src/test/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'dist/',
        'electron/',
        'server/',
        'public/',
        'build/',
        'scripts/',
        'src/examples/',
        'src/main.tsx', // Entry point
        'src/vite-env.d.ts',
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*',
        '**/test-utils.*',
        '**/setup.*',
      ],
      
      // Files to include in coverage
      include: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/test/**',
        '!src/tests/**',
        '!src/examples/**',
      ],
      
      // Coverage thresholds
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
        // Specific thresholds for critical files
        'src/hooks/useTankData.ts': {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
        'src/hooks/useTankConfiguration.ts': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        'src/utils/tankConfig.ts': {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
        'src/utils/tankDisplay.ts': {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
        'src/components/': {
          statements: 70,
          branches: 65,
          functions: 70,
          lines: 70,
        },
      },
      
      // Enable all coverage types
      all: true,
      
      // Clean coverage directory before each run
      clean: true,
      
      // Report uncovered lines
      reportOnFailure: true,
      
      // Skip files with no statements
      skipFull: false,
      
      // Watermarks for coverage coloring
      watermarks: {
        statements: [50, 80],
        functions: [50, 80],
        branches: [50, 75],
        lines: [50, 80],
      },
      
      // Enable source maps for better debugging
      sourcemap: true,
      
      // Ignore empty lines
      ignoreEmptyLines: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});