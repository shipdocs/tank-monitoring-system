import { customValidations, joi } from '../middleware/validation-simple.js';

// Common field definitions for reuse
const commonFields = {
  id: joi.number().integer().min(1).max(10000),
  tankId: joi.number().integer().min(1).max(1000),
  tankName: joi.string().min(1).max(100).pattern(/^[a-zA-Z0-9\s\-_]+$/),
  level: joi.number().min(0).max(100000),
  percentage: joi.number().min(0).max(100),
  delimiter: joi.string().valid(',', ';', '\t', '|', ' ').default(','),
  encoding: joi.string().valid('utf8', 'utf16le', 'latin1', 'ascii').default('utf8'),
  filePath: joi.string().max(500).custom(customValidations.safePath),
  url: joi.string().max(2000).custom(customValidations.secureUrl),
  port: joi.number().integer().min(1).max(65535),
  baudRate: joi.number().valid(300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200).default(9600),
  columnName: joi.string().min(1).max(100).pattern(/^[a-zA-Z0-9_\-\s]+$/),
  mappingField: joi.string().valid(
    'id', 'name', 'level', 'maxCapacity', 'minLevel', 'maxLevel',
    'temperature', 'pressure', 'humidity', 'status', 'unit', 'location', 'type',
  ),
};

// Tank configuration schema
export const tankConfigSchema = joi.object({
  preAlarmPercentage: joi.number().min(0).max(100).required(),
  overfillPercentage: joi.number().min(0).max(100).required(),
  lowLevelPercentage: joi.number().min(0).max(100).required(),
  tanks: joi.object().pattern(
    joi.string(),
    joi.object({
      name: commonFields.tankName,
      maxCapacity: joi.number().min(1).max(1000000),
      minLevel: joi.number().min(0).max(100000),
      maxLevel: joi.number().min(0).max(100000),
      unit: joi.string().valid('L', 'gal', 'm³', 'ft³', 'bbl').default('L'),
      location: joi.string().max(200),
      alarmThresholds: joi.object({
        critical: joi.number().min(0).max(100),
        warning: joi.number().min(0).max(100),
        high: joi.number().min(0).max(100),
      }).optional(),
    }),
  ).default({}),
}).custom((value, helpers) => {
  // Ensure overfill > preAlarm > lowLevel
  if (value.overfillPercentage <= value.preAlarmPercentage) {
    return helpers.error('any.invalid', {
      message: 'Overfill percentage must be greater than pre-alarm percentage',
    });
  }
  if (value.preAlarmPercentage <= value.lowLevelPercentage) {
    return helpers.error('any.invalid', {
      message: 'Pre-alarm percentage must be greater than low level percentage',
    });
  }
  return value;
});

// Security settings schema
export const securitySettingsSchema = joi.object({
  username: joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_-]+$/).required(),
  password: joi.string().min(8).max(128).required(),
  oldPassword: joi.string().min(8).max(128).when('password', { is: joi.exist(), then: joi.required() }),
  role: joi.string().valid('admin', 'operator', 'viewer').default('operator'),
  sessionTimeout: joi.number().integer().min(300).max(86400).default(3600),
  maxLoginAttempts: joi.number().integer().min(1).max(10).default(5),
  lockoutDuration: joi.number().integer().min(60).max(3600).default(300),
});

// User management schemas
export const createUserSchema = joi.object({
  username: joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_-]+$/).required(),
  password: joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
  role: joi.string().valid('admin', 'operator', 'viewer').default('operator'),
});

export const changePasswordSchema = joi.object({
  oldPassword: joi.string().min(8).max(128).required(),
  newPassword: joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    })
    .invalid(joi.ref('oldPassword'))
    .messages({
      'any.invalid': 'New password must be different from old password',
    }),
});

