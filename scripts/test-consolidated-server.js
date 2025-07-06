#!/usr/bin/env node

/**
 * Consolidated Server Test Script
 * 
 * This script validates the consolidated server implementation
 */

import { readFileSync } from 'fs';
import https from 'https';

console.log('🔍 Testing Consolidated Server Implementation...\n');

/**
 * Validates the integrated server configuration by checking for required API endpoints, connection status tracking, and broadcast functionality in `electron/integrated-server.js`.
 * @returns {boolean} True if all required elements are present; false otherwise.
 */
function testIntegratedServerConfig() {
  console.log('🔧 Testing integrated server configuration...');
  
  try {
    const integratedServerJs = readFileSync('electron/integrated-server.js', 'utf8');
    
    // Check for required API endpoints
    const requiredEndpoints = [
      '/api/status',
      '/api/config',
      '/api/tanks',
      '/api/tank-config',
      '/api/branding',
      '/api/security',
      '/api/connect',
      '/api/disconnect',
      '/settings'
    ];
    
    const missingEndpoints = requiredEndpoints.filter(endpoint => 
      !integratedServerJs.includes(`'${endpoint}'`) && !integratedServerJs.includes(`"${endpoint}"`)
    );
    
    if (missingEndpoints.length > 0) {
      console.log('❌ Missing API endpoints:');
      missingEndpoints.forEach(endpoint => console.log(`   - ${endpoint}`));
      return false;
    }
    
    // Check for connection status logic
    if (!integratedServerJs.includes('isFileMonitoringActive')) {
      console.log('❌ Missing connection status tracking');
      return false;
    }
    
    // Check for broadcast functions
    if (!integratedServerJs.includes('broadcastStatus')) {
      console.log('❌ Missing broadcastStatus function');
      return false;
    }
    
    console.log('✅ Integrated server configuration is complete');
    console.log('   - All required API endpoints present');
    console.log('   - Connection status tracking implemented');
    console.log('   - Broadcast functions available');
    return true;
    
  } catch (error) {
    console.log(`❌ Error reading integrated server: ${error.message}`);
    return false;
  }
}

/**
 * Validates the implementation of the Electron settings window in main.js.
 *
 * Checks for the existence of the settings window variable, the createSettingsWindow function, integration of the settings window in the menu, and ensures that external browser opening for settings has been removed. Logs results and returns true if all checks pass, false otherwise.
 * @returns {boolean} True if the Electron settings window implementation meets all requirements; false otherwise.
 */
function testElectronSettingsWindow() {
  console.log('\n⚡ Testing Electron settings window implementation...');
  
  try {
    const mainJs = readFileSync('electron/main.js', 'utf8');
    
    // Check for settings window variable
    if (!mainJs.includes('settingsWindow')) {
      console.log('❌ Settings window variable not found');
      return false;
    }
    
    // Check for createSettingsWindow function
    if (!mainJs.includes('function createSettingsWindow')) {
      console.log('❌ createSettingsWindow function not found');
      return false;
    }
    
    // Check for menu integration
    if (!mainJs.includes('createSettingsWindow()')) {
      console.log('❌ Settings window not integrated in menu');
      return false;
    }
    
    // Check that external browser opening is removed
    if (mainJs.includes('shell.openExternal(\'http://localhost:3001/settings\')')) {
      console.log('❌ Still using external browser for settings');
      return false;
    }
    
    console.log('✅ Electron settings window implementation is correct');
    console.log('   - Settings window variable defined');
    console.log('   - createSettingsWindow function implemented');
    console.log('   - Menu integration completed');
    console.log('   - External browser dependency removed');
    return true;
    
  } catch (error) {
    console.log(`❌ Error reading main.js: ${error.message}`);
    return false;
  }
}

/**
 * Validates that the wizard configuration mapping in `serverConfig.ts` supports vertical format, required fields, line mapping, and correct data format mapping.
 * @returns {boolean} True if all required configuration features are present and correct; false otherwise.
 */
