import { joi, sanitize, validate, validateParams, validateQuery } from './validation.js';
import logger, { createModuleLogger, logError } from '../logger.js';

const validationLogger = createModuleLogger('validation-middleware');

// Request size limits
const REQUEST_SIZE_LIMITS = {
  json: 10 * 1024 * 1024, // 10MB for JSON payloads
  urlencoded: 1 * 1024 * 1024, // 1MB for URL encoded data
  text: 500 * 1024, // 500KB for text data
  raw: 50 * 1024 * 1024, // 50MB for raw data (file uploads)
};

// Create enhanced validation middleware that combines multiple checks
export function enhancedValidate(schema, options = {}) {
  const {
    sanitizeInput = true,
    validateSize = true,
    logAttempts = true,
    allowUnknown = false,
  } = options;

  return async (req, res, next) => {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    try {
      // 1. Request size validation
      if (validateSize && req.body) {
        const bodySize = JSON.stringify(req.body).length;
        if (bodySize > REQUEST_SIZE_LIMITS.json) {
          validationLogger.warn('Request size limit exceeded', {
            clientIp,
            bodySize,
            limit: REQUEST_SIZE_LIMITS.json,
            endpoint: req.path,
          });
          return res.status(413).json({
            error: 'Request entity too large',
            message: 'Request body exceeds maximum allowed size',
          });
        }
      }

      // 2. Schema validation with Joi
      const validationOptions = {
        abortEarly: false,
        stripUnknown: !allowUnknown,
        convert: true,
        allowUnknown,
      };

      const { error, value } = schema.validate(req.body, validationOptions);

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        if (logAttempts) {
          validationLogger.warn('Validation failed', {
            clientIp,
            endpoint: req.path,
            errors: errors.map(e => ({ field: e.field, message: e.message })),
            userAgent: req.get('User-Agent'),
          });
        }

        return res.status(400).json({
          error: 'Validation failed',
          errors: errors.map(e => ({ field: e.field, message: e.message })),
        });
      }

      // 3. Input sanitization
      if (sanitizeInput && value) {
        req.body = sanitizeObject(value);
      } else {
        req.body = value;
      }

      // 4. Log successful validation
      const duration = Date.now() - startTime;
      validationLogger.debug('Validation successful', {
        endpoint: req.path,
        duration: `${duration}ms`,
        fieldCount: Object.keys(req.body || {}).length,
      });

      next();
    } catch (validationError) {
      logError(validationError, {
        context: 'Enhanced validation middleware error',
        endpoint: req.path,
        clientIp,
      });

      return res.status(500).json({
        error: 'Internal validation error',
        message: 'An error occurred during request validation',
      });
    }
  };
}

// Enhanced query parameter validation
export function enhancedValidateQuery(schema, options = {}) {
  const { logAttempts = true, maxQueryParams = 50 } = options;

  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    try {
      // Check query parameter count
      const queryParamCount = Object.keys(req.query).length;
      if (queryParamCount > maxQueryParams) {
        validationLogger.warn('Too many query parameters', {
          clientIp,
          count: queryParamCount,
          limit: maxQueryParams,
          endpoint: req.path,
        });
        return res.status(400).json({
          error: 'Too many query parameters',
          message: `Maximum ${maxQueryParams} query parameters allowed`,
        });
      }

      // Validate with schema
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        if (logAttempts) {
          validationLogger.warn('Query validation failed', {
            clientIp,
            endpoint: req.path,
            errors,
          });
        }

        return res.status(400).json({
          error: 'Query validation failed',
          errors,
        });
      }

      req.query = sanitizeObject(value);
      next();
    } catch (validationError) {
      logError(validationError, {
        context: 'Enhanced query validation error',
        endpoint: req.path,
        clientIp,
      });

      return res.status(500).json({
        error: 'Internal validation error',
      });
    }
  };
}

