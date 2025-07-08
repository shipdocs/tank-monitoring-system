import { joi } from '../middleware/validation.js';

// Additional validation schemas for endpoints not covered in main schemas.js

// Empty body schema for endpoints that don't accept body data
export const emptyBodySchema = joi.object({}).unknown(false);

// Flexible file validation schema
export const flexibleValidateQuerySchema = joi.object({
  path: joi.safeCustom().safePath().max(500).required(),
  format: joi.string().valid('auto', 'csv', 'json', 'xml', 'txt', 'fixed-width', 'tsv').default('auto'),
});

// CSV columns query schema
export const csvColumnsQuerySchema = joi.object({
  refresh: joi.boolean().default(false),
  preview: joi.number().integer().min(1).max(100).default(5),
});

// CSV test import schema
export const csvTestImportSchema = joi.object({
  maxRows: joi.number().integer().min(1).max(1000).default(5),
  skipRows: joi.number().integer().min(0).max(1000).default(0),
  validateMapping: joi.boolean().default(true),
});

// Flexible sources creation schema (enhanced)
export const flexibleSourceCreateSchema = joi.object({
  id: joi.string().min(1).max(50).pattern(/^[a-zA-Z0-9_-]+$/).required(),
  name: joi.string().min(1).max(100).optional(),
  description: joi.string().max(500).optional(),
  type: joi.string().valid('file', 'directory', 'url', 'serial').required(),
  enabled: joi.boolean().default(false),

  // File/directory specific
  path: joi.when('type', {
    is: joi.valid('file', 'directory'),
    then: joi.safeCustom().safePath().max(500).required(),
    otherwise: joi.forbidden(),
  }),

  // URL specific
  url: joi.when('type', {
    is: 'url',
    then: joi.safeCustom().secureUrl().max(2000).required(),
    otherwise: joi.forbidden(),
  }),

  // Serial port specific
  port: joi.when('type', {
    is: 'serial',
    then: joi.string().pattern(/^(COM\d+|\/dev\/tty[A-Za-z0-9]+)$/).required(),
    otherwise: joi.forbidden(),
  }),

  format: joi.string().valid('auto', 'csv', 'json', 'xml', 'txt', 'fixed-width', 'tsv').default('auto'),
  encoding: joi.string().valid('utf8', 'utf16le', 'latin1', 'ascii').default('utf8'),
  polling: joi.boolean().default(false),
  pollInterval: joi.number().integer().min(1000).max(3600000).default(30000),

  options: joi.object({
    autoDetectDelimiter: joi.boolean().default(true),
    autoDetectHeaders: joi.boolean().default(true),
    skipEmptyLines: joi.boolean().default(true),
    trimValues: joi.boolean().default(true),
    delimiter: joi.string().valid(',', ';', '\t', '|', ' ').default(','),
    extensions: joi.array().items(
      joi.string().pattern(/^\.[a-zA-Z0-9]+$/).max(10),
    ).max(20).default(['.csv', '.json', '.txt', '.xml', '.tsv']),
    maxFileSize: joi.number().integer().min(1).max(104857600).default(10485760), // 10MB
    timeout: joi.number().integer().min(1000).max(300000).default(30000),
    retryAttempts: joi.number().integer().min(0).max(10).default(3),
    retryDelay: joi.number().integer().min(100).max(60000).default(5000),
  }).default(),

  mapping: joi.object().pattern(
    joi.string().valid(
      'id', 'name', 'level', 'maxCapacity', 'minLevel', 'maxLevel',
      'temperature', 'pressure', 'humidity', 'status', 'unit', 'location', 'type',
    ),
    joi.string().min(1).max(100).pattern(/^[a-zA-Z0-9_\-\s]+$/),
  ).default({}),

  autoDiscoverColumns: joi.boolean().default(true),

  // Authentication for URL sources
  authentication: joi.when('type', {
    is: 'url',
    then: joi.object({
      type: joi.string().valid('none', 'basic', 'bearer', 'apikey').default('none'),
      username: joi.string().max(100).when('type', {
        is: 'basic',
        then: joi.required(),
      }),
      password: joi.string().max(100).when('type', {
        is: 'basic',
        then: joi.required(),
      }),
      token: joi.string().max(500).when('type', {
        is: 'bearer',
        then: joi.required(),
      }),
      apiKey: joi.string().max(500).when('type', {
        is: 'apikey',
        then: joi.required(),
      }),
      headerName: joi.string().max(100).default('X-API-Key'),
    }).optional(),
    otherwise: joi.forbidden(),
  }),

  // Validation rules
  validation: joi.object({
    requiredFields: joi.array().items(joi.string()).max(20).default([]),
    dataTypes: joi.object().pattern(
      joi.string(),
      joi.string().valid('string', 'number', 'boolean', 'date'),
    ).default({}),
    ranges: joi.object().pattern(
      joi.string(),
      joi.object({
        min: joi.number(),
        max: joi.number(),
      }),
    ).default({}),
  }).default(),
}).custom((value, helpers) => {
  // Custom validation for authentication
  if (value.type === 'url' && value.authentication) {
    const auth = value.authentication;
    if (auth.type === 'basic' && (!auth.username || !auth.password)) {
      return helpers.error('any.invalid', {
        message: 'Basic authentication requires username and password',
      });
    }
    if (auth.type === 'bearer' && !auth.token) {
      return helpers.error('any.invalid', {
        message: 'Bearer authentication requires token',
      });
    }
    if (auth.type === 'apikey' && !auth.apiKey) {
      return helpers.error('any.invalid', {
        message: 'API key authentication requires apiKey',
      });
    }
  }

  // Validate poll interval for polling sources
  if (value.polling && value.pollInterval < 5000) {
    return helpers.error('any.invalid', {
      message: 'Poll interval must be at least 5 seconds for polling sources',
    });
  }

  return value;
});

