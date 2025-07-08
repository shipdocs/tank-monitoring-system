import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  }),
);

// Define transports
const transports = [];

// Console transport
if (process.env.NODE_ENV !== 'production' || process.env.LOG_TO_CONSOLE === 'true') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'debug',
    }),
  );
}

// File transport with daily rotation
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d', // Keep logs for 14 days
  format,
  level: process.env.LOG_LEVEL || 'info',
});

transports.push(fileRotateTransport);

// Error file transport with daily rotation
const errorFileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d', // Keep error logs for 30 days
  format,
  level: 'error',
});

transports.push(errorFileRotateTransport);

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Handle rotation events
fileRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Log file rotated', { oldFilename, newFilename });
});

errorFileRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Error log file rotated', { oldFilename, newFilename });
});

// Create specialized loggers for different modules
export const createModuleLogger = (moduleName) => ({
  error: (message, meta = {}) => logger.error(message, { module: moduleName, ...meta }),
  warn: (message, meta = {}) => logger.warn(message, { module: moduleName, ...meta }),
  info: (message, meta = {}) => logger.info(message, { module: moduleName, ...meta }),
  http: (message, meta = {}) => logger.http(message, { module: moduleName, ...meta }),
  debug: (message, meta = {}) => logger.debug(message, { module: moduleName, ...meta }),
});

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;
    const duration = Date.now() - start;

    logger.http('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    });

    return res.send(data);
  };

  next();
};

// Stream for Morgan HTTP logger
export const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Performance logging utility
export const logPerformance = (operation, duration, metadata = {}) => {
  if (duration > 1000) {
    logger.warn(`Slow operation: ${operation}`, { duration: `${duration}ms`, ...metadata });
  } else {
    logger.debug(`Operation completed: ${operation}`, { duration: `${duration}ms`, ...metadata });
  }
};

// Tank data logging utility
export const logTankData = (event, tanks, metadata = {}) => {
  logger.info(`Tank data ${event}`, {
    tankCount: tanks.length,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

// Error logging utility with stack trace
export const logError = (error, context = {}) => {
  logger.error(error.message, {
    stack: error.stack,
    code: error.code,
    ...context,
  });
};

// Audit logging for security events
export const auditLog = (action, user, details = {}) => {
  logger.info(`AUDIT: ${action}`, {
    user,
    timestamp: new Date().toISOString(),
    action,
    ...details,
  });
};

// System startup logging
export const logStartup = (config) => {
  logger.info('System starting up', {
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    config: {
      port: config.port,
      wsPort: config.wsPort,
      dataFormat: config.dataFormat,
      csvEnabled: config.csvFile?.enabled,
      flexibleSourcesCount: config.dataSources?.length || 0,
    },
  });
};

// Graceful shutdown logging
export const logShutdown = (reason) => {
  logger.info('System shutting down', { reason, timestamp: new Date().toISOString() });
};

export default logger;
