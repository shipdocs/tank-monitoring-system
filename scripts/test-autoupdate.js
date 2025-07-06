#!/usr/bin/env node

/**
 * Auto-update Configuration Test Script
 * 
 * This script validates the auto-update configuration for the Tank Monitoring System
 */

import { readFileSync } from 'fs';
import https from 'https';

console.log('🔍 Testing Auto-Update Configuration...\n');

/**
 * Validates the auto-update configuration in package.json and package-lock.json.
 *
 * Checks for version consistency between package.json and package-lock.json, ensures the presence of the electron-updater dependency, and verifies that the build.publish configuration targets the correct GitHub repository. Logs detailed errors for any issues found.
 * @return {boolean} True if all configuration checks pass; otherwise, false.
 */
function testPackageJsonConfig() {
  console.log('📦 Testing package.json configuration...');
  
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    
    // Check version consistency
    const packageLockJson = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    
    if (packageJson.version !== packageLockJson.version) {
      console.log('❌ Version mismatch between package.json and package-lock.json');
      console.log(`   package.json: ${packageJson.version}`);
      console.log(`   package-lock.json: ${packageLockJson.version}`);
      return false;
    }
    
    // Check electron-updater dependency
    if (!packageJson.dependencies['electron-updater']) {
      console.log('❌ electron-updater not found in dependencies');
      return false;
    }
    
    // Check publish configuration
    if (!packageJson.build?.publish) {
      console.log('❌ Publish configuration missing in package.json');
      return false;
    }
    
    const publish = packageJson.build.publish;
    if (publish.provider !== 'github' || 
        publish.owner !== 'shipdocs' || 
        publish.repo !== 'tank-monitoring-system') {
      console.log('❌ Invalid publish configuration');
      console.log('   Expected: provider=github, owner=shipdocs, repo=tank-monitoring-system');
      console.log(`   Found: provider=${publish.provider}, owner=${publish.owner}, repo=${publish.repo}`);
      return false;
    }
    
    console.log('✅ package.json configuration is valid');
    console.log(`   Version: ${packageJson.version}`);
    console.log(`   electron-updater: ${packageJson.dependencies['electron-updater']}`);
    console.log(`   Publish: ${publish.provider}/${publish.owner}/${publish.repo}`);
    return true;
    
  } catch (error) {
    console.log(`❌ Error reading package.json: ${error.message}`);
    return false;
  }
}

/**
 * Checks the GitHub repository for the latest release and verifies the presence of update files.
 *
 * Connects to the GitHub API to retrieve the latest release of the `shipdocs/tank-monitoring-system` repository. Validates that the repository is accessible, a release exists, and that the release contains update files matching `latest*.yml`. Logs detailed messages for missing releases, API errors, or absent update files.
 *
 * @returns {Promise<boolean>} Resolves to `true` if the repository, release, and update files are valid; otherwise, `false`.
 */
function testGitHubRepository() {
  return new Promise((resolve) => {
    console.log('\n🐙 Testing GitHub repository...');
    
    const options = {
      hostname: 'api.github.com',
      path: '/repos/shipdocs/tank-monitoring-system/releases/latest',
      headers: {
        'User-Agent': 'Tank-Monitoring-Test-Script'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 404) {
            console.log('❌ No releases found in GitHub repository');
            resolve(false);
            return;
          }
          
          if (res.statusCode !== 200) {
            console.log(`❌ GitHub API error: ${res.statusCode}`);
            resolve(false);
            return;
          }
          
          const release = JSON.parse(data);
          console.log('✅ GitHub repository accessible');
          console.log(`   Latest release: ${release.tag_name}`);
          console.log(`   Published: ${new Date(release.published_at).toLocaleDateString()}`);
          
          // Check for update files
          const assets = release.assets || [];
          const updateFiles = assets.filter(asset => 
            asset.name.includes('latest') && asset.name.endsWith('.yml')
          );
          
          if (updateFiles.length === 0) {
            console.log('⚠️  No update files (latest*.yml) found in latest release');
            console.log('   This may indicate the release was not created with --publish=always');
            resolve(false);
            return;
          }
          
          console.log('✅ Update files found:');
          updateFiles.forEach(file => {
            console.log(`   - ${file.name}`);
          });
          
          resolve(true);
          
        } catch (error) {
          console.log(`❌ Error parsing GitHub response: ${error.message}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Error connecting to GitHub: ${error.message}`);
      resolve(false);
    });
    
    req.end();
  });
}