// Enhanced config update schema with comprehensive validation
export const enhancedConfigSchema = joi.object({
  selectedPort: joi.string().pattern(/^(COM\d+|\/dev\/tty[A-Za-z0-9]+)$/).allow(null),
  baudRate: joi.number().valid(300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200).default(9600),
  dataBits: joi.number().valid(5, 6, 7, 8).default(8),
  stopBits: joi.number().valid(1, 1.5, 2).default(1),
  parity: joi.string().valid('none', 'even', 'odd', 'mark', 'space').default('none'),
  autoConnect: joi.boolean().default(false),
  tankCount: joi.number().integer().min(1).max(100).default(12),
  dataFormat: joi.string().valid('csv', 'json', 'custom', 'flexible').default('csv'),
  customParser: joi.string().max(10000).allow(null),

  // Enhanced CSV file configuration
  csvFile: joi.object({
    enabled: joi.boolean().default(false),
    filePath: joi.when('enabled', {
      is: true,
      then: joi.safeCustom().safePath().max(500).required(),
      otherwise: joi.optional(),
    }),
    importInterval: joi.number().integer().min(1000).max(3600000).default(30000),
    hasHeaders: joi.boolean().default(true),
    delimiter: joi.string().valid(',', ';', '\t', '|', ' ').default(','),
    encoding: joi.string().valid('utf8', 'utf16le', 'latin1', 'ascii').default('utf8'),
    columnMapping: joi.object().pattern(
      joi.string().valid(
        'id', 'name', 'level', 'maxCapacity', 'minLevel', 'maxLevel',
        'temperature', 'pressure', 'humidity', 'status', 'unit', 'location', 'type',
      ),
      joi.string().min(1).max(100).pattern(/^[a-zA-Z0-9_\-\s]+$/),
    ).default({}),
    autoDiscoverColumns: joi.boolean().default(true),
    isVerticalFormat: joi.boolean().default(false),
    linesPerRecord: joi.number().integer().min(1).max(100).when('isVerticalFormat', {
      is: true,
      then: joi.required(),
    }),
    lineMapping: joi.object().pattern(
      joi.string().pattern(/^\d+$/),
      joi.string().valid('level', 'temperature', 'name', 'ignore'),
    ).when('isVerticalFormat', {
      is: true,
      then: joi.required(),
    }),
    maxRecords: joi.number().integer().min(0).max(1000).default(0),
    skipOutliers: joi.boolean().default(false),
    temperatureRange: joi.object({
      min: joi.number().min(-100).max(100).default(0),
      max: joi.number().min(-100).max(200).default(50),
    }).when('skipOutliers', {
      is: true,
      then: joi.required(),
    }),
    autoDetectDataEnd: joi.boolean().default(true),
  }).default(),

  // Data sources array
  dataSources: joi.array().items(flexibleSourceCreateSchema).max(10).default([]),

  // Monitoring settings
  monitoring: joi.object({
    healthCheckInterval: joi.number().integer().min(5000).max(300000).default(30000),
    connectionTimeout: joi.number().integer().min(10000).max(300000).default(60000),
    maxRetries: joi.number().integer().min(0).max(10).default(3),
    retryDelay: joi.number().integer().min(1000).max(60000).default(5000),
  }).default(),

  // Performance settings
  performance: joi.object({
    maxConcurrentConnections: joi.number().integer().min(1).max(1000).default(100),
    dataBufferSize: joi.number().integer().min(1).max(10000).default(1000),
    compressionEnabled: joi.boolean().default(true),
    cacheTimeout: joi.number().integer().min(1000).max(3600000).default(300000),
  }).default(),
});

