# Tank Monitoring System API Documentation

## Overview

The Tank Monitoring System provides a RESTful API for managing tank data, configuration, and real-time monitoring. The API runs on port 3001 by default, with WebSocket connections on port 3002.

## Authentication

The API uses JWT (JSON Web Token) based authentication. Most endpoints require a valid JWT token in the Authorization header.

### Authentication Header Format
```
Authorization: Bearer <jwt_token>
```

## Base URL

```
http://localhost:3001/api
```

## WebSocket URL

```
ws://localhost:3002
```

## API Endpoints

### Authentication Endpoints

#### 1. Login
Authenticate a user and receive a JWT token.

**Endpoint:** `POST /api/auth/login`

**Authentication:** Not required

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "admin"
  },
  "expiresIn": "24h"
}
```

**Error Response:**
```json
{
  "error": "Authentication failed",
  "message": "Invalid username or password"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'
```

#### 2. Verify Token
Verify if a JWT token is valid.

**Endpoint:** `GET /api/auth/verify`

**Authentication:** Required

**Response:**
```json
{
  "valid": true,
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

**Error Response:**
```json
{
  "valid": false,
  "message": "jwt expired"
}
```

**Example:**
```bash
curl -X GET http://localhost:3001/api/auth/verify \
  -H "Authorization: Bearer <your_token>"
```

#### 3. Get Authentication Status
Check current authentication status.

**Endpoint:** `GET /api/auth/status`

**Authentication:** Optional

**Response (Authenticated):**
```json
{
  "authenticated": true,
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

**Response (Not Authenticated):**
```json
{
  "authenticated": false,
  "user": null
}
```

#### 4. Change Password
Change the password for the current user.

**Endpoint:** `POST /api/auth/change-password`

**Authentication:** Required

**Request Body:**
```json
{
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Response:**
```json
{
  "error": "Password change failed",
  "message": "Invalid old password"
}
```

#### 5. Logout
Logout the current user (client-side token removal).

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Optional

**Response:**
```json
{
  "success": true,
  "message": "Logout successful. Please remove token from client storage."
}
```

### User Management Endpoints (Admin Only)

#### 6. Create User
Create a new user account.

**Endpoint:** `POST /api/auth/users`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "role": "admin" | "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "username": "newuser",
    "role": "user"
  }
}
```

#### 7. List Users
Get a list of all users.

**Endpoint:** `GET /api/auth/users`

**Authentication:** Required (Admin only)

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "username": "admin",
      "role": "admin"
    },
    {
      "username": "user1",
      "role": "user"
    }
  ]
}
```

#### 8. Delete User
Delete a user account.

**Endpoint:** `DELETE /api/auth/users/:username`

**Authentication:** Required (Admin only)

**URL Parameters:**
- `username`: The username to delete

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### Tank Data Endpoints

#### 9. Get Tank Data
Retrieve current tank data.

**Endpoint:** `GET /api/tanks`

**Authentication:** Required

**Response:**
```json
[
  {
    "id": 1,
    "name": "Tank A",
    "currentLevel": 2500,
    "maxCapacity": 4545,
    "minLevel": 50,
    "maxLevel": 4545,
    "unit": "mm",
    "status": "normal",
    "lastUpdated": "2025-01-08T10:30:00.000Z",
    "location": "Zone 1-1",
    "group": "BB",
    "temperature": 20
  },
  // ... more tanks
]
```

**Error Response (503):**
```json
{
  "error": "No tank data available",
  "message": "Data source not connected or no data received yet"
}
```

### Configuration Endpoints

#### 10. Get System Configuration
Retrieve current system configuration.

**Endpoint:** `GET /api/config`

**Authentication:** Required

**Response:**
```json
{
  "selectedPort": "",
  "baudRate": 9600,
  "dataBits": 8,
  "stopBits": 1,
  "parity": "none",
  "autoConnect": false,
  "tankCount": 12,
  "dataFormat": "csvfile",
  "csvFile": {
    "enabled": true,
    "filePath": "/path/to/tank_data.csv",
    "importInterval": 30000,
    "hasHeaders": true,
    "delimiter": ",",
    "encoding": "utf8",
    "columnMapping": {
      "id": "tank_id",
      "name": "tank_name",
      "level": "level",
      "maxCapacity": "max_capacity",
      "minLevel": "min_level",
      "maxLevel": "max_level",
      "unit": "unit",
      "location": "location"
    },
    "isVerticalFormat": false,
    "linesPerRecord": 4,
    "lineMapping": {},
    "maxRecords": 12
  },
  "dataSources": []
}
```

#### 11. Update System Configuration
Update system configuration settings.

**Endpoint:** `POST /api/config`

**Authentication:** Required

**Request Body:**
```json
{
  "selectedPort": "COM3",
  "baudRate": 9600,
  "dataFormat": "csv",
  "csvFile": {
    "enabled": true,
    "filePath": "/path/to/data.csv"
  }
}
```

**Response:**
```json
{
  "success": true,
  "config": { /* updated configuration */ }
}
```

### Tank Configuration Endpoints

#### 12. Get Tank Configuration
Retrieve tank-specific configuration settings.

**Endpoint:** `GET /api/tank-config`

**Authentication:** Required

**Response:**
```json
{
  "preAlarmPercentage": 86,
  "overfillPercentage": 97.5,
  "lowLevelPercentage": 10,
  "tanks": {
    "tank_1": {
      "maxHeight": 4545,
      "allowedHeight": 4545
    },
    // ... more tank configurations
  }
}
```

#### 13. Update Tank Configuration
Update tank-specific configuration settings.

**Endpoint:** `POST /api/tank-config`

**Authentication:** Required

**Request Body:**
```json
{
  "preAlarmPercentage": 85,
  "overfillPercentage": 95,
  "lowLevelPercentage": 15,
  "tanks": {
    "tank_1": {
      "maxHeight": 5000,
      "allowedHeight": 4800
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tank configuration saved"
}
```

### Branding Endpoints

#### 14. Get App Branding
Retrieve application branding settings.

**Endpoint:** `GET /api/branding`

**Authentication:** Required

**Response:**
```json
{
  "appName": "Tank Monitoring System",
  "appSlogan": "Real-time tank level monitoring dashboard",
  "primaryColor": "#2563eb"
}
```

#### 15. Update App Branding
Update application branding settings.

**Endpoint:** `POST /api/branding`

**Authentication:** Required

**Request Body:**
```json
{
  "appName": "Custom Tank Monitor",
  "appSlogan": "Your tanks, your way",
  "primaryColor": "#ff6600"
}
```

**Response:**
```json
{
  "success": true,
  "message": "App branding saved"
}
```

### Connection Management Endpoints

#### 16. Connect to Data Source
Establish connection to configured data source.

**Endpoint:** `POST /api/connect`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "connected": true
}
```

**Error Response:**
```json
{
  "success": false,
  "connected": false,
  "message": "No data source configured"
}
```

#### 17. Disconnect from Data Source
Disconnect from current data source.

**Endpoint:** `POST /api/disconnect`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "connected": false
}
```

