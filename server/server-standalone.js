#!/usr/bin/env node

// Server wrapper for pkg compilation
// This creates a CommonJS entry point that pkg can understand

import('./index.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});