/**
 * Validates the auto-updater implementation in `electron/main.js`.
 *
 * Checks for the import of `electron-updater`, presence of all required auto-updater event handlers, invocation of `checkForUpdatesAndNotify`, and existence of a development mode check. Logs detailed messages about missing elements or errors encountered during validation.
 *
 * @returns {boolean} `true` if all required elements are present; otherwise, `false`.
 */
function testMainJsImplementation() {
  console.log('\n⚡ Testing main.js auto-updater implementation...');
  
  try {
    const mainJs = readFileSync('electron/main.js', 'utf8');
    
    // Check for electron-updater import
    if (!mainJs.includes('electron-updater')) {
      console.log('❌ electron-updater not imported in main.js');
      return false;
    }
    
    // Check for auto-updater events
    const requiredEvents = [
      'checking-for-update',
      'update-available',
      'update-not-available',
      'error',
      'download-progress',
      'update-downloaded'
    ];
    
    const missingEvents = requiredEvents.filter(event => 
      !mainJs.includes(`autoUpdater.on('${event}'`)
    );
    
    if (missingEvents.length > 0) {
      console.log('❌ Missing auto-updater event handlers:');
      missingEvents.forEach(event => console.log(`   - ${event}`));
      return false;
    }
    
    // Check for checkForUpdatesAndNotify call
    if (!mainJs.includes('checkForUpdatesAndNotify')) {
      console.log('❌ checkForUpdatesAndNotify not called in main.js');
      return false;
    }
    
    // Check for development mode check
    if (!mainJs.includes('isDev') || !mainJs.includes('!isDev')) {
      console.log('⚠️  No development mode check found - updates may run in development');
    }
    
    console.log('✅ main.js auto-updater implementation is complete');
    console.log('   - All event handlers present');
    console.log('   - Update check implemented');
    console.log('   - User notifications configured');
    
    return true;
    
  } catch (error) {
    console.log(`❌ Error reading main.js: ${error.message}`);
    return false;
  }
}

/**
 * Validates the GitHub Actions workflow configuration for auto-update publishing.
 *
 * Checks that the workflow file `.github/workflows/release.yml` includes the `--publish=always` flag and the `GH_TOKEN` environment variable, both required for generating and publishing update files to GitHub releases.
 * @returns {boolean} `true` if the workflow is correctly configured; otherwise, `false`.
 */
function testWorkflowConfiguration() {
  console.log('\n🔄 Testing GitHub Actions workflow...');
  
  try {
    const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
    
    // Check for publish flag
    if (!workflow.includes('--publish=always')) {
      console.log('❌ --publish=always not found in workflow');
      console.log('   Auto-update files will not be generated');
      return false;
    }
    
    // Check for GH_TOKEN
    if (!workflow.includes('GH_TOKEN')) {
      console.log('❌ GH_TOKEN not configured in workflow');
      console.log('   Publishing to GitHub releases will fail');
      return false;
    }
    
    console.log('✅ GitHub Actions workflow configured correctly');
    console.log('   - Publish flag present');
    console.log('   - GitHub token configured');
    
    return true;
    
  } catch (error) {
    console.log(`❌ Error reading workflow file: ${error.message}`);
    return false;
  }
}

/**
 * Executes all auto-update configuration tests and reports the results.
 *
 * Runs each validation test sequentially, summarizes the outcomes, provides next-step recommendations, and exits the process with a success or failure code based on the test results.
 */
async function runTests() {
  const results = [];
  
  results.push(testPackageJsonConfig());
  results.push(await testGitHubRepository());
  results.push(testMainJsImplementation());
  results.push(testWorkflowConfiguration());
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('\n📊 Test Results:');
  console.log(`   Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Auto-update configuration is ready.');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
  }
  
  console.log('\n💡 Next steps:');
  console.log('   1. Fix any failing tests');
  console.log('   2. Create a new release to test auto-updates');
  console.log('   3. Consider setting up code signing for better security');
  
  process.exit(passed === total ? 0 : 1);
}

runTests().catch(console.error);
