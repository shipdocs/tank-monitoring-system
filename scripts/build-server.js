#!/usr/bin/env node

import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('📦 Bundling server with esbuild...');

// Ensure output directory exists
const outputDir = path.join(rootDir, 'dist-server');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

(async () => {
  try {
    await build({
      entryPoints: [path.join(rootDir, 'server/index.js')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outfile: path.join(outputDir, 'index.js'),
      format: 'esm', // Keep ESM since server uses it
      external: [
        'electron',
        '@serialport/bindings-cpp', // Native module - don't bundle
        'serialport', // Keep serialport external due to native bindings
        'csv-parser', // Has dynamic requires
        'express', // Large with many dependencies
        'ws', // WebSocket library
        'cors', // CORS middleware
        'chokidar', // File watcher
      ],
      loader: {
        '.json': 'json', // Bundle JSON files
      },
      minify: false, // Keep readable for debugging
      sourcemap: false,
      logLevel: 'info',
    });

    // Copy package.json for ESM support
    const serverPackageJson = {
      'type': 'module',
      'name': 'tank-monitoring-server-bundled',
      'version': '1.0.0',
      'main': 'index.js',
    };

    fs.writeFileSync(
      path.join(outputDir, 'package.json'),
      JSON.stringify(serverPackageJson, null, 2),
    );

    // Copy all external modules
    const nativeModulesDir = path.join(outputDir, 'node_modules');

    // List of modules to copy
    const modulesToCopy = [
      'serialport',
      '@serialport',
      'csv-parser',
      'express',
      'ws',
      'cors',
      'chokidar',
      'winston',
      'winston-daily-rotate-file',
      'jsonwebtoken',
      'bcrypt',
      'express-rate-limit',
    ];

    // Copy function that preserves dependencies
    const copyModuleWithDeps = (moduleName) => {
      const srcPath = path.join(rootDir, 'node_modules', moduleName);
      const destPath = path.join(nativeModulesDir, moduleName);

      if (!fs.existsSync(srcPath)) {
        console.log(`⚠️  Module ${moduleName} not found, skipping...`);
        return;
      }

      // Copy the module
      copyDir(srcPath, destPath);

      // Read package.json to find dependencies
      const pkgJsonPath = path.join(srcPath, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        const deps = Object.keys(pkg.dependencies || {});

        // Recursively copy dependencies
        for (const dep of deps) {
          if (!fs.existsSync(path.join(nativeModulesDir, dep))) {
            copyModuleWithDeps(dep);
          }
        }
      }
    };

    // Copy directory helper
    const copyDir = (src, dest) => {
      if (!fs.existsSync(src)) return;

      fs.mkdirSync(dest, { recursive: true });
      const files = fs.readdirSync(src);

      for (const file of files) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);

        if (fs.statSync(srcPath).isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    // Copy all required modules
    console.log('📦 Copying external modules...');
    for (const module of modulesToCopy) {
      copyModuleWithDeps(module);
    }

    console.log('✅ Server bundled successfully to dist-server/index.js');
    console.log('📦 All required modules copied to dist-server/node_modules');
  } catch (error) {
    console.error('❌ Server bundling failed:', error);
    process.exit(1);
  }
})();
