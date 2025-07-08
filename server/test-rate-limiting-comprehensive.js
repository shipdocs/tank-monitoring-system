#!/usr/bin/env node

/**
 * Comprehensive test script for rate limiting implementation
 * Tests all rate limiters and verifies proper functioning
 */

import fetch from 'node-fetch';
import WebSocket from 'ws';

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3002';

// Default auth token for testing (you'll need to get a real token)
let authToken = null;

// Test results storage
const testResults = [];

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(logMessage);
  testResults.push({ timestamp, type, message });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAuthToken() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.token;
    } else {
      log('Failed to get auth token. Using mock for testing.', 'WARN');
      return 'mock-token-for-testing';
    }
  } catch (error) {
    log(`Auth error: ${error.message}. Using mock token.`, 'WARN');
    return 'mock-token-for-testing';
  }
}

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    data: response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : await response.text(),
  };
}

async function testAuthLimiter() {
  log('Testing Auth Rate Limiter (5 requests per 15 minutes)...', 'TEST');

  const results = [];

  // Test auth endpoint - should allow 5 requests then block
  for (let i = 1; i <= 7; i++) {
    try {
      const response = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'test', password: 'wrong' }),
      });

      results.push({
        attempt: i,
        status: response.status,
        rateLimitLimit: response.headers['x-ratelimit-limit'],
        rateLimitRemaining: response.headers['x-ratelimit-remaining'],
        rateLimitReset: response.headers['x-ratelimit-reset'],
        retryAfter: response.headers['retry-after'],
      });

      log(`Auth attempt ${i}: Status ${response.status}, Remaining: ${response.headers['x-ratelimit-remaining']}`);

      if (response.status === 429) {
        log(`Rate limited after ${i - 1} attempts - EXPECTED`, 'PASS');
        break;
      }

      await delay(100); // Small delay between requests
    } catch (error) {
      log(`Auth test error: ${error.message}`, 'ERROR');
    }
  }

  return results;
}

async function testApiLimiter() {
  log('Testing API Rate Limiter (100 requests per minute)...', 'TEST');

  const results = [];
  const testCount = 5; // Test just a few to verify headers

  for (let i = 1; i <= testCount; i++) {
    try {
      const response = await makeRequest('/api/status');

      results.push({
        attempt: i,
        status: response.status,
        rateLimitLimit: response.headers['x-ratelimit-limit'],
        rateLimitRemaining: response.headers['x-ratelimit-remaining'],
      });

      log(`API attempt ${i}: Status ${response.status}, Remaining: ${response.headers['x-ratelimit-remaining']}`);

      if (response.status === 429) {
        log(`Rate limited after ${i - 1} attempts`, 'INFO');
        break;
      }

      await delay(50);
    } catch (error) {
      log(`API test error: ${error.message}`, 'ERROR');
    }
  }

  return results;
}

async function testFileSystemLimiter() {
  log('Testing File System Rate Limiter (20 requests per 5 minutes)...', 'TEST');

  const results = [];
  const testCount = 3; // Test just a few

  for (let i = 1; i <= testCount; i++) {
    try {
      const response = await makeRequest('/api/flexible/browse?path=/tmp');

      results.push({
        attempt: i,
        status: response.status,
        rateLimitLimit: response.headers['x-ratelimit-limit'],
        rateLimitRemaining: response.headers['x-ratelimit-remaining'],
      });

      log(`FileSystem attempt ${i}: Status ${response.status}, Remaining: ${response.headers['x-ratelimit-remaining']}`);

      if (response.status === 429) {
        log(`Rate limited after ${i - 1} attempts`, 'INFO');
        break;
      }

      await delay(100);
    } catch (error) {
      log(`FileSystem test error: ${error.message}`, 'ERROR');
    }
  }

  return results;
}

async function testConfigLimiter() {
  log('Testing Config Rate Limiter (10 requests per 5 minutes)...', 'TEST');

  const results = [];
  const testCount = 3;

  for (let i = 1; i <= testCount; i++) {
    try {
      const response = await makeRequest('/api/tank-config', {
        method: 'POST',
        body: JSON.stringify({ preAlarmPercentage: 85 }),
      });

      results.push({
        attempt: i,
        status: response.status,
        rateLimitLimit: response.headers['x-ratelimit-limit'],
        rateLimitRemaining: response.headers['x-ratelimit-remaining'],
      });

      log(`Config attempt ${i}: Status ${response.status}, Remaining: ${response.headers['x-ratelimit-remaining']}`);

      if (response.status === 429) {
        log(`Rate limited after ${i - 1} attempts`, 'INFO');
        break;
      }

      await delay(100);
    } catch (error) {
      log(`Config test error: ${error.message}`, 'ERROR');
    }
  }

  return results;
}