// Data source configuration schema
export const dataSourceSchema = joi.object({
  id: joi.string().min(1).max(50).pattern(/^[a-zA-Z0-9_-]+$/).required(),
  type: joi.string().valid('file', 'directory', 'url', 'serial').required(),
  enabled: joi.boolean().default(false),
  path: joi.when('type', {
    is: joi.valid('file', 'directory'),
    then: commonFields.filePath.required(),
    otherwise: joi.forbidden(),
  }),
  url: joi.when('type', {
    is: 'url',
    then: commonFields.url.required(),
    otherwise: joi.forbidden(),
  }),
  port: joi.when('type', {
    is: 'serial',
    then: joi.string().pattern(/^(COM\d+|\/dev\/tty[A-Za-z0-9]+)$/).required(),
    otherwise: joi.forbidden(),
  }),
  format: joi.string().valid('auto', 'csv', 'json', 'xml', 'txt', 'fixed-width', 'tsv').default('auto'),
  encoding: commonFields.encoding,
  polling: joi.boolean().default(false),
  pollInterval: joi.number().integer().min(1000).max(3600000).default(30000),
  options: joi.object({
    autoDetectDelimiter: joi.boolean().default(true),
    autoDetectHeaders: joi.boolean().default(true),
    skipEmptyLines: joi.boolean().default(true),
    trimValues: joi.boolean().default(true),
    delimiter: commonFields.delimiter,
    extensions: joi.array().items(
      joi.string().pattern(/^\.[a-zA-Z0-9]+$/).max(10),
    ).max(20).default(['.csv', '.json', '.txt', '.xml', '.tsv']),
    maxFileSize: joi.number().integer().min(1).max(104857600).default(10485760), // 10MB default
    timeout: joi.number().integer().min(1000).max(300000).default(30000),
  }).default(),
  mapping: joi.object().pattern(
    commonFields.mappingField,
    commonFields.columnName,
  ).default({}),
  autoDiscoverColumns: joi.boolean().default(true),
  authentication: joi.when('type', {
    is: 'url',
    then: joi.object({
      type: joi.string().valid('none', 'basic', 'bearer', 'apikey').default('none'),
      username: joi.string().max(100),
      password: joi.string().max(100),
      token: joi.string().max(500),
      apiKey: joi.string().max(500),
      headerName: joi.string().max(100).default('X-API-Key'),
    }).optional(),
    otherwise: joi.forbidden(),
  }),
}).custom((value, helpers) => {
  // Additional validation for URL authentication
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
  return value;
});

// Main configuration schema
export const mainConfigSchema = joi.object({
  selectedPort: joi.string().pattern(/^(COM\d+|\/dev\/tty[A-Za-z0-9]+)$/).allow(null),
  baudRate: commonFields.baudRate,
  dataBits: joi.number().valid(5, 6, 7, 8).default(8),
  stopBits: joi.number().valid(1, 1.5, 2).default(1),
  parity: joi.string().valid('none', 'even', 'odd', 'mark', 'space').default('none'),
  autoConnect: joi.boolean().default(false),
  tankCount: joi.number().integer().min(1).max(100).default(12),
  dataFormat: joi.string().valid('csv', 'json', 'custom', 'flexible').default('csv'),
  customParser: joi.string().max(10000).allow(null),
  csvFile: joi.object({
    enabled: joi.boolean().default(false),
    filePath: joi.when('enabled', {
      is: true,
      then: commonFields.filePath.required(),
      otherwise: joi.optional(),
    }),
    importInterval: joi.number().integer().min(1000).max(3600000).default(30000),
    hasHeaders: joi.boolean().default(true),
    delimiter: commonFields.delimiter,
    encoding: commonFields.encoding,
    columnMapping: joi.object().pattern(
      commonFields.mappingField,
      commonFields.columnName,
    ).default({}),
    autoDiscoverColumns: joi.boolean().default(true),
  }).default(),
  dataSources: joi.array().items(dataSourceSchema).max(10).default([]),
});

// App branding schema
export const brandingSchema = joi.object({
  appName: joi.string().min(1).max(100).default('Tank Monitoring System'),
  appSlogan: joi.string().max(200).default('Real-time tank level monitoring dashboard'),
  primaryColor: joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#2563eb'),
  logoUrl: joi.string().uri().max(2000).allow('').optional(),
  favicon: joi.string().uri().max(2000).allow('').optional(),
});

// Query parameter schemas
export const browseQuerySchema = joi.object({
  path: commonFields.filePath.default(process.cwd()),
});

export const validateFileQuerySchema = joi.object({
  path: commonFields.filePath.required(),
  format: joi.string().valid('auto', 'csv', 'json', 'xml', 'txt', 'fixed-width', 'tsv').default('auto'),
});

// Path parameter schemas
export const sourceIdParamSchema = joi.object({
  id: joi.string().min(1).max(50).pattern(/^[a-zA-Z0-9_-]+$/).required(),
});

export const usernameParamSchema = joi.object({
  username: joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_-]+$/).required(),
});

// Test mapping schema
export const testMappingSchema = joi.object({
  path: commonFields.filePath.required(),
  format: joi.string().valid('auto', 'csv', 'json', 'xml', 'txt', 'fixed-width', 'tsv'),
  mapping: joi.object().pattern(
    commonFields.mappingField,
    commonFields.columnName,
  ).required().min(1),
});

// Login schema
export const loginSchema = joi.object({
  username: joi.string().min(3).max(50).required(),
  password: joi.string().min(1).max(128).required(),
});
