import Joi from 'joi';

// Helper function to validate request data
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false, // Return all errors
    stripUnknown: true, // Remove unknown fields
    convert: true, // Allow type coercion
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    return res.status(400).json({
      error: 'Validation failed',
      errors,
    });
  }

  next();
};

// Helper function to validate query parameters
export const validateQuery = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    return res.status(400).json({
      error: 'Query validation failed',
      errors,
    });
  }

  next();
};

// Helper function to validate path parameters
export const validateParams = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    return res.status(400).json({
      error: 'Parameter validation failed',
      errors,
    });
  }

  next();
};

// Custom validators
const customValidators = {
  // Path validation to prevent directory traversal
  safePath: (value, helpers) => {
    // Check for null bytes
    if (value.includes('\0')) {
      return helpers.error('path.unsafe', { value });
    }

    // Check for directory traversal patterns
    const traversalPatterns = [
      /\.\./,
      /%2e%2e/i,
      /%252e%252e/i,
      /\.\//,
      /\/\./,
    ];

    for (const pattern of traversalPatterns) {
      if (pattern.test(value)) {
        return helpers.error('path.traversal', { value });
      }
    }

    return value;
  },

  // Port validation
  port: (value, helpers) => {
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return helpers.error('port.invalid', { value });
    }
    return port;
  },

  // IP address validation
  ipAddress: (value, helpers) => {
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Pattern = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/i;

    if (!ipv4Pattern.test(value) && !ipv6Pattern.test(value)) {
      return helpers.error('ip.invalid', { value });
    }

    // For IPv4, check octets
    if (ipv4Pattern.test(value)) {
      const octets = value.split('.');
      for (const octet of octets) {
        const num = parseInt(octet, 10);
        if (num < 0 || num > 255) {
          return helpers.error('ip.invalid', { value });
        }
      }
    }

    return value;
  },

  // URL validation with protocol check
  secureUrl: (value, helpers) => {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return helpers.error('url.protocol', { value });
      }
      return value;
    } catch {
      return helpers.error('url.invalid', { value });
    }
  },
};

// Create custom Joi instance with our validators
export const joi = Joi.extend((joi) => ({
  type: 'safeCustom',
  base: joi.string(),
  messages: {
    'path.unsafe': '{{#label}} contains unsafe characters',
    'path.traversal': '{{#label}} contains directory traversal attempt',
    'port.invalid': '{{#label}} must be a valid port number (1-65535)',
    'ip.invalid': '{{#label}} must be a valid IP address',
    'url.invalid': '{{#label}} must be a valid URL',
    'url.protocol': '{{#label}} must use http or https protocol',
  },
  rules: {
    safePath: {
      method() {
        return this.$_addRule({ name: 'safePath' });
      },
      validate(value, helpers) {
        return customValidators.safePath(value, helpers);
      },
    },
    port: {
      method() {
        return this.$_addRule({ name: 'port' });
      },
      validate(value, helpers) {
        return customValidators.port(value, helpers);
      },
    },
    ipAddress: {
      method() {
        return this.$_addRule({ name: 'ipAddress' });
      },
      validate(value, helpers) {
        return customValidators.ipAddress(value, helpers);
      },
    },
    secureUrl: {
      method() {
        return this.$_addRule({ name: 'secureUrl' });
      },
      validate(value, helpers) {
        return customValidators.secureUrl(value, helpers);
      },
    },
  },
}));

// Sanitization helpers
export const sanitize = {
  // Remove HTML and script tags
  html: (value) => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  },

  // Escape SQL characters
  sql: (value) => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/'/g, "''")
      .replace(/"/g, '""')
      .replace(/\\/g, '\\\\')
      .replace(/\0/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x1a/g, '\\Z');
  },

  // Escape shell command characters
  shell: (value) => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/(["\s'$`\\])/g, '\\$1')
      .replace(/[;&|><*?~^()[\]{}$\n\r]/g, '');
  },

  // Sanitize file names
  filename: (value) => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^\.+/, '_')
      .substring(0, 255);
  },
};
