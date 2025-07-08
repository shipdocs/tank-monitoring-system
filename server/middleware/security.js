import rateLimit from 'express-rate-limit';
import { sanitize } from './validation.js';

// Rate limiting configurations
export const rateLimiters = {
  // General API rate limit
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Strict rate limit for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  }),

  // Rate limit for file operations
  fileOps: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // Limit each IP to 30 file operations per windowMs
    message: 'Too many file operations, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Rate limit for configuration changes
  config: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Limit each IP to 10 config changes per windowMs
    message: 'Too many configuration changes, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

// Request size limiter middleware
export const requestSizeLimiter = (maxSize = '10mb') => (req, res, next) => {
  const contentLength = req.headers['content-length'];
  const maxBytes = parseSize(maxSize);

  if (contentLength && parseInt(contentLength) > maxBytes) {
    return res.status(413).json({
      error: 'Request payload too large',
      message: `Request size exceeds maximum allowed size of ${maxSize}`,
    });
  }

  next();
};

// Helper to parse size strings (e.g., '10mb', '1kb')
function parseSize(size) {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }

  return parseInt(match[1]) * units[match[2]];
}

// XSS Protection middleware
export const xssProtection = (req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Sanitize common injection points in request
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  next();
};

// Recursive object sanitization
function sanitizeObject(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        // Don't sanitize password fields
        if (!key.toLowerCase().includes('password')) {
          obj[key] = sanitize.html(obj[key]);
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
}

// SQL Injection prevention middleware
export const sqlInjectionProtection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|script)\b)/gi,
    /(--|\||;|\/\*|\*\/|xp_|sp_)/gi,
    /(<script|<\/script|javascript:|onerror=|onload=)/gi,
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
    }
    return false;
  };

  const checkObject = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (checkValue(obj[key])) {
          return true;
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (checkObject(obj[key])) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Check body, query, and params
  if ((req.body && checkObject(req.body)) ||
      (req.query && checkObject(req.query)) ||
      (req.params && checkObject(req.params))) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Request contains potentially malicious content',
    });
  }

  next();
};

// Command injection prevention
export const commandInjectionProtection = (req, res, next) => {
  const cmdPatterns = [
    /[;&|`$(){}[\]<>]/g,
    /\b(eval|exec|system|passthru|shell_exec)\b/gi,
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      // Allow certain safe characters in specific fields
      const isFilePath = value.includes('/') || value.includes('\\');
      if (!isFilePath) {
        for (const pattern of cmdPatterns) {
          if (pattern.test(value)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Only check values that might be used in commands
  const suspiciousFields = ['command', 'cmd', 'exec', 'run', 'shell'];

  for (const field of suspiciousFields) {
    if (req.body?.[field] && checkValue(req.body[field])) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Command contains potentially dangerous characters',
      });
    }
  }

  next();
};

// CORS validation middleware
export const corsValidation = (allowedOrigins = []) => (req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Origin not allowed',
    });
  }

  next();
};

// File upload validation
export const fileUploadValidation = (options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['text/csv', 'application/json', 'text/plain', 'text/xml'],
    allowedExtensions = ['.csv', '.json', '.txt', '.xml', '.tsv'],
  } = options;

  return (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return next();
    }

    for (const file of Object.values(req.files)) {
      // Check file size
      if (file.size > maxSize) {
        return res.status(413).json({
          error: 'File too large',
          message: `File size exceeds maximum allowed size of ${maxSize} bytes`,
        });
      }

      // Check MIME type
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(415).json({
          error: 'Invalid file type',
          message: `File type ${file.mimetype} is not allowed`,
        });
      }

      // Check file extension
      const ext = `.${file.name.split('.').pop().toLowerCase()}`;
      if (!allowedExtensions.includes(ext)) {
        return res.status(415).json({
          error: 'Invalid file extension',
          message: `File extension ${ext} is not allowed`,
        });
      }

      // Sanitize filename
      file.name = sanitize.filename(file.name);
    }

    next();
  };
};

// IP whitelist/blacklist middleware
export const ipFilter = (options = {}) => {
  const { whitelist = [], blacklist = [] } = options;

  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;

    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(clientIp)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is blocked',
      });
    }

    // Check whitelist if configured
    if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not authorized',
      });
    }

    next();
  };
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip}`);

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`);
  });

  next();
};

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
};
