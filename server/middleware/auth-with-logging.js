import { createRequire } from 'module';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createModuleLogger, auditLog, logError } from '../logger.js';

const require = createRequire(import.meta.url);

// Create module logger
const logger = createModuleLogger('auth');

// Load dependencies with fallback paths
function findModule(moduleName) {
  const possiblePaths = [
    path.join(__dirname, 'node_modules', moduleName),
    path.join(__dirname, '..', 'node_modules', moduleName),
    path.join(__dirname, '..', '..', 'node_modules', moduleName),
    path.join(process.resourcesPath || '', '..', 'node_modules', moduleName),
  ];

  for (const modulePath of possiblePaths) {
    try {
      require.resolve(modulePath);
      return require(modulePath);
    } catch (_e) {
      // Continue searching
    }
  }

  try {
    return require(moduleName);
  } catch (_e) {
    logger.error(`Failed to find module ${moduleName}`);
    throw _e;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jwt = findModule('jsonwebtoken');
const bcrypt = findModule('bcrypt');

// Configuration
const AUTH_CONFIG_FILE = path.join(__dirname, '..', 'auth-config.json');
const DEFAULT_JWT_SECRET = process.env.JWT_SECRET || 'tankmon-jwt-secret-change-in-production';
const JWT_EXPIRY = '24h';
const SALT_ROUNDS = 10;

// In-memory user store (in production, use a database)
let users = {};
let jwtSecret = DEFAULT_JWT_SECRET;

// Initialize auth configuration
async function initAuthConfig() {
  try {
    const configData = await fs.readFile(AUTH_CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);
    users = config.users || {};
    jwtSecret = config.jwtSecret || DEFAULT_JWT_SECRET;
    logger.info('Auth configuration loaded', { userCount: Object.keys(users).length });
  } catch (error) {
    logger.info('No auth config found, creating default');
    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin', SALT_ROUNDS);
    users = {
      admin: {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
    };
    await saveAuthConfig();
    auditLog('DEFAULT_ADMIN_CREATED', 'system', { username: 'admin' });
  }
}

// Save auth configuration
async function saveAuthConfig() {
  try {
    const config = {
      users,
      jwtSecret,
      lastUpdated: new Date().toISOString()
    };
    await fs.writeFile(AUTH_CONFIG_FILE, JSON.stringify(config, null, 2));
    logger.debug('Auth configuration saved');
  } catch (error) {
    logError(error, { context: 'Error saving auth config' });
  }
}

// Generate JWT token
function generateToken(user) {
  const payload = {
    username: user.username,
    role: user.role,
    iat: Date.now(),
  };

  return jwt.sign(payload, jwtSecret, {
    expiresIn: JWT_EXPIRY,
    algorithm: 'HS256',
  });
}

// Verify JWT token
export function verifyToken(token) {
  // Handle default Electron token
  if (token === 'electron-default-token') {
    return {
      username: 'electron-user',
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
  }

  try {
    return jwt.verify(token, jwtSecret, {
      algorithms: ['HS256']
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Authentication middleware
export function authenticate(req, res, next) {
  // Skip authentication for certain routes
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/verify',
    '/api/auth/status',
    '/login',
    '/login.html'
  ];

  // Skip auth for static assets and public routes
  const skipAuth = publicRoutes.some(route => req.path === route) ||
                   req.path.startsWith('/assets/') ||
                   req.path.endsWith('.css') ||
                   req.path.endsWith('.js') ||
                   req.path.endsWith('.png') ||
                   req.path.endsWith('.jpg') ||
                   req.path.endsWith('.ico');

  if (skipAuth) {
    return next();
  }

  // Extract token from header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    logger.debug('Authentication failed - no token', {
      path: req.path,
      method: req.method,
    });
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No token provided',
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Authentication failed - invalid token', {
      path: req.path,
      method: req.method,
      error: _error.message,
    });
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: error.message
    });
  }
}

// Login function
export async function login(username, password) {
  const user = users[username];
  
  if (!user) {
    logger.warn('Login attempt with invalid username', { username });
    auditLog('LOGIN_FAILED', username, { reason: 'User not found' });
    throw new Error('Invalid credentials');
  }

  const validPassword = await bcrypt.compare(password, user.password);
  
  if (!validPassword) {
    logger.warn('Login attempt with invalid password', { username });
    auditLog('LOGIN_FAILED', username, { reason: 'Invalid password' });
    throw new Error('Invalid credentials');
  }

  const token = generateToken(user);
  
  logger.info('User logged in successfully', { username, role: user.role });
  auditLog('LOGIN_SUCCESS', username, { role: user.role });
  
  return {
    token,
    user: {
      username: user.username,
      role: user.role
    }
  };
}

// Change password function
export async function changePassword(username, oldPassword, newPassword) {
  const user = users[username];
  
  if (!user) {
    logger.error('Password change attempt for non-existent user', { username });
    throw new Error('User not found');
  }

  const validPassword = await bcrypt.compare(oldPassword, user.password);
  
  if (!validPassword) {
    logger.warn('Password change failed - invalid old password', { username });
    auditLog('PASSWORD_CHANGE_FAILED', username, { reason: 'Invalid old password' });
    throw new Error('Invalid old password');
  }

  // Validate new password
  if (newPassword.length < 6) {
    logger.warn('Password change failed - password too short', { username });
    throw new Error('Password must be at least 6 characters long');
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  users[username].password = hashedPassword;
  users[username].passwordChangedAt = new Date().toISOString();
  
  await saveAuthConfig();
  
  logger.info('Password changed successfully', { username });
  auditLog('PASSWORD_CHANGED', username, {});
  
  return { success: true, message: 'Password changed successfully' };
}

// Create new user function (admin only)
export async function createUser(adminUsername, newUsername, newPassword, role = 'user') {
  const admin = users[adminUsername];
  
  if (!admin || admin.role !== 'admin') {
    logger.warn('Unauthorized user creation attempt', { 
      requestedBy: adminUsername,
      isAdmin: admin?.role === 'admin' 
    });
    auditLog('USER_CREATE_FAILED', adminUsername, { 
      reason: 'Unauthorized',
      targetUser: newUsername 
    });
    throw new Error('Unauthorized: Admin access required');
  }

  if (users[newUsername]) {
    logger.warn('User creation failed - user already exists', { 
      adminUsername, 
      newUsername 
    });
    throw new Error('User already exists');
  }

  if (newPassword.length < 6) {
    logger.warn('User creation failed - password too short', { 
      adminUsername, 
      newUsername 
    });
    throw new Error('Password must be at least 6 characters long');
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  
  users[newUsername] = {
    username: newUsername,
    password: hashedPassword,
    role,
    createdAt: new Date().toISOString(),
    createdBy: adminUsername
  };

  await saveAuthConfig();
  
  logger.info('User created successfully', { 
    adminUsername, 
    newUsername, 
    role 
  });
  auditLog('USER_CREATED', adminUsername, { 
    newUser: newUsername, 
    role 
  });
  
  return {
    success: true,
    user: {
      username: newUsername,
      role
    }
  };
}

// Delete user function (admin only)
export async function deleteUser(adminUsername, targetUsername) {
  const admin = users[adminUsername];
  
  if (!admin || admin.role !== 'admin') {
    logger.warn('Unauthorized user deletion attempt', { 
      requestedBy: adminUsername 
    });
    auditLog('USER_DELETE_FAILED', adminUsername, { 
      reason: 'Unauthorized',
      targetUser: targetUsername 
    });
    throw new Error('Unauthorized: Admin access required');
  }

  if (!users[targetUsername]) {
    logger.warn('User deletion failed - user not found', { 
      adminUsername, 
      targetUsername 
    });
    throw new Error('User not found');
  }

  if (targetUsername === adminUsername) {
    logger.warn('User deletion failed - self-deletion attempt', { 
      adminUsername 
    });
    throw new Error('Cannot delete your own account');
  }

  delete users[targetUsername];
  await saveAuthConfig();
  
  logger.info('User deleted successfully', { 
    adminUsername, 
    targetUsername 
  });
  auditLog('USER_DELETED', adminUsername, { 
    deletedUser: targetUsername 
  });
  
  return { success: true, message: 'User deleted successfully' };
}

// List users function (admin only)
export function listUsers(adminUsername) {
  const admin = users[adminUsername];
  
  if (!admin || admin.role !== 'admin') {
    logger.warn('Unauthorized user list attempt', { 
      requestedBy: adminUsername 
    });
    auditLog('USER_LIST_FAILED', adminUsername, { 
      reason: 'Unauthorized' 
    });
    throw new Error('Unauthorized: Admin access required');
  }

  const userList = Object.values(users).map(user => ({
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    createdBy: user.createdBy,
    passwordChangedAt: user.passwordChangedAt
  }));

  logger.debug('User list accessed', { 
    adminUsername, 
    userCount: userList.length 
  });
  auditLog('USER_LIST_ACCESSED', adminUsername, { 
    userCount: userList.length 
  });

  return userList;
}

// Initialize on module load
initAuthConfig().catch(console.error);
