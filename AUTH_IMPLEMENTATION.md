# Tank Monitoring System - Authentication Implementation

## Overview

A production-ready JWT-based authentication system has been implemented for the tank monitoring backend. This system provides secure access control for all API endpoints and WebSocket connections.

## Features

- JWT token-based authentication
- Secure password hashing with bcrypt
- Role-based access control (admin/user)
- WebSocket authentication
- Token expiration (24 hours)
- Secure token storage
- User management endpoints

## Default Credentials

**Username:** admin  
**Password:** admin

⚠️ **IMPORTANT:** Change the default password immediately after first login!

## Implementation Details

### Files Created

1. **`server/middleware/auth.js`**
   - Authentication middleware
   - Token generation and verification
   - User management functions
   - Password hashing and validation

2. **`server/routes/auth.js`**
   - Login endpoint (`POST /api/auth/login`)
   - Token verification (`GET /api/auth/verify`)
   - User management endpoints
   - Password change endpoint

3. **`server/login.html`**
   - Login page UI
   - Client-side authentication logic

4. **`src/utils/auth.ts`**
   - Frontend authentication service
   - Token management
   - API request helpers

### Configuration

The system stores configuration in `server/auth-config.json`:
```json
{
  "users": {
    "admin": {
      "username": "admin",
      "password": "$2b$10$...", // bcrypt hashed
      "role": "admin",
      "createdAt": "2025-01-08T..."
    }
  },
  "jwtSecret": "tankmon-jwt-secret-change-in-production",
  "lastUpdated": "2025-01-08T..."
}
```

### Security Features

1. **Password Security**
   - Passwords hashed with bcrypt (10 salt rounds)
   - Minimum password length: 6 characters
   - Old password verification for changes

2. **Token Security**
   - HS256 algorithm
   - 24-hour expiration
   - Token required for all API endpoints (except auth)

3. **WebSocket Security**
   - Token verification on connection
   - Automatic disconnection for invalid tokens

## API Endpoints

### Public Endpoints (No Authentication Required)
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Token verification
- `GET /api/auth/status` - Authentication status
- `GET /login` - Login page

### Protected Endpoints (Authentication Required)
- All other API endpoints require a valid JWT token in the Authorization header:
  ```
  Authorization: Bearer <token>
  ```

### User Management (Admin Only)
- `POST /api/auth/users` - Create new user
- `GET /api/auth/users` - List all users
- `DELETE /api/auth/users/:username` - Delete user
- `POST /api/auth/change-password` - Change password

## Client-Side Integration

### Login
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const { token, user } = await response.json();
localStorage.setItem('tankmon_token', token);
```

### API Requests
```javascript
const response = await fetch('/api/tanks', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### WebSocket Connection
```javascript
const ws = new WebSocket(`ws://localhost:3002?token=${token}`);
```

## Production Deployment

### 1. Change JWT Secret
Set a secure JWT secret via environment variable:
```bash
export JWT_SECRET="your-very-secure-random-string-here"
```

### 2. Change Default Password
```javascript
// Login as admin, then:
POST /api/auth/change-password
{
  "oldPassword": "admin",
  "newPassword": "your-secure-password"
}
```

### 3. Create Additional Users
```javascript
POST /api/auth/users
{
  "username": "operator1",
  "password": "secure-password",
  "role": "user"
}
```

### 4. Secure the Configuration File
```bash
chmod 600 server/auth-config.json
```

## Testing

1. Start the server:
   ```bash
   npm run start:server
   ```

2. Visit http://localhost:3001/login

3. Login with default credentials

4. Access protected endpoints with token

## Error Handling

The system provides clear error messages:
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `400 Bad Request` - Invalid request data

## Notes

- Tokens are stateless (no server-side session storage)
- User data is stored in `auth-config.json` (use a database in production)
- All passwords are bcrypt hashed
- WebSocket connections require token authentication
- Frontend automatically redirects to login when not authenticated