// Enhanced parameter validation
export function enhancedValidateParams(schema, options = {}) {
  const { logAttempts = true } = options;

  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    try {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        if (logAttempts) {
          validationLogger.warn('Parameter validation failed', {
            clientIp,
            endpoint: req.path,
            errors,
          });
        }

        return res.status(400).json({
          error: 'Parameter validation failed',
          errors,
        });
      }

      req.params = sanitizeObject(value);
      next();
    } catch (validationError) {
      logError(validationError, {
        context: 'Enhanced parameter validation error',
        endpoint: req.path,
        clientIp,
      });

      return res.status(500).json({
        error: 'Internal validation error',
      });
    }
  };
}

// Comprehensive input sanitization
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitize.html(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize both key and value
      const cleanKey = typeof key === 'string' ? sanitize.html(key) : key;
      sanitized[cleanKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// Content type validation middleware
export function validateContentType(allowedTypes = ['application/json']) {
  return (req, res, next) => {
    const contentType = req.get('Content-Type') || '';
    const baseType = contentType.split(';')[0].trim();

    if (req.method !== 'GET' && req.method !== 'DELETE' && !allowedTypes.includes(baseType)) {
      validationLogger.warn('Invalid content type', {
        contentType: baseType,
        allowed: allowedTypes,
        endpoint: req.path,
        method: req.method,
      });

      return res.status(415).json({
        error: 'Unsupported Media Type',
        message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
      });
    }

    next();
  };
}

// Request method validation
export function validateMethod(allowedMethods = ['GET', 'POST', 'PUT', 'DELETE']) {
  return (req, res, next) => {
    if (!allowedMethods.includes(req.method)) {
      validationLogger.warn('Method not allowed', {
        method: req.method,
        allowed: allowedMethods,
        endpoint: req.path,
      });

      return res.status(405).json({
        error: 'Method Not Allowed',
        message: `Method ${req.method} is not allowed for this endpoint`,
      });
    }

    next();
  };
}

// Anti-automation detection
export function detectAutomation() {
  const suspiciousUserAgents = [
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /go-http-client/i,
    /node/i,
    /axios/i,
    /httpie/i,
  ];

  return (req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    const isSuspicious = suspiciousUserAgents.some(pattern => pattern.test(userAgent));

    if (isSuspicious) {
      validationLogger.warn('Suspicious user agent detected', {
        userAgent,
        endpoint: req.path,
        clientIp: req.ip || req.connection.remoteAddress,
      });
    }

    // Don't block, just log for now
    next();
  };
}

// Security headers middleware
export function securityHeaders() {
  return (req, res, next) => {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Comprehensive Content Security Policy
    const cspPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Allow inline scripts for React development
      "style-src 'self' 'unsafe-inline'", // Allow inline styles for React components
      "img-src 'self' data: blob:", // Allow data URLs for images
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:", // Allow WebSocket connections
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'block-all-mixed-content',
      'upgrade-insecure-requests',
    ].join('; ');

    res.setHeader('Content-Security-Policy', cspPolicy);

    // HSTS (HTTP Strict Transport Security)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // Remove server identification
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    next();
  };
}

// Validation error handler
export function validationErrorHandler() {
  return (err, req, res, next) => {
    if (err.name === 'ValidationError') {
      validationLogger.error('Validation error caught by error handler', {
        error: err.message,
        endpoint: req.path,
        clientIp: req.ip || req.connection.remoteAddress,
      });

      return res.status(400).json({
        error: 'Validation Error',
        message: err.message,
      });
    }

    if (err.type === 'entity.too.large') {
      validationLogger.warn('Request entity too large', {
        endpoint: req.path,
        clientIp: req.ip || req.connection.remoteAddress,
      });

      return res.status(413).json({
        error: 'Request entity too large',
        message: 'Request body exceeds maximum allowed size',
      });
    }

    next(err);
  };
}

export { REQUEST_SIZE_LIMITS };