// File validation for CSV validation endpoint
export const csvFileValidationSchema = joi.object({
  filePath: joi.safeCustom().safePath().max(500).required(),
  validateStructure: joi.boolean().default(true),
  maxSampleRows: joi.number().integer().min(1).max(1000).default(100),
  strictMode: joi.boolean().default(false),
});

// Status query parameters
export const statusQuerySchema = joi.object({
  detailed: joi.boolean().default(false),
  includeMetrics: joi.boolean().default(false),
  format: joi.string().valid('json', 'summary').default('json'),
});

// Health check schema
export const healthCheckSchema = joi.object({
  checkConnections: joi.boolean().default(true),
  checkFiles: joi.boolean().default(true),
  checkMemory: joi.boolean().default(false),
  timeout: joi.number().integer().min(1000).max(30000).default(5000),
});

// Metrics query schema
export const metricsQuerySchema = joi.object({
  startTime: joi.date().iso().optional(),
  endTime: joi.date().iso().optional(),
  granularity: joi.string().valid('1m', '5m', '15m', '1h', '1d').default('5m'),
  metrics: joi.array().items(
    joi.string().valid('connections', 'requests', 'errors', 'latency', 'memory', 'cpu'),
  ).default(['connections', 'requests', 'errors']),
});

// Tank data query schema
export const tankDataQuerySchema = joi.object({
  tankIds: joi.array().items(joi.number().integer().min(1).max(1000)).max(100).optional(),
  includeHistory: joi.boolean().default(false),
  historyDuration: joi.string().valid('1h', '6h', '12h', '24h', '7d').default('1h'),
  format: joi.string().valid('current', 'detailed', 'summary').default('current'),
});

// Configuration backup/restore schemas
export const configBackupSchema = joi.object({
  includeSecrets: joi.boolean().default(false),
  compression: joi.boolean().default(true),
  format: joi.string().valid('json', 'yaml').default('json'),
});

export const configRestoreSchema = joi.object({
  config: joi.object().required(),
  overwriteExisting: joi.boolean().default(false),
  validateOnly: joi.boolean().default(false),
  backupCurrent: joi.boolean().default(true),
});
