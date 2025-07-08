#!/usr/bin/env node

/**
 * Test script to demonstrate rate limiting functionality
 * This script tests the rate limiting middleware with various scenarios
 */

import express from 'express';
import {
  apiLimiter,
  authLimiter,
  banAbusiveIPs,
  configLimiter,
  fileSystemLimiter,
  shutdownRateLimiter,
  staticLimiter,
} from './middleware/rateLimiter.js';

const app = express();
app.use(express.json());

// Apply IP banning middleware
app.use(banAbusiveIPs);

// Test endpoints with different rate limits
app.get('/api/test-general', apiLimiter, (req, res) => {
  res.json({
    message: 'General API endpoint',
    timestamp: new Date().toISOString(),
    limit: '100 requests per minute',
  });
});

app.post('/api/test-config', configLimiter, (req, res) => {
  res.json({
    message: 'Configuration endpoint',
    timestamp: new Date().toISOString(),
    limit: '10 requests per 5 minutes',
  });
});

app.get('/api/test-filesystem', fileSystemLimiter, (req, res) => {
  res.json({
    message: 'File system endpoint',
    timestamp: new Date().toISOString(),
    limit: '20 requests per 5 minutes',
  });
});

app.post('/api/test-auth', authLimiter, (req, res) => {
  res.json({
    message: 'Authentication endpoint',
    timestamp: new Date().toISOString(),
    limit: '5 requests per 15 minutes',
  });
});

app.get('/static/test', staticLimiter, (req, res) => {
  res.json({
    message: 'Static asset endpoint',
    timestamp: new Date().toISOString(),
    limit: '200 requests per minute',
  });
});

// Test endpoint with parametrized route
app.get('/api/test/:id', apiLimiter, (req, res) => {
  res.json({
    message: `Test endpoint for ID: ${req.params.id}`,
    timestamp: new Date().toISOString(),
    limit: '100 requests per minute',
  });
});

// Rate limit status endpoint
app.get('/api/rate-limit-status', apiLimiter, (req, res) => {
  res.json({
    message: 'Rate limiting is active',
    headers: {
      'X-RateLimit-Limit': res.getHeader('X-RateLimit-Limit'),
      'X-RateLimit-Remaining': res.getHeader('X-RateLimit-Remaining'),
      'X-RateLimit-Reset': res.getHeader('X-RateLimit-Reset'),
    },
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = 3003;

app.listen(PORT, () => {
  console.log(`Rate limiting test server running on port ${PORT}`);
  console.log('\nTest endpoints:');
  console.log('- GET  /api/test-general (100/min)');
  console.log('- POST /api/test-config (10/5min)');
  console.log('- GET  /api/test-filesystem (20/5min)');
  console.log('- POST /api/test-auth (5/15min)');
  console.log('- GET  /static/test (200/min)');
  console.log('- GET  /api/test/:id (100/min)');
  console.log('- GET  /api/rate-limit-status (100/min)');
  console.log('\nPress Ctrl+C to stop');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await shutdownRateLimiter();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  await shutdownRateLimiter();
  process.exit(0);
});