function testWizardConfigMapping() {
  console.log('\n🧙 Testing wizard configuration mapping...');
  
  try {
    const serverConfigTs = readFileSync('src/utils/serverConfig.ts', 'utf8');
    
    // Check for vertical format support
    if (!serverConfigTs.includes('isVerticalFormat')) {
      console.log('❌ Vertical format support missing');
      return false;
    }
    
    // Check for line mapping support
    if (!serverConfigTs.includes('lineMapping')) {
      console.log('❌ Line mapping support missing');
      return false;
    }
    
    // Check for additional vertical format fields
    const requiredFields = [
      'autoDetectDataEnd',
      'skipOutliers',
      'maxRecords',
      'temperatureRange'
    ];
    
    const missingFields = requiredFields.filter(field => 
      !serverConfigTs.includes(field)
    );
    
    if (missingFields.length > 0) {
      console.log('❌ Missing vertical format fields:');
      missingFields.forEach(field => console.log(`   - ${field}`));
      return false;
    }
    
    // Check for correct dataFormat mapping
    if (!serverConfigTs.includes('dataFormat: \'csvfile\'')) {
      console.log('❌ Incorrect dataFormat mapping');
      return false;
    }
    
    console.log('✅ Wizard configuration mapping is correct');
    console.log('   - Vertical format support implemented');
    console.log('   - All required fields present');
    console.log('   - Correct dataFormat mapping');
    return true;
    
  } catch (error) {
    console.log(`❌ Error reading serverConfig.ts: ${error.message}`);
    return false;
  }
}

/**
 * Checks that `electron/settings.html` exists, is sufficiently complete, and contains all required elements.
 * @returns {boolean} True if the file is present, large enough, and includes all essential elements; false otherwise.
 */
function testSettingsHtmlLocation() {
  console.log('\n📄 Testing settings.html location...');
  
  try {
    const settingsHtml = readFileSync('electron/settings.html', 'utf8');
    
    if (settingsHtml.length < 1000) {
      console.log('❌ Settings.html seems incomplete');
      return false;
    }
    
    // Check for essential elements
    const requiredElements = [
      'Tank Monitor Settings',
      'passwordModal',
      'mainContent',
      'statusIndicator'
    ];
    
    const missingElements = requiredElements.filter(element => 
      !settingsHtml.includes(element)
    );
    
    if (missingElements.length > 0) {
      console.log('❌ Missing essential elements in settings.html:');
      missingElements.forEach(element => console.log(`   - ${element}`));
      return false;
    }
    
    console.log('✅ Settings.html is properly located and complete');
    console.log('   - File exists in electron folder');
    console.log('   - All essential elements present');
    console.log('   - File size indicates complete content');
    return true;
    
  } catch (error) {
    console.log(`❌ Error reading electron/settings.html: ${error.message}`);
    return false;
  }
}

/**
 * Checks for potential conflicts between standalone and integrated server implementations.
 *
 * Reads project configuration and server files to detect if the development script still uses the standalone server and whether both server implementations coexist. Logs warnings if conflicts are found, which may be acceptable during a transition period.
 * @returns {boolean} True if the check completes without errors, false otherwise.
 */
function testForConflicts() {
  console.log('\n⚠️  Testing for potential conflicts...');
  
  let warnings = [];
  
  try {
    // Check if standalone server is still being used in development
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    
    if (packageJson.scripts['dev:backend'] && packageJson.scripts['dev:backend'].includes('server/index.js')) {
      warnings.push('Development still uses standalone server (server/index.js)');
    }
    
    // Check for duplicate API endpoints
    const integratedServer = readFileSync('electron/integrated-server.js', 'utf8');
    const standaloneServer = readFileSync('server/index.js', 'utf8');
    
    // This is expected - both servers have similar endpoints
    // We'll just warn about it
    warnings.push('Both standalone and integrated servers exist (expected during transition)');
    
    if (warnings.length > 0) {
      console.log('⚠️  Potential conflicts detected:');
      warnings.forEach(warning => console.log(`   - ${warning}`));
      console.log('   These may be acceptable during transition period.');
    } else {
      console.log('✅ No conflicts detected');
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ Error checking for conflicts: ${error.message}`);
    return false;
  }
}

/**
 * Executes all consolidated server validation tests, logs a summary of results, and exits the process with an appropriate status code.
 *
 * Runs five main tests covering server configuration, Electron settings window integration, wizard configuration mapping, settings HTML validation, and conflict detection. Provides next-step instructions if all tests pass.
 */
async function runTests() {
  const results = [];
  
  results.push(testIntegratedServerConfig());
  results.push(testElectronSettingsWindow());
  results.push(testWizardConfigMapping());
  results.push(testSettingsHtmlLocation());
  results.push(testForConflicts());
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('\n📊 Test Results:');
  console.log(`   Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Consolidated server implementation is ready.');
    console.log('\n💡 Next steps:');
    console.log('   1. Test the application in Electron');
    console.log('   2. Verify settings window opens correctly');
    console.log('   3. Test wizard → settings synchronization');
    console.log('   4. Validate connection status with vertical format files');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
  }
  
  console.log('\n🚀 Ready for Windows testing!');
  
  process.exit(passed === total ? 0 : 1);
}

runTests().catch(console.error);
