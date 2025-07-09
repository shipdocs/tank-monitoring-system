#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('📦 Preparing minimal server dependencies...');

// Create temp directory
const tempDir = path.join(rootDir, 'server-deps-temp');
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true });
}
fs.mkdirSync(tempDir);

// Create package.json with only required dependencies
const serverDeps = {
  'name': 'tank-monitoring-server-deps',
  'version': '1.0.0',
  'type': 'module',
  'dependencies': {
    'express': '^4.21.1',
    'ws': '^8.19.0',
    'cors': '^2.8.5',
    'csv-parser': '^3.2.0',
    'chokidar': '^4.0.3',
    'serialport': '^12.0.1',
    'winston': '^3.17.0',
    'winston-daily-rotate-file': '^5.0.0',
    'jsonwebtoken': '^9.0.2',
    'bcrypt': '^6.0.0',
    'express-rate-limit': '^7.5.1',
  },
};

fs.writeFileSync(
  path.join(tempDir, 'package.json'),
  JSON.stringify(serverDeps, null, 2),
);

// Install only production dependencies
console.log('Installing production dependencies...');
execSync('npm install --production --no-optional', {
  cwd: tempDir,
  stdio: 'inherit',
});

// Move to server-deps directory
const targetDir = path.join(rootDir, 'server-deps');
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true });
}
fs.renameSync(tempDir, targetDir);

console.log('✅ Server dependencies prepared in server-deps/');
console.log('📁 This directory will be included in the build');
