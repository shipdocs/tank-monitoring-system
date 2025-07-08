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

// Custom validation functions
export const customValidations = {
  // Path validation to prevent directory traversal
  safePath: (value, helpers) => {
    // Check for null bytes
    if (value.includes('\0')) {
      return helpers.error('string.unsafe', { value });
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
        return helpers.error('string.traversal', { value });
      }
    }

    return value;
  },

  // URL validation with protocol check
  secureUrl: (value, helpers) => {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return helpers.error('string.uri', { value });
      }
      return value;
    } catch {
      return helpers.error('string.uri', { value });
    }
  },
};

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

// Export regular Joi for use in schemas
export const joi = Joi;
