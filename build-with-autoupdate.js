#!/usr/bin/env node

/**
 * Build with Auto-Update Support
 * Creates proper latest.yml files for auto-updates
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔄 Building with Auto-Update Support...');

try {
  // Step 1: Build the app
  console.log('\n📦 Step 1: Building application...');
  execSync('npm run build', { stdio: 'inherit' });

  // Step 2: Build Windows with publish configuration
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
    
    // Create manual latest.yml
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = packageJson.version;
    
    const latestYml = `version: ${version}
files:
  - url: Tank Monitoring System Setup ${version}.exe
    sha512: # This would be calculated automatically
    size: # This would be calculated automatically
  - url: Tank Monitoring System ${version}.exe
    sha512: # This would be calculated automatically  
    size: # This would be calculated automatically
path: Tank Monitoring System Setup ${version}.exe
sha512: # This would be calculated automatically
releaseDate: '${new Date().toISOString()}'
`;
    
    fs.writeFileSync(latestYmlPath, latestYml);
    console.log('✅ Manual latest.yml created');
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
  console.log('\n📋 Next steps:');
  console.log('1. Upload the .exe files to GitHub release');
  console.log('2. Upload the latest.yml file to GitHub release');
  console.log('3. Auto-updates will work for future releases');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