#### 18. Get Connection Status
Get current connection status.

**Endpoint:** `GET /api/status`

**Authentication:** Required

**Response:**
```json
{
  "connected": true,
  "selectedPort": "COM3",
  "csvFileEnabled": true,
  "csvFilePath": "/path/to/data.csv",
  "dataSource": "csvfile",
  "lastSync": "2025-01-08T10:30:00.000Z"
}
```

### Serial Port Endpoints

#### 19. Discover Serial Ports
List available serial ports on the system.

**Endpoint:** `GET /api/ports`

**Authentication:** Required

**Response:**
```json
[
  {
    "path": "COM3",
    "manufacturer": "Arduino LLC",
    "serialNumber": "12345",
    "vendorId": "2341",
    "productId": "0043",
    "friendlyName": "Arduino Uno (COM3)"
  }
]
```

### CSV File Endpoints

#### 20. Discover CSV Columns
Analyze a CSV file and discover its columns.

**Endpoint:** `GET /api/csv/columns`

**Authentication:** Required

**Response:**
```json
{
  "columns": ["tank_id", "tank_name", "level", "capacity"],
  "discovered": ["tank_id", "tank_name", "level", "capacity"]
}
```

#### 21. Test CSV Import
Test importing data from a CSV file.

**Endpoint:** `POST /api/csv/test-import`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "preview": [
    {
      "id": 1,
      "name": "Tank A",
      "currentLevel": 2500,
      "maxCapacity": 4545
    }
  ],
  "totalRows": 100,
  "columns": ["tank_id", "tank_name", "level", "capacity"]
}
```

#### 22. Validate CSV File
Validate if a CSV file exists and is readable.

**Endpoint:** `POST /api/csv/validate-file`

**Authentication:** Required

**Request Body:**
```json
{
  "filePath": "/path/to/file.csv"
}
```

**Response:**
```json
{
  "valid": true,
  "exists": true,
  "columns": ["tank_id", "tank_name", "level"],
  "message": "File is accessible and readable"
}
```

### Flexible File System Endpoints

#### 23. Browse File System
Browse directories and files (restricted to project directory).

**Endpoint:** `GET /api/flexible/browse`

**Authentication:** Required

**Query Parameters:**
- `path` (optional): Directory path to browse (defaults to current working directory)

**Response:**
```json
{
  "path": "/home/user/tankmon",
  "directories": ["sample-data", "server", "src"],
  "files": ["package.json", "README.md"]
}
```

#### 24. Get Data Sources
List configured flexible data sources.

**Endpoint:** `GET /api/flexible/sources`

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "source1",
    "type": "file",
    "enabled": true,
    "path": "/path/to/data.csv",
    "format": "csv",
    "lastUpdate": "2025-01-08T10:30:00.000Z"
  }
]
```

