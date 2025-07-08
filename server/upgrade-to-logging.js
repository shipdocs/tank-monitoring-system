#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to backup original files
async function backupFile(filePath) {
  try {
    const backupPath = `${filePath}.backup`;
    await fs.copyFile(filePath, backupPath);
    console.log(`✅ Backed up ${filePath} to ${backupPath}`);
  } catch (error) {
    console.error(`❌ Failed to backup ${filePath}:`, error.message);
  }
}

// Function to replace files
async function replaceFile(sourcePath, targetPath) {
  try {
    await fs.copyFile(sourcePath, targetPath);
    console.log(`✅ Replaced ${targetPath} with logging version`);
  } catch (error) {
    console.error(`❌ Failed to replace ${targetPath}:`, error.message);
  }
}

// Main upgrade function
async function upgradeToLogging() {
  console.log('🔄 Starting logging system upgrade...\n');

  // Files to replace
  const replacements = [
    {
      source: path.join(__dirname, 'index-with-logging.js'),
      target: path.join(__dirname, 'index.js'),
    },
    {
      source: path.join(__dirname, 'fileMonitor-with-logging.js'),
      target: path.join(__dirname, 'fileMonitor.js'),
    },
    {
      source: path.join(__dirname, 'middleware/auth-with-logging.js'),
      target: path.join(__dirname, 'middleware/auth.js'),
    },
    {
      source: path.join(__dirname, 'routes/auth-with-logging.js'),
      target: path.join(__dirname, 'routes/auth.js'),
    },
  ];

  // Backup original files
  console.log('📦 Backing up original files...');
  for (const { target } of replacements) {
    await backupFile(target);
  }

  console.log('\n🔄 Replacing files with logging versions...');
  // Replace files
  for (const { source, target } of replacements) {
    await replaceFile(source, target);
  }

  console.log('\n🎉 Logging system upgrade complete!');
  console.log('\n📋 What was changed:');
  console.log('  • Added Winston logger with file rotation');
  console.log('  • Replaced all console.log statements with proper logging');
  console.log('  • Added request logging middleware');
  console.log('  • Added audit logging for security events');
  console.log('  • Added performance logging for slow operations');
  console.log('  • Added structured logging with metadata');
  console.log('  • Configured log levels (error, warn, info, debug)');
  console.log('  • Set up daily log rotation with compression');
  console.log('  • Added specialized loggers for different modules');
  console.log('\n📁 Log files location: ./logs/');
  console.log('  • application-YYYY-MM-DD.log (general logs)');
  console.log('  • error-YYYY-MM-DD.log (error logs only)');
  console.log('\n🔧 Environment variables:');
  console.log('  • LOG_LEVEL: Set logging level (debug, info, warn, error)');
  console.log('  • LOG_TO_CONSOLE: Set to "true" to enable console output in production');
  console.log('\n⚠️  Original files backed up with .backup extension');
  console.log('   You can restore them if needed.');
}

// Run the upgrade
upgradeToLogging().catch(console.error);