async function testWebSocketRateLimit() {
  log('Testing WebSocket Rate Limiter (10 connections per minute)...', 'TEST');

  const connections = [];
  const results = [];

  for (let i = 1; i <= 5; i++) {
    try {
      const ws = new WebSocket(`${WS_URL}?token=${authToken}`);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          log(`WebSocket connection ${i}: OPENED`);
          connections.push(ws);
          results.push({ attempt: i, status: 'connected' });
          resolve();
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          log(`WebSocket connection ${i}: ERROR - ${error.message}`);
          results.push({ attempt: i, status: 'error', error: error.message });
          resolve();
        });

        ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          log(`WebSocket connection ${i}: CLOSED - Code: ${code}, Reason: ${reason}`);
          results.push({ attempt: i, status: 'closed', code, reason: reason.toString() });
          resolve();
        });
      });

      await delay(200);
    } catch (error) {
      log(`WebSocket test ${i} error: ${error.message}`, 'ERROR');
      results.push({ attempt: i, status: 'failed', error: error.message });
    }
  }

  // Clean up connections
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  return results;
}

async function testAdminEndpoints() {
  log('Testing Admin Rate Limit Monitoring Endpoints...', 'TEST');

  try {
    // Test rate limit status endpoint
    const statusResponse = await makeRequest('/api/admin/rate-limits');
    log(`Admin status: ${statusResponse.status}`);

    if (statusResponse.status === 200) {
      log(`Active clients: ${statusResponse.data.totalActiveClients}`, 'INFO');
      log('Rate limit monitoring endpoint working', 'PASS');
    }

    // Test rate limit reset endpoint
    const resetResponse = await makeRequest('/api/admin/rate-limits/reset', {
      method: 'POST',
    });
    log(`Reset response: ${resetResponse.status}`);

    if (resetResponse.status === 200) {
      log('Rate limit reset endpoint working', 'PASS');
    }

    return { status: statusResponse, reset: resetResponse };
  } catch (error) {
    log(`Admin endpoints test error: ${error.message}`, 'ERROR');
    return { error: error.message };
  }
}

async function testRateLimitHeaders() {
  log('Testing Rate Limit Headers...', 'TEST');

  try {
    const response = await makeRequest('/api/status');

    const expectedHeaders = [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
    ];

    const presentHeaders = expectedHeaders.filter(header =>
      response.headers[header] !== undefined,
    );

    log(`Headers present: ${presentHeaders.join(', ')}`);

    if (presentHeaders.length === expectedHeaders.length) {
      log('All expected rate limit headers present', 'PASS');
    } else {
      log(`Missing headers: ${expectedHeaders.filter(h => !presentHeaders.includes(h)).join(', ')}`, 'WARN');
    }

    return { presentHeaders, allHeaders: response.headers };
  } catch (error) {
    log(`Header test error: ${error.message}`, 'ERROR');
    return { error: error.message };
  }
}

async function runAllTests() {
  log('Starting Comprehensive Rate Limiting Tests', 'START');

  // Get authentication token
  authToken = await getAuthToken();
  log(`Using auth token: ${authToken ? `${authToken.substring(0, 20)}...` : 'none'}`);

  const allResults = {};

  try {
    // Test rate limit headers first
    allResults.headers = await testRateLimitHeaders();
    await delay(1000);

    // Test API rate limiter
    allResults.api = await testApiLimiter();
    await delay(1000);

    // Test file system rate limiter
    allResults.filesystem = await testFileSystemLimiter();
    await delay(1000);

    // Test config rate limiter
    allResults.config = await testConfigLimiter();
    await delay(1000);

    // Test WebSocket rate limiter
    allResults.websocket = await testWebSocketRateLimit();
    await delay(1000);

    // Test admin endpoints
    allResults.admin = await testAdminEndpoints();
    await delay(1000);

    // Test auth rate limiter (last as it has strict limits)
    allResults.auth = await testAuthLimiter();

  } catch (error) {
    log(`Test suite error: ${error.message}`, 'ERROR');
  }

  // Generate summary
  log('\\n=== TEST SUMMARY ===', 'SUMMARY');
  log(`Total tests completed: ${Object.keys(allResults).length}`);

  const passCount = testResults.filter(r => r.type === 'PASS').length;
  const errorCount = testResults.filter(r => r.type === 'ERROR').length;
  const warnCount = testResults.filter(r => r.type === 'WARN').length;

  log(`PASS: ${passCount}, ERROR: ${errorCount}, WARN: ${warnCount}`);

  // Save detailed results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `rate-limit-test-results-${timestamp}.json`;

  try {
    const fs = await import('fs/promises');
    await fs.writeFile(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      testResults,
      detailedResults: allResults,
      summary: { passCount, errorCount, warnCount },
    }, null, 2));

    log(`Detailed results saved to: ${resultsFile}`, 'INFO');
  } catch (error) {
    log(`Could not save results file: ${error.message}`, 'WARN');
  }

  log('Rate limiting tests completed', 'END');

  return allResults;
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export { runAllTests, log };
