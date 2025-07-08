# Tank Monitor Logging System

This document describes the comprehensive logging system implemented for the Tank Monitor server application.

## Overview

The logging system replaces all `console.log` statements with a production-ready logging solution using **Winston** with the following features:

- **Structured logging** with JSON format
- **Log levels** (error, warn, info, debug)
- **Daily log rotation** with compression
- **Module-specific loggers** for better organization
- **Request logging middleware** for HTTP requests
- **Audit logging** for security events
- **Performance logging** for slow operations
- **Error logging** with stack traces

## Installation

The logging system is already installed with the following dependencies:
- `winston` - Main logging library
- `winston-daily-rotate-file` - Daily log rotation

## Configuration

### Environment Variables

- `LOG_LEVEL`: Set logging level (debug, info, warn, error) - default: `info`
- `LOG_TO_CONSOLE`: Set to `true` to enable console output in production - default: `false` in production
- `NODE_ENV`: Set to `production` to disable console logging

### Log Files

Logs are stored in the `./logs/` directory:
- `application-YYYY-MM-DD.log` - General application logs
- `error-YYYY-MM-DD.log` - Error logs only

### Log Rotation

- **Daily rotation**: New log files created daily
- **Compression**: Old files are gzipped
- **Retention**: 
  - Application logs: 14 days
  - Error logs: 30 days
- **Max file size**: 20MB per file

## Usage

### Basic Logging

```javascript
import logger, { createModuleLogger } from './logger.js';

// Create module-specific logger
const moduleLogger = createModuleLogger('my-module');

// Log at different levels
moduleLogger.info('Application started');
moduleLogger.debug('Debug information');
moduleLogger.warn('Warning message');
moduleLogger.error('Error occurred');
```

### Structured Logging

```javascript
moduleLogger.info('User action', {
  userId: 'user123',
  action: 'login',
  timestamp: new Date().toISOString(),
  metadata: {
    browser: 'Chrome',
    ip: '192.168.1.100'
  }
});
```

### Error Logging

```javascript
import { logError } from './logger.js';

try {
  // Some operation
} catch (error) {
  logError(error, { 
    context: 'Database operation failed',
    userId: 'user123',
    operation: 'updateTank'
  });
}
```

### Audit Logging

```javascript
import { auditLog } from './logger.js';

auditLog('USER_LOGIN', username, { 
  ip: req.ip,
  userAgent: req.get('user-agent'),
  success: true
});
```

### Performance Logging

```javascript
import { logPerformance } from './logger.js';

const startTime = Date.now();
// ... some operation
const duration = Date.now() - startTime;

logPerformance('Database query', duration, {
  query: 'SELECT * FROM tanks',
  rowCount: results.length
});
```

### Tank Data Logging

```javascript
import { logTankData } from './logger.js';

logTankData('imported', tanks, {
  source: 'csv-file',
  filePath: '/path/to/file.csv'
});
```

## Module Loggers

The system includes specialized loggers for different modules:

- `main-server` - Main server operations
- `auth` - Authentication operations
- `auth-routes` - Authentication route handlers
- `csv-parser` - CSV file parsing
- `serial-port` - Serial port communication
- `websocket` - WebSocket operations
- `file-monitor` - File monitoring operations

## Request Logging

HTTP requests are automatically logged with:
- Request method and URL
- Response status code
- Response time
- User agent
- IP address

## Security & Audit Events

The following events are automatically logged:
- `LOGIN_SUCCESS` / `LOGIN_FAILED`
- `PASSWORD_CHANGED`
- `USER_CREATED` / `USER_DELETED`
- `CONFIG_UPDATED`
- `SERIAL_PORT_CONNECTED` / `SERIAL_PORT_DISCONNECTED`
- `WEBSOCKET_CONNECTED` / `WEBSOCKET_DISCONNECTED`

## Log Format

### Console Output (Development)
```
2025-07-08 21:17:25 [info]: User logged in successfully {"module":"auth","username":"admin","role":"admin"}
```

### File Output (JSON)
```json
{
  "level": "info",
  "message": "User logged in successfully",
  "module": "auth",
  "username": "admin",
  "role": "admin",
  "timestamp": "2025-07-08 21:17:25.326"
}
```

## Testing

Use the test script to verify logging functionality:

```bash
node test-logging.js
```

## Migration Notes

### What Changed

1. **Replaced console.log** - All `console.log`, `console.error`, `console.warn` statements replaced with proper logging
2. **Added request logging** - All HTTP requests are now logged
3. **Added audit logging** - Security events are tracked
4. **Added performance logging** - Slow operations are highlighted
5. **Added structured logging** - Metadata is included with log entries

### Files Modified

- `index.js` - Main server file with comprehensive logging
- `fileMonitor.js` - File monitoring with logging
- `middleware/auth.js` - Authentication with audit logging
- `routes/auth.js` - Authentication routes with logging

### Original Files Backed Up

All original files are backed up with `.backup` extension:
- `index.js.backup`
- `fileMonitor.js.backup`
- `middleware/auth.js.backup`
- `routes/auth.js.backup`

## Troubleshooting

### Log Files Not Created

1. Check if `logs/` directory exists
2. Verify write permissions
3. Check disk space

### Console Output Not Showing

1. Set `LOG_TO_CONSOLE=true` environment variable
2. Check `LOG_LEVEL` setting
3. Verify NODE_ENV is not set to `production`

### Performance Issues

1. Check log level (set to `warn` or `error` in production)
2. Verify log rotation is working
3. Monitor disk space usage

## Best Practices

1. **Use appropriate log levels**:
   - `error` - Application errors, exceptions
   - `warn` - Warning conditions, deprecated features
   - `info` - General information, user actions
   - `debug` - Detailed debugging information

2. **Include relevant metadata**:
   - User ID, session ID
   - Request context
   - Timestamps
   - Error codes

3. **Don't log sensitive data**:
   - Passwords
   - API keys
   - Personal information

4. **Monitor log files**:
   - Set up log rotation
   - Monitor disk usage
   - Archive old logs

## Production Deployment

For production environments:

1. Set `LOG_LEVEL=warn` or `LOG_LEVEL=error`
2. Set `NODE_ENV=production`
3. Set up log monitoring and alerting
4. Configure log forwarding to centralized logging system
5. Set up automated log cleanup

## Integration with Monitoring

The logging system can be integrated with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Prometheus** + **Grafana**
- **Splunk**
- **DataDog**
- **New Relic**

Example log forwarding configuration for Fluentd:
```xml
<source>
  @type tail
  path /path/to/logs/*.log
  pos_file /var/log/fluentd/tankmon.log.pos
  tag tankmon.*
  format json
</source>
```

## Support

For issues or questions about the logging system:
1. Check the log files in `./logs/`
2. Review the console output for errors
3. Test with `node test-logging.js`
4. Check file permissions and disk space