#### 25. Add Data Source
Add a new flexible data source.

**Endpoint:** `POST /api/flexible/sources`

**Authentication:** Required

**Request Body:**
```json
{
  "id": "newsource",
  "type": "file",
  "enabled": true,
  "path": "/path/to/data.json",
  "format": "json",
  "mapping": {
    "id": "tank_id",
    "name": "tank_name",
    "level": "current_level"
  }
}
```

**Response:**
```json
{
  "success": true,
  "source": { /* created source object */ }
}
```

#### 26. Delete Data Source
Remove a flexible data source.

**Endpoint:** `DELETE /api/flexible/sources/:id`

**Authentication:** Required

**URL Parameters:**
- `id`: Source ID to delete

**Response:**
```json
{
  "success": true
}
```

#### 27. Validate Flexible File
Validate and analyze a file for flexible import.

**Endpoint:** `GET /api/flexible/validate`

**Authentication:** Required

**Query Parameters:**
- `path`: File path to validate
- `format` (optional): Force specific format (auto-detect if not provided)

**Response:**
```json
{
  "success": true,
  "format": "csv",
  "columns": ["id", "name", "level"],
  "sampleData": [ /* first 5 rows */ ],
  "suggestedMapping": {
    "id": "id",
    "name": "name",
    "level": "level"
  },
  "totalRows": 100
}
```

#### 28. Get Tank Field Definitions
Get available tank field definitions for mapping.

**Endpoint:** `GET /api/flexible/fields`

**Authentication:** Required

**Response:**
```json
{
  "id": {
    "name": "Tank ID",
    "type": "string",
    "required": true
  },
  "name": {
    "name": "Tank Name",
    "type": "string",
    "required": true
  },
  "level": {
    "name": "Current Level",
    "type": "number",
    "required": true
  },
  // ... more fields
}
```

#### 29. Test Field Mapping
Test field mapping configuration with sample data.

**Endpoint:** `POST /api/flexible/test-mapping`

**Authentication:** Required

**Request Body:**
```json
{
  "path": "/path/to/file.csv",
  "format": "csv",
  "mapping": {
    "id": "tank_id",
    "name": "tank_name",
    "level": "current_level"
  }
}
```

**Response:**
```json
{
  "success": true,
  "sampleTanks": [ /* up to 10 mapped tank objects */ ],
  "totalRows": 100
}
```

### Integrated Server Endpoints (Electron App)

The Electron app includes additional endpoints:

#### 30. Security Configuration
Get security settings (password protection status).

**Endpoint:** `GET /api/security`

**Authentication:** Not required

**Response:**
```json
{
  "passwordProtected": true
}
```

#### 31. Update Security Settings
Update security settings.

**Endpoint:** `POST /api/security`

**Authentication:** Not required

**Request Body:**
```json
{
  "passwordProtected": true,
  "password": "newpassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Security settings saved"
}
```

#### 32. Verify Password
Verify access password.

**Endpoint:** `POST /api/security/verify`

**Authentication:** Not required

**Request Body:**
```json
{
  "password": "userpassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Access granted"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid password"
}
```

#### 33. Get Debug Logs
Retrieve debug logs (Electron integrated server only).

**Endpoint:** `GET /api/debug-logs`

**Authentication:** Not required

**Response:**
```json
[
  {
    "timestamp": "2025-01-08T10:30:00.000Z",
    "level": "INFO",
    "category": "SERVER",
    "message": "Server started"
  }
]
```

#### 34. Test CSV File
Test parsing a CSV file (Electron integrated server only).

**Endpoint:** `POST /api/test-csv`

**Authentication:** Not required

**Request Body:**
```json
{
  "filePath": "/path/to/test.csv"
}
```

**Response:**
```json
{
  "data": [ /* parsed data */ ],
  "format": "csv",
  "columns": ["id", "name", "level"]
}
```

## WebSocket API

The WebSocket server provides real-time tank data updates.

### Connection

Connect to the WebSocket server with authentication:

```javascript
const ws = new WebSocket('ws://localhost:3002?token=<jwt_token>');
```

### Message Types

#### Tank Data Update
Received when tank data changes:

```json
{
  "type": "tankData",
  "data": {
    "tanks": [ /* array of tank objects */ ],
    "lastSync": "2025-01-08T10:30:00.000Z",
    "connectionStatus": "connected"
  }
}
```

#### Status Update
Received when connection status changes:

```json
{
  "type": "status",
  "data": {
    "connectionStatus": "connected" | "disconnected" | "error",
    "lastSync": "2025-01-08T10:30:00.000Z"
  }
}
```

#### Error Message
Received when an error occurs:

```json
{
  "type": "error",
  "source": "file-monitor",
  "error": "File not found",
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

### WebSocket Client Example

```javascript
const token = localStorage.getItem('authToken');
const ws = new WebSocket(`ws://localhost:3002?token=${token}`);

ws.onopen = () => {
  console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'tankData':
      console.log('Tank data:', message.data.tanks);
      break;
    case 'status':
      console.log('Status:', message.data.connectionStatus);
      break;
    case 'error':
      console.error('Error:', message.error);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = (event) => {
  console.log('WebSocket closed:', event.code, event.reason);
};
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- Authentication endpoints: 5 requests per minute
- API endpoints: 100 requests per minute
- File system endpoints: 10 requests per minute
- Configuration endpoints: 20 requests per minute

Rate limit exceeded response:
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

## Data Types

### Tank Object
```typescript
interface Tank {
  id: number | string;
  name: string;
  currentLevel: number;
  maxCapacity: number;
  minLevel: number;
  maxLevel: number;
  unit: string;
  status: 'normal' | 'low' | 'high' | 'critical';
  lastUpdated: string;
  location: string;
  group?: 'BB' | 'SB' | 'CENTER';
  temperature?: number;
}
```

### User Object
```typescript
interface User {
  username: string;
  role: 'admin' | 'user';
}
```

### Configuration Object
```typescript
interface Configuration {
  selectedPort: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: string;
  autoConnect: boolean;
  tankCount: number;
  dataFormat: string;
  csvFile: CsvFileConfig;
  dataSources: DataSource[];
}
```

## Security Considerations

1. **Authentication**: All sensitive endpoints require JWT authentication
2. **HTTPS**: In production, use HTTPS for all API calls
3. **CORS**: Configure CORS appropriately for your deployment
4. **Input Validation**: All inputs are validated and sanitized
5. **Path Traversal Protection**: File system access is restricted to project directory
6. **Rate Limiting**: Prevents abuse and DoS attacks
7. **Password Hashing**: Passwords are hashed using bcrypt with salt rounds

## Examples

### Complete Authentication Flow

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'admin'
  })
});

const { token } = await loginResponse.json();

// 2. Store token
localStorage.setItem('authToken', token);

// 3. Use token for authenticated requests
const tanksResponse = await fetch('http://localhost:3001/api/tanks', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const tanks = await tanksResponse.json();
```

### Configure and Connect to CSV File

```javascript
const token = localStorage.getItem('authToken');

// 1. Update configuration
await fetch('http://localhost:3001/api/config', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    dataFormat: 'csvfile',
    csvFile: {
      enabled: true,
      filePath: '/path/to/tanks.csv',
      hasHeaders: true,
      delimiter: ',',
      importInterval: 30000
    }
  })
});

// 2. Connect to data source
await fetch('http://localhost:3001/api/connect', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 3. Monitor via WebSocket
const ws = new WebSocket(`ws://localhost:3002?token=${token}`);
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'tankData') {
    console.log('Received tank update:', message.data.tanks);
  }
};
```

### Update Tank Configuration

```javascript
const token = localStorage.getItem('authToken');

await fetch('http://localhost:3001/api/tank-config', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    preAlarmPercentage: 85,
    overfillPercentage: 95,
    lowLevelPercentage: 15,
    tanks: {
      tank_1: {
        maxHeight: 5000,
        allowedHeight: 4800
      }
    }
  })
});
```

## Version History

- **v2.0.0** - Current version with JWT authentication, flexible file system, and WebSocket support
- **v1.0.0** - Initial release with basic serial port and CSV file support