#!/usr/bin/env node

// Demo script to showcase the logging system
import {
  auditLog,
  createModuleLogger,
  logError,
  logPerformance,
  logTankData,
} from './logger.js';

(async () => {

  const demoLogger = createModuleLogger('demo');

  console.log('🚀 Tank Monitor Logging System Demo');
  console.log('=====================================\n');

  // 1. Basic logging levels
  console.log('1. Testing different log levels:');
  demoLogger.debug('This is a debug message (detailed info)');
  demoLogger.info('This is an info message (general info)');
  demoLogger.warn('This is a warning message (potential issue)');
  demoLogger.error('This is an error message (actual problem)');

  // 2. Structured logging
  console.log('\n2. Testing structured logging:');
  demoLogger.info('User connected to tank monitoring system', {
    userId: 'user123',
    sessionId: 'sess456',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 Chrome/120.0',
    timestamp: new Date().toISOString(),
  });

  // 3. Error logging with context
  console.log('\n3. Testing error logging:');
  try {
    throw new Error('Simulated tank sensor connection failure');
  } catch (error) {
    logError(error, {
      context: 'Tank sensor monitoring',
      tankId: 'tank-001',
      sensorType: 'level-sensor',
      lastReading: '75%',
      facility: 'North Plant',
    });
  }

  // 4. Audit logging
  console.log('\n4. Testing audit logging:');
  auditLog('TANK_CONFIG_CHANGED', 'admin', {
    tankId: 'tank-001',
    oldCapacity: 1000,
    newCapacity: 1200,
    reason: 'Tank upgrade',
    approvedBy: 'supervisor123',
  });

  // 5. Performance logging
  console.log('\n5. Testing performance logging:');
  const startTime = Date.now();
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 150));
  const duration = Date.now() - startTime;

  logPerformance('Database tank query', duration, {
    query: 'SELECT * FROM tanks WHERE facility = ?',
    params: ['North Plant'],
    rowCount: 12,
    cacheHit: false,
  });

  // 6. Tank data logging
  console.log('\n6. Testing tank data logging:');
  const mockTanks = [
    { id: 1, name: 'Tank A', level: 75, capacity: 1000, status: 'normal' },
    { id: 2, name: 'Tank B', level: 45, capacity: 800, status: 'low' },
    { id: 3, name: 'Tank C', level: 92, capacity: 1200, status: 'high' },
  ];

  logTankData('updated', mockTanks, {
    source: 'serial-port',
    updateInterval: 30000,
    facility: 'North Plant',
  });

  // 7. Different module loggers
  console.log('\n7. Testing module-specific loggers:');
  const authLogger = createModuleLogger('auth');
  const serialLogger = createModuleLogger('serial-port');
  const wsLogger = createModuleLogger('websocket');

  authLogger.info('User authentication successful');
  serialLogger.debug('Serial port data received', { bytes: 124, port: 'COM3' });
  wsLogger.warn('WebSocket connection unstable', { reconnectAttempts: 3 });

  console.log('\n✅ Demo completed!');
  console.log('📁 Check the logs/ directory for generated log files:');
  console.log('   - application-YYYY-MM-DD.log (all logs)');
  console.log('   - error-YYYY-MM-DD.log (errors only)');
  console.log('\n🎯 This demonstrates a production-ready logging system with:');
  console.log('   ✓ Multiple log levels');
  console.log('   ✓ Structured JSON logging');
  console.log('   ✓ Error tracking with stack traces');
  console.log('   ✓ Audit trails for security');
  console.log('   ✓ Performance monitoring');
  console.log('   ✓ Module-specific loggers');
  console.log('   ✓ Daily log rotation');
  console.log('   ✓ Separate error logs');

})();
