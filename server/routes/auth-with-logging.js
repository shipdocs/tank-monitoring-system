import express from 'express';
import { changePassword, createUser, deleteUser, listUsers, login, verifyToken } from '../middleware/auth-with-logging.js';
import { auditLog, createModuleLogger, logError } from '../logger.js';

const router = express.Router();
const logger = createModuleLogger('auth-routes');

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      logger.warn('Login attempt with missing credentials', {
        username: username || 'missing',
        hasPassword: !!password,
      });
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Username and password are required',
      });
    }

    const result = await login(username, password);

    res.json({
      success: true,
      token: result.token,
      user: result.user,
      expiresIn: '24h',
    });
  } catch (error) {
    logError(error, { context: 'Login error', username: req.body.username });
    res.status(401).json({
      error: 'Authentication failed',
      message: error.message,
    });
  }
});

// Verify token endpoint
router.get('/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      logger.debug('Token verification failed - no token provided');
      return res.status(401).json({
        valid: false,
        message: 'No token provided',
      });
    }

    const decoded = verifyToken(token);

    logger.debug('Token verified successfully', { username: decoded.username });

    res.json({
      valid: true,
      user: {
        username: decoded.username,
        role: decoded.role,
      },
    });
  } catch (error) {
    logger.warn('Token verification failed', { error: error.message });
    res.status(401).json({
      valid: false,
      message: error.message,
    });
  }
});

// Get auth status endpoint
router.get('/status', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.json({
        authenticated: false,
        user: null,
      });
    }

    const decoded = verifyToken(token);

    res.json({
      authenticated: true,
      user: {
        username: decoded.username,
        role: decoded.role,
      },
    });
  } catch (error) {
    logger.debug('Auth status check failed', { error: error.message });
    res.json({
      authenticated: false,
      user: null,
    });
  }
});

// Change password endpoint (requires authentication)
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided',
      });
    }

    const decoded = verifyToken(token);
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      logger.warn('Change password attempt with missing data', {
        username: decoded.username,
        hasOldPassword: !!oldPassword,
        hasNewPassword: !!newPassword,
      });
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Old password and new password are required',
      });
    }

    const result = await changePassword(decoded.username, oldPassword, newPassword);

    res.json(result);
  } catch (error) {
    logError(error, { context: 'Change password error', username: req.body.username });
    res.status(400).json({
      error: 'Password change failed',
      message: error.message,
    });
  }
});

// Create user endpoint (admin only)
router.post('/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided',
      });
    }

    const decoded = verifyToken(token);
    const { username, password, role } = req.body;

    if (!username || !password) {
      logger.warn('User creation attempt with missing data', {
        requestedBy: decoded.username,
        hasUsername: !!username,
        hasPassword: !!password,
      });
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Username and password are required',
      });
    }

    const result = await createUser(decoded.username, username, password, role);

    res.json(result);
  } catch (error) {
    logError(error, { context: 'Create user error', requestedBy: req.user?.username });
    res.status(400).json({
      error: 'User creation failed',
      message: error.message,
    });
  }
});

// Delete user endpoint (admin only)
router.delete('/users/:username', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided',
      });
    }

    const decoded = verifyToken(token);
    const { username } = req.params;

    const result = await deleteUser(decoded.username, username);

    res.json(result);
  } catch (error) {
    logError(error, {
      context: 'Delete user error',
      requestedBy: req.user?.username,
      targetUser: req.params.username,
    });
    res.status(400).json({
      error: 'User deletion failed',
      message: error.message,
    });
  }
});

// List users endpoint (admin only)
router.get('/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided',
      });
    }

    const decoded = verifyToken(token);
    const users = listUsers(decoded.username);

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    logError(error, {
      context: 'List users error',
      requestedBy: req.user?.username,
    });
    res.status(403).json({
      error: 'Access denied',
      message: error.message,
    });
  }
});

// Logout endpoint (client-side token removal)
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (token) {
    try {
      const decoded = verifyToken(token);
      auditLog('LOGOUT', decoded.username, {});
      logger.info('User logged out', { username: decoded.username });
    } catch (error) {
      // Token might be invalid, but we still want to log the attempt
      logger.debug('Logout with invalid token');
    }
  }

  // JWT tokens are stateless, so logout is handled client-side
  // This endpoint is provided for consistency
  res.json({
    success: true,
    message: 'Logout successful. Please remove token from client storage.',
  });
});

export default router;
