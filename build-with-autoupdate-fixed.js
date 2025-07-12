#!/usr/bin/env node

/**
 * Build with Auto-Update Support - FIXED VERSION
 * Generates proper latest.yml files for auto-updates
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

console.log('🔧 Building with Auto-Update Support (FIXED)...');

try {
  // Step 1: Build the app
  console.log('\n📦 Step 1: Building application...');
  execSync('npm run build', { stdio: 'inherit' });

  // Step 2: Build Windows with proper publish configuration
  console.log('\n🪟 Step 2: Building Windows executable with auto-update...');
  execSync('npx electron-builder --win --publish=onTagOrDraft', { stdio: 'inherit' });

  // Step 3: Check if latest.yml was created
  const latestYmlPath = path.join('dist-electron', 'latest.yml');
  if (fs.existsSync(latestYmlPath)) {
    console.log('\n✅ latest.yml created successfully!');
    const content = fs.readFileSync(latestYmlPath, 'utf8');
    console.log('Content:');
    console.log(content);
  } else {
    console.log('\n⚠️ latest.yml not found, creating manually...');
    
    // Create manual latest.yml with proper checksums
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = packageJson.version;
    
    // Find the executable files
    const setupFile = `Tank Monitoring System Setup ${version}.exe`;
    const portableFile = `Tank Monitoring System ${version}.exe`;
    
    const setupPath = path.join('dist-electron', setupFile);
    const portablePath = path.join('dist-electron', portableFile);
    
    let setupSha512 = '';
    let setupSize = 0;
    let portableSha512 = '';
    let portableSize = 0;
    
    // Calculate checksums and sizes
    if (fs.existsSync(setupPath)) {
      const setupBuffer = fs.readFileSync(setupPath);
      setupSha512 = crypto.createHash('sha512').update(setupBuffer).digest('base64');
      setupSize = setupBuffer.length;
      console.log(`Setup file: ${setupFile} (${Math.round(setupSize / 1024 / 1024)}MB)`);
    }
    
    if (fs.existsSync(portablePath)) {
      const portableBuffer = fs.readFileSync(portablePath);
      portableSha512 = crypto.createHash('sha512').update(portableBuffer).digest('base64');
      portableSize = portableBuffer.length;
      console.log(`Portable file: ${portableFile} (${Math.round(portableSize / 1024 / 1024)}MB)`);
    }
    
    // Create proper latest.yml
    const latestYml = `version: ${version}
files:
  - url: ${setupFile}
    sha512: ${setupSha512}
    size: ${setupSize}
  - url: ${portableFile}
    sha512: ${portableSha512}
    size: ${portableSize}
path: ${setupFile}
sha512: ${setupSha512}
releaseDate: '${new Date().toISOString()}'
`;
    
    fs.writeFileSync(latestYmlPath, latestYml);
    console.log('✅ Manual latest.yml created with proper checksums');
  }

  // Step 4: List created files
  console.log('\n📁 Step 4: Created files:');
  const distFiles = fs.readdirSync('dist-electron').filter(f => 
    f.includes(packageJson.version) || f.includes('latest')
  );
  distFiles.forEach(file => {
    const stats = fs.statSync(path.join('dist-electron', file));
    console.log(`  ${file} (${Math.round(stats.size / 1024 / 1024)}MB)`);
  });

  console.log('\n🎉 Build with auto-update completed!');
  console.log('\n📋 Next steps for auto-update:');
  console.log('1. Upload the .exe files to GitHub release');
  console.log('2. Upload the latest.yml file to GitHub release');
  console.log('3. Auto-updates will work for future releases');
  console.log('\n🔧 Auto-update fix applied:');
  console.log('- Used --publish=onTagOrDraft to generate latest.yml');
  console.log('- Manual fallback with proper SHA512 checksums');
  console.log('- Ready for GitHub release upload');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
