#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Building Tank Monitoring System for all platforms...\n');

// Build the React app first
console.log('📦 Building React application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Platform configurations
const platforms = [
  {
    name: 'Linux',
    command: 'npm run electron:dist -- --linux',
    outputs: ['*.AppImage', '*.tar.gz'],
  },
  {
    name: 'Windows',
    command: 'npm run electron:dist -- --win',
    outputs: ['*.exe', '*.zip'],
    requiresWine: true,
  },
  {
    name: 'macOS',
    command: 'npm run electron:dist -- --mac',
    outputs: ['*.dmg', '*.zip'],
    requiresMac: true,
  },
];

// Check current platform
const currentPlatform = process.platform;
console.log(`🖥️  Current platform: ${currentPlatform}\n`);

// Build for each platform
for (const platform of platforms) {
  console.log(`🔨 Building for ${platform.name}...`);

  // Check platform requirements
  if (platform.requiresWine && currentPlatform !== 'win32') {
    console.log(`⚠️  ${platform.name} build requires Wine on Linux/macOS`);
    console.log('   Run this on Windows or install Wine first');
    console.log(`   Skipping ${platform.name} build...\n`);
    continue;
  }

  if (platform.requiresMac && currentPlatform !== 'darwin') {
    console.log(`⚠️  ${platform.name} build requires macOS`);
    console.log(`   Skipping ${platform.name} build...\n`);
    continue;
  }

  try {
    execSync(platform.command, { stdio: 'inherit' });
    console.log(`✅ ${platform.name} build completed`);

    // List generated files
    const distDir = path.join(__dirname, 'dist-electron');
    if (fs.existsSync(distDir)) {
      const files = fs.readdirSync(distDir);
      const platformFiles = files.filter(file =>
        platform.outputs.some(pattern =>
          file.match(pattern.replace(/\*/g, '.*')),
        ),
      );

      if (platformFiles.length > 0) {
        console.log('   Generated files:');
        platformFiles.forEach(file => {
          const filePath = path.join(distDir, file);
          const stats = fs.statSync(filePath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
          console.log(`   📄 ${file} (${sizeMB} MB)`);
        });
      }
    }
    console.log('');
  } catch (error) {
    console.error(`❌ ${platform.name} build failed:`, error.message);
    console.log('');
  }
}

console.log('🎉 Build process completed!');
console.log('\n📁 Check the dist-electron/ directory for your built applications.');

// Show final summary
const distDir = path.join(__dirname, 'dist-electron');
if (fs.existsSync(distDir)) {
  const files = fs.readdirSync(distDir);
  const executableFiles = files.filter(file =>
    file.endsWith('.exe') ||
    file.endsWith('.AppImage') ||
    file.endsWith('.dmg') ||
    file.endsWith('.zip') ||
    file.endsWith('.tar.gz'),
  );

  if (executableFiles.length > 0) {
    console.log('\n📦 Available distributions:');
    executableFiles.forEach(file => {
      console.log(`   • ${file}`);
    });
  }
}
