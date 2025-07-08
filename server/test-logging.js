#!/usr/bin/env node

// Test script to verify logging functionality
import logger, { auditLog, createModuleLogger, logError } from './logger.js';

const testLogger = createModuleLogger('test');

console.log('🧪 Testing logging system...');

// Test different log levels
testLogger.info('This is an info message');
testLogger.debug('This is a debug message');
testLogger.warn('This is a warning message');
testLogger.error('This is an error message');

// Test error logging
try {
  throw new Error('Test error for logging');
} catch (error) {
  logError(error, { context: 'Testing error logging' });
}

// Test audit logging
auditLog('TEST_ACTION', 'test-user', { action: 'test-action', result: 'success' });

// Test structured logging
testLogger.info('Structured log test', {
  user: 'testuser',
  action: 'test',
  timestamp: new Date().toISOString(),
  metadata: {
    browser: 'Chrome',
    ip: '127.0.0.1',
  },
});

console.log('✅ Logging test completed');
console.log('📁 Check logs directory for generated files');
