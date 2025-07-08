#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
// import { join } from 'path'; // Unused import

const VALID_TYPES = ['patch', 'minor', 'major'];

function getCurrentVersion() {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

function updateVersion(type) {
  const currentVersion = getCurrentVersion();
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      throw new Error(`Invalid version type: ${type}`);
  }

  return newVersion;
}

function updatePackageJson(newVersion) {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  packageJson.version = newVersion;
  writeFileSync('package.json', `${JSON.stringify(packageJson, null, 2)}\n`);

  console.log(`✅ Updated package.json version to ${newVersion}`);
}

function updateElectronBuilderVersion(newVersion) {
  // Update version in main.js for about dialog
  const mainJsPath = 'electron/main.js';
  let mainJs = readFileSync(mainJsPath, 'utf8');

  // Update all version references in main.js
  // 1. Version X.X.X - Latest Release
  mainJs = mainJs.replace(
    /Version \d+\.\d+\.\d+ - Latest Release/g,
    `Version ${newVersion} - Latest Release`,
  );

  // 2. Version X.X.X - Initial Release (keep as 1.0.0)
  mainJs = mainJs.replace(
    /Version \d+\.\d+\.\d+ - Initial Release/g,
    'Version 1.0.0 - Initial Release',
  );

  // 3. Version X.X.X (standalone)
  mainJs = mainJs.replace(
    /<p style="font-size: 20px; font-weight: bold; margin-bottom: 30px;">Version \d+\.\d+\.\d+<\/p>/g,
    `<p style="font-size: 20px; font-weight: bold; margin-bottom: 30px;">Version ${newVersion}</p>`,
  );

  writeFileSync(mainJsPath, mainJs);
  console.log(`✅ Updated electron/main.js version to ${newVersion}`);
}

function createGitTag(version) {
  const tagName = `v${version}`;

  try {
    // Add all changes
    execSync('git add .', { stdio: 'inherit' });

    // Commit version bump
    execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });

    // Create tag
    execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, { stdio: 'inherit' });

    console.log(`✅ Created git tag ${tagName}`);
    console.log('\n🚀 To publish the release, run:');
    console.log(`   git push origin main && git push origin ${tagName}`);

  } catch (error) {
    console.error('❌ Git operations failed:', error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const type = args[0];

  if (!type || !VALID_TYPES.includes(type)) {
    console.error('❌ Usage: npm run release <patch|minor|major>');
    console.error('');
    console.error('Examples:');
    console.error('  npm run release patch   # 1.1.0 -> 1.1.1');
    console.error('  npm run release minor   # 1.1.0 -> 1.2.0');
    console.error('  npm run release major   # 1.1.0 -> 2.0.0');
    process.exit(1);
  }

  const currentVersion = getCurrentVersion();
  const newVersion = updateVersion(type);

  console.log('📦 Releasing Tank Monitoring System');
  console.log(`   Current version: ${currentVersion}`);
  console.log(`   New version: ${newVersion}`);
  console.log('');

  // Update version in files
  updatePackageJson(newVersion);
  updateElectronBuilderVersion(newVersion);

  // Create git tag
  createGitTag(newVersion);

  console.log('');
  console.log('✨ Release preparation complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Review the changes');
  console.log(`2. Push to GitHub: git push origin main && git push origin v${newVersion}`);
  console.log('3. GitHub Actions will automatically build and create the release');
}

main();
