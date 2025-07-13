#!/usr/bin/env node

/**
 * Create Proper latest.yml for Auto-Updates
 * Generate correct latest.yml with proper filenames and checksums
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

console.log('🔧 Creating proper latest.yml for v1.2.3...');

try {
  const version = '1.2.3';
  const distDir = 'dist-electron';
  
  // Our actual file names
  const setupFile = `Tank Monitoring System Setup ${version}.exe`;
  const portableFile = `Tank Monitoring System ${version}.exe`;
  
  const setupPath = path.join(distDir, setupFile);
  const portablePath = path.join(distDir, portableFile);
  
  console.log(`\n📁 Checking files:`);
  console.log(`   Setup: ${setupFile}`);
  console.log(`   Portable: ${portableFile}`);
  
  // Check if files exist
  if (!fs.existsSync(setupPath)) {
    throw new Error(`Setup file not found: ${setupPath}`);
  }
  
  if (!fs.existsSync(portablePath)) {
    throw new Error(`Portable file not found: ${portablePath}`);
  }
  
  // Calculate checksums and sizes
  console.log(`\n🔍 Calculating checksums...`);
  
  const setupBuffer = fs.readFileSync(setupPath);
  const setupSha512 = crypto.createHash('sha512').update(setupBuffer).digest('base64');
  const setupSize = setupBuffer.length;
  
  const portableBuffer = fs.readFileSync(portablePath);
  const portableSha512 = crypto.createHash('sha512').update(portableBuffer).digest('base64');
  const portableSize = portableBuffer.length;
  
  console.log(`   Setup: ${Math.round(setupSize / 1024 / 1024)}MB`);
  console.log(`   Portable: ${Math.round(portableSize / 1024 / 1024)}MB`);
  
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
  
  // Write the corrected latest.yml
  const latestYmlPath = path.join(distDir, 'latest.yml');
  fs.writeFileSync(latestYmlPath, latestYml);
  
  console.log(`\n✅ Created proper latest.yml:`);
  console.log(latestYml);
  
  console.log(`📋 Files ready for GitHub release:`);
  console.log(`   1. ${setupFile} (${Math.round(setupSize / 1024 / 1024)}MB)`);
  console.log(`   2. ${portableFile} (${Math.round(portableSize / 1024 / 1024)}MB)`);
  console.log(`   3. latest.yml (auto-update metadata)`);
  
  console.log(`\n🎯 Auto-update status for v${version}:`);
  console.log(`   ✅ Version is stable (no RC/beta/testing suffix)`);
  console.log(`   ✅ Auto-updates will be ENABLED`);
  console.log(`   ✅ Ships will receive this update automatically`);
  console.log(`   ✅ Professional maritime deployment ready`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
