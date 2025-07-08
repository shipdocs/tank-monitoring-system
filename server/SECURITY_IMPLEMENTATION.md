# Tank Monitoring API Security Implementation

## Overview
Comprehensive input validation and security measures have been implemented for the Tank Monitoring server API to protect against common web vulnerabilities and attacks.

## Security Libraries Installed

1. **joi** (v17.13.3) - Schema validation library for request validation
2. **express-rate-limit** (v7.5.1) - Rate limiting middleware to prevent abuse

## Validation Schemas Created

### 1. Tank Configuration (`/api/tank-config`)
- **Validates:**
  - Percentage values (0-100)
  - Logical ordering (overfill > preAlarm > lowLevel)
  - Tank names (alphanumeric with limited special chars)
  - Capacity and level values
  - Unit types (L, gal, m³, ft³, bbl)
- **Prevents:** XSS, invalid data ranges, logical inconsistencies

### 2. Security Settings
- **Password Requirements:**
  - Minimum 8 characters
  - Must contain: uppercase, lowercase, number, special character
  - Cannot reuse old password
- **Username:** 3-50 chars, alphanumeric with dash/underscore
- **Session controls:** timeout, max attempts, lockout duration

### 3. Data Source Configuration (`/api/flexible/sources`)
- **Path Validation:**
  - Blocks directory traversal attempts (.., %2e%2e, etc.)
  - Prevents null byte injection
  - Validates against suspicious patterns
- **URL Validation:**
  - Only allows http/https protocols
  - Blocks file://, javascript:, data: URIs
- **Format validation:** csv, json, xml, txt, fixed-width, tsv

### 4. CSV File Configuration
- **File path:** Safe path validation
- **Delimiter:** Limited to common delimiters (,;|\t)
- **Encoding:** UTF-8, UTF-16LE, Latin1, ASCII
- **Column mapping:** Validates field names

### 5. App Branding (`/api/branding`)
- **Sanitizes:** HTML in app name and slogan
- **Validates:** Hex color codes (#RRGGBB)
- **URL validation:** Logo and favicon URLs

## Security Middleware Implemented

### 1. Input Validation Middleware
- **Location:** `/middleware/validation.js`
- **Features:**
  - Request body validation
  - Query parameter validation
  - Path parameter validation
  - Custom validators for paths, ports, IPs, URLs

### 2. Security Middleware
- **Location:** `/middleware/security.js`
- **Features:**
  - XSS Protection headers
  - SQL injection pattern detection
  - Command injection prevention
  - Request size limiting
  - File upload validation
  - IP filtering capabilities

### 3. Rate Limiting
- **General API:** 100 requests per 15 minutes
- **Authentication:** 5 requests per 15 minutes
- **File Operations:** 30 requests per 5 minutes
- **Configuration Changes:** 10 requests per 5 minutes

## Sanitization Functions

1. **HTML Sanitization:** Removes script tags and HTML
2. **SQL Sanitization:** Escapes SQL special characters
3. **Shell Command Sanitization:** Removes shell metacharacters
4. **Filename Sanitization:** Allows only safe filename characters

## Protection Against Common Attacks

### 1. SQL Injection
- Input validation with Joi schemas
- Pattern detection for SQL keywords
- Parameterized queries (where applicable)
- Username/password sanitization

### 2. Cross-Site Scripting (XSS)
- Content Security Policy headers
- HTML sanitization for user inputs
- X-XSS-Protection header
- Input validation restricting special characters

### 3. Directory Traversal
- Custom path validator blocking:
  - `..` sequences
  - URL encoded traversal (%2e%2e)
  - Double-encoded attempts
  - Null bytes
- Absolute path resolution and validation
- Hidden file/directory blocking

### 4. Command Injection
- Shell metacharacter filtering
- Command pattern detection
- Restricted input for executable fields

### 5. Cross-Site Request Forgery (CSRF)
- JWT token-based authentication
- Bearer token validation
- Stateless authentication

### 6. Denial of Service (DoS)
- Rate limiting on all endpoints
- Request size limits (10MB default)
- Connection timeout handling
- Resource cleanup on errors

## API Endpoint Security

### Protected Endpoints:
1. **POST /api/tank-config** - Tank configuration
2. **POST /api/branding** - App customization  
3. **POST /api/config** - Main configuration
4. **POST /api/flexible/sources** - Data source config
5. **GET /api/flexible/browse** - File browser
6. **POST /api/auth/users** - User creation
7. **DELETE /api/auth/users/:username** - User deletion
8. **POST /api/auth/change-password** - Password changes

### Authentication Flow:
1. Login with username/password
2. Receive JWT token
3. Include token in Authorization header
4. Token validated on each request

## Testing

A comprehensive test suite (`test-validation.js`) has been created to verify:
- SQL injection prevention
- XSS attack blocking
- Path traversal protection
- Command injection prevention
- Rate limiting functionality
- Password strength requirements
- Payload size limits

## Usage Examples

### Valid Request:
```javascript
POST /api/tank-config
Authorization: Bearer <token>
{
  "preAlarmPercentage": 86,
  "overfillPercentage": 97.5,
  "lowLevelPercentage": 10,
  "tanks": {
    "tank1": {
      "name": "Tank A",
      "maxCapacity": 1000,
      "unit": "L"
    }
  }
}
```

### Blocked Request (SQL Injection):
```javascript
POST /api/auth/login
{
  "username": "admin' OR '1'='1",
  "password": "password"
}
// Returns: 400 Bad Request
```

### Blocked Request (Path Traversal):
```javascript
GET /api/flexible/browse?path=../../../etc/passwd
// Returns: 403 Forbidden
```

## Best Practices Implemented

1. **Defense in Depth:** Multiple layers of validation
2. **Fail Secure:** Deny by default approach
3. **Least Privilege:** Role-based access control
4. **Input Validation:** Whitelist approach
5. **Output Encoding:** Sanitization of outputs
6. **Error Handling:** Generic error messages (no stack traces in production)
7. **Logging:** Security events are logged
8. **Rate Limiting:** Prevents brute force attacks

## Maintenance

- Regularly update validation schemas as API evolves
- Monitor rate limit effectiveness and adjust as needed
- Keep security libraries up to date
- Review logs for suspicious patterns
- Test new endpoints with the security test suite