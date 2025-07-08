import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';
import type { Plugin } from 'vite';

// Import compression plugins with dynamic imports to avoid issues
const compressionPlugin = async () => {
  try {
    const { default: compression } = await import('vite-plugin-compression');
    return compression({
      algorithm: 'gzip',
      threshold: 1024, // Only compress files larger than 1KB
      deleteOriginFile: false,
      ext: '.gz',
      compressionOptions: { level: 9 }
    });
  } catch (e) {
    console.warn('vite-plugin-compression not available, skipping gzip compression');
    return null;
  }
};

const brotliPlugin = async () => {
  try {
    const { default: compression } = await import('vite-plugin-compression');
    return compression({
      algorithm: 'brotliCompress',
      threshold: 1024,
      deleteOriginFile: false,
      ext: '.br',
      compressionOptions: { level: 11 }
    });
  } catch (e) {
    console.warn('Brotli compression not available, skipping');
    return null;
  }
};

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const isProduction = mode === 'production';
  
  // Load compression plugins only in production
  const compressionPlugins = isProduction ? [
    await compressionPlugin(),
    await brotliPlugin()
  ].filter(Boolean) : [];
  
  return {
    plugins: [
      react({
        // Use SWC in production for faster builds and smaller bundles
        ...(isProduction && {
          jsxRuntime: 'automatic',
          babel: {
            plugins: [
              ['babel-plugin-transform-react-remove-prop-types', { removeImport: true }]
            ]
          }
        })
      }),
      
      // Bundle size visualization (only in production)
      isProduction && visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // Better visualization
      }) as Plugin,
      
      // Compression plugins
      ...compressionPlugins,
    ].filter(Boolean),
    
    // Build optimizations
    build: {
      // Output directory
      outDir: 'dist',
      
      // Clean output directory before build
      emptyOutDir: true,
      
      // Generate source maps for production debugging (external)
      sourcemap: isProduction ? 'hidden' : true,
      
      // Minification settings - use Terser for better compression
      minify: isProduction ? 'terser' : 'esbuild',
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
          passes: 3, // More passes for better compression
          unsafe: true,
          unsafe_comps: true,
          unsafe_math: true,
          unsafe_proto: true,
          conditionals: true,
          dead_code: true,
          evaluate: true,
          if_return: true,
          join_vars: true,
          loops: true,
          reduce_vars: true,
          side_effects: false,
          switches: true,
          typeofs: false,
        },
        mangle: {
          safari10: true,
          properties: {
            regex: /^_/, // Mangle properties starting with underscore
          },
        },
        format: {
          comments: false,
          ascii_only: true,
        },
      } : undefined,
      
      // Target modern browsers for smaller bundles and better performance
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      
      // Chunk size warnings - lower for better performance awareness
      chunkSizeWarningLimit: 800, // 800KB
      
      // Enable CSS code splitting for better caching
      cssCodeSplit: true,
      
      // Asset handling - inline smaller assets to reduce requests
      assetsInlineLimit: 8192, // 8KB - increased for better performance
      
      // Rollup options for advanced chunking and optimization
      rollupOptions: {
        // Input configuration
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        
        output: {
          // Advanced manual chunks for optimal loading
          manualChunks: {
            // Core React libraries
            'react-core': ['react', 'react-dom'],
            
            // DnD Kit ecosystem - separate chunk for drag & drop functionality
            'dnd-kit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            
            // UI and Icons - separate for better caching
            'ui-icons': ['lucide-react'],
            
            // Node modules that change less frequently
            'vendor-stable': ['ws'],
          },
          
          // Dynamic imports chunking strategy
          chunkFileNames: (chunkInfo) => {
            const name = chunkInfo.name;
            
            // Special naming for known chunks
            if (name === 'react-core') return 'assets/js/react-[hash].js';
            if (name === 'dnd-kit') return 'assets/js/dnd-[hash].js';
            if (name === 'ui-icons') return 'assets/js/icons-[hash].js';
            if (name === 'vendor-stable') return 'assets/js/vendor-[hash].js';
            
            // Default chunk naming with better organization
            const size = chunkInfo.modules ? Object.keys(chunkInfo.modules).length : 0;
            if (size > 10) {
              return 'assets/js/chunk-large-[hash].js';
            } else if (size > 3) {
              return 'assets/js/chunk-medium-[hash].js';
            }
            return 'assets/js/chunk-[hash].js';
          },
          
          // Optimized asset file naming with better organization
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.');
            const extType = info?.[info.length - 1];
            
            // Images with size-based organization
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif)$/i.test(assetInfo.name ?? '')) {
              return 'assets/images/[name]-[hash][extname]';
            }
            
            // CSS with component-based organization
            if (extType === 'css') {
              return 'assets/css/[name]-[hash][extname]';
            }
            
            // Fonts
            if (/\.(woff|woff2|eot|ttf|otf)$/i.test(assetInfo.name ?? '')) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            
            // Other assets
            return `assets/misc/[name]-[hash][extname]`;
          },
          
          // Entry file naming
          entryFileNames: 'assets/js/main-[hash].js',
          
          // Optimize exports for tree shaking
          exports: 'named',
          
          // Interop for better compatibility
          interop: 'auto',
          
          // Compact output
          compact: isProduction,
        },
        
        // Advanced tree-shaking
        treeshake: {
          preset: 'recommended',
          moduleSideEffects: (id) => {
            // Mark CSS imports as having side effects
            return id.includes('.css') || id.includes('.scss') || id.includes('.sass');
          },
          propertyReadSideEffects: false,
          unknownGlobalSideEffects: false,
        },
        
        // External dependencies (none for Electron app)
        external: [],
        
        // Performance optimizations
        makeAbsoluteExternalsRelative: true,
        preserveEntrySignatures: 'strict',
      },
      
      // Report compressed size only in analysis mode
      reportCompressedSize: process.env.ANALYZE === 'true',
      
      // CSS minification with LightningCSS for better performance
      cssMinify: isProduction ? 'lightningcss' : false,
      
      // Write bundle to disk immediately
      write: true,
      
      // Watch mode options
      watch: !isProduction ? {
        buildDelay: 500,
        exclude: ['node_modules/**', 'dist/**'],
      } : null,
    },
    
    // Optimize dependencies for faster development and builds
    optimizeDeps: {
      // Include heavy dependencies that benefit from pre-bundling
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/utilities',
        'lucide-react', // Include for better dev performance
      ],
      // Exclude dependencies that should be bundled normally
      exclude: [],
      // Force optimization when needed
      force: false,
      // Entry points for better optimization
      entries: ['./src/main.tsx'],
      // Additional options for better performance
      esbuildOptions: {
        target: 'es2020',
        supported: {
          'dynamic-import': true,
        },
      },
    },
    
    // Development server optimizations
    server: {
      // Warm up frequently used files for faster initial loads
      warmup: {
        clientFiles: [
          './src/main.tsx',
          './src/App.tsx',
          './src/components/TankGrid.tsx',
          './src/components/TankCard.tsx',
          './src/components/CompactTankCard.tsx',
          './src/hooks/useTankData.ts',
          './src/hooks/useTankConfiguration.ts',
        ],
      },
      // CORS for development
      cors: true,
      // Host configuration
      host: true,
      // Port configuration
      port: 5173,
      // Faster builds with fewer file system checks
      fs: {
        strict: false,
      },
      // Optimize HMR
      hmr: {
        overlay: true,
      },
    },
    
    // Advanced CSS optimizations
    css: {
      // PostCSS configuration
      postcss: './postcss.config.js',
      // Source maps in development only
      devSourcemap: !isProduction,
      // CSS modules configuration for better performance
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: isProduction ? '[hash:base64:8]' : '[name]__[local]___[hash:base64:5]',
      },
      // Preprocessor options
      preprocessorOptions: {
        scss: {
          // Additional SCSS options if needed
          additionalData: ``,
        },
      },
      // Lightning CSS configuration for production
      transformer: isProduction ? 'lightningcss' : undefined,
      lightningcss: isProduction ? {
        minify: true,
        targets: {
          chrome: 87,
          firefox: 78,
          safari: 14,
          edge: 88,
        },
      } : undefined,
    },
    
    // Web Worker optimizations
    worker: {
      format: 'es',
      plugins: [],
      rollupOptions: {
        output: {
          entryFileNames: 'assets/workers/[name]-[hash].js',
          chunkFileNames: 'assets/workers/[name]-[hash].js',
        },
      },
    },
    
    // Define global constants for runtime optimization
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: JSON.stringify(!isProduction),
      __PROD__: JSON.stringify(isProduction),
      // Remove development-only code in production
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    
    // Resolve optimizations for faster module resolution
    resolve: {
      // Prefer ES modules for better tree shaking
      mainFields: ['browser', 'module', 'jsnext:main', 'jsnext', 'main'],
      // Extensions to try
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
      // Aliases for shorter imports and better performance
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@utils': resolve(__dirname, './src/utils'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@types': resolve(__dirname, './src/types'),
        '@storage': resolve(__dirname, './src/storage'),
        '@constants': resolve(__dirname, './src/constants'),
        '@contexts': resolve(__dirname, './src/contexts'),
        '@services': resolve(__dirname, './src/services'),
      },
      // Symlinks handling
      preserveSymlinks: false,
    },
    
    // ESBuild optimizations for development and production
    esbuild: {
      // Target specification
      target: 'es2020',
      // Drop unnecessary code in production
      drop: isProduction ? ['console', 'debugger'] : [],
      // Legal comments handling
      legalComments: isProduction ? 'none' : 'inline',
      // Tree shaking
      treeShaking: true,
      // Minify identifiers
      minifyIdentifiers: isProduction,
      // Minify syntax
      minifySyntax: isProduction,
      // Minify whitespace
      minifyWhitespace: isProduction,
      // JSX configuration
      jsxDev: !isProduction,
      // Platform target
      platform: 'browser',
      // Format
      format: 'esm',
    },
    
    // Performance monitoring and optimization
    logLevel: isProduction ? 'warn' : 'info',
    clearScreen: false,
    
    // Environment variables
    envPrefix: ['VITE_', 'TANK_'],
    
    // Preview server configuration
    preview: {
      port: 4173,
      host: true,
      cors: true,
    },
  };
});
