#!/usr/bin/env node

import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';
let authToken = null;

// Test data with various injection attempts
const injectionTests = {
  sqlInjection: [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "1; UPDATE users SET role='admin' WHERE username='hacker'",
    "' UNION SELECT * FROM users--",
  ],
  xssAttacks: [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "javascript:alert('XSS')",
    "<iframe src='javascript:alert(1)'></iframe>",
    '<%2Fscript%3E%3Cscript%3Ealert%28%27XSS%27%29%3C%2Fscript%3E',
  ],
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '....//....//....//etc/passwd',
    '..%252f..%252f..%252fetc%252fpasswd',
  ],
  commandInjection: [
    '; ls -la',
    '| cat /etc/passwd',
    '&& rm -rf /',
    '`whoami`',
    '$(cat /etc/passwd)',
  ],
  oversizedPayloads: {
    largeString: 'A'.repeat(1000000), // 1MB string
    deepNesting: createDeepObject(100), // Deep nested object
    manyFields: createWideObject(10000), // Object with many fields
  },
};

function createDeepObject(depth) {
  const obj = { value: 'test' };
  let current = obj;
  for (let i = 0; i < depth; i++) {
    current.nested = { value: 'test' };
    current = current.nested;
  }
  return obj;
}

function createWideObject(width) {
  const obj = {};
  for (let i = 0; i < width; i++) {
    obj[`field_${i}`] = 'test';
  }
  return obj;
}

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testLogin() {
  log('\n=== Testing Login Endpoint ===', 'blue');

  // Test valid login
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123',
    });
    authToken = response.data.token;
    log('✓ Valid login successful', 'green');
  } catch (error) {
    log(`✗ Valid login failed: ${error.response?.data?.message}`, 'red');
  }

  // Test SQL injection in login
  for (const injection of injectionTests.sqlInjection) {
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        username: injection,
        password: 'password',
      });
      log(`✗ SQL injection not blocked: ${injection}`, 'red');
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 401) {
        log(`✓ SQL injection blocked: ${injection}`, 'green');
      } else {
        log(`? Unexpected response for: ${injection}`, 'yellow');
      }
    }
  }
}

async function testTankConfig() {
  log('\n=== Testing Tank Configuration Endpoint ===', 'blue');

  const headers = { Authorization: `Bearer ${authToken}` };

  // Test valid configuration
  try {
    await axios.post(`${API_BASE}/tank-config`, {
      preAlarmPercentage: 86,
      overfillPercentage: 97.5,
      lowLevelPercentage: 10,
      tanks: {
        tank1: {
          name: 'Tank A',
          maxCapacity: 1000,
          minLevel: 50,
          maxLevel: 950,
          unit: 'L',
          location: 'Zone 1',
        },
      },
    }, { headers });
    log('✓ Valid tank configuration accepted', 'green');
  } catch (error) {
    log(`✗ Valid configuration rejected: ${error.response?.data?.message}`, 'red');
  }

  // Test invalid percentage ordering
  try {
    await axios.post(`${API_BASE}/tank-config`, {
      preAlarmPercentage: 50,
      overfillPercentage: 40, // Should be > preAlarm
      lowLevelPercentage: 60,  // Should be < preAlarm
    }, { headers });
    log('✗ Invalid percentage ordering not blocked', 'red');
  } catch (error) {
    if (error.response?.status === 400) {
      log('✓ Invalid percentage ordering blocked', 'green');
    }
  }

  // Test XSS in tank names
  for (const xss of injectionTests.xssAttacks.slice(0, 3)) {
    try {
      await axios.post(`${API_BASE}/tank-config`, {
        preAlarmPercentage: 86,
        overfillPercentage: 97.5,
        lowLevelPercentage: 10,
        tanks: {
          tank1: {
            name: xss,
            maxCapacity: 1000,
          },
        },
      }, { headers });
      log(`✗ XSS not sanitized in tank name: ${xss}`, 'red');
    } catch (error) {
      if (error.response?.status === 400) {
        log(`✓ XSS blocked in tank name: ${xss}`, 'green');
      }
    }
  }
}

async function testDataSources() {
  log('\n=== Testing Data Source Configuration ===', 'blue');

  const headers = { Authorization: `Bearer ${authToken}` };

  // Test path traversal attempts
  for (const path of injectionTests.pathTraversal) {
    try {
      await axios.post(`${API_BASE}/flexible/sources`, {
        id: 'test-source',
        type: 'file',
        enabled: true,
        path,
        format: 'csv',
      }, { headers });
      log(`✗ Path traversal not blocked: ${path}`, 'red');
    } catch (error) {
      if (error.response?.status === 400) {
        log(`✓ Path traversal blocked: ${path}`, 'green');
      }
    }
  }

  // Test command injection in file paths
  for (const cmd of injectionTests.commandInjection) {
    try {
      await axios.post(`${API_BASE}/flexible/sources`, {
        id: 'test-source',
        type: 'file',
        enabled: true,
        path: `/tmp/test${cmd}`,
        format: 'csv',
      }, { headers });
      log(`✗ Command injection not blocked: ${cmd}`, 'red');
    } catch (error) {
      if (error.response?.status === 400) {
        log(`✓ Command injection blocked: ${cmd}`, 'green');
      }
    }
  }

  // Test URL validation
  const maliciousUrls = [
    'file:///etc/passwd',
    'ftp://malicious.com/steal',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
  ];

  for (const url of maliciousUrls) {
    try {
      await axios.post(`${API_BASE}/flexible/sources`, {
        id: 'test-source',
        type: 'url',
        enabled: true,
        url,
        format: 'json',
      }, { headers });
      log(`✗ Malicious URL not blocked: ${url}`, 'red');
    } catch (error) {
      if (error.response?.status === 400) {
        log(`✓ Malicious URL blocked: ${url}`, 'green');
      }
    }
  }
}

async function testFileBrowsing() {
  log('\n=== Testing File Browsing ===', 'blue');

  const headers = { Authorization: `Bearer ${authToken}` };

  // Test path traversal in browse endpoint
  for (const path of injectionTests.pathTraversal) {
    try {
      await axios.get(`${API_BASE}/flexible/browse`, {
        params: { path },
        headers,
      });
      log(`✗ Path traversal not blocked in browse: ${path}`, 'red');
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 403) {
        log(`✓ Path traversal blocked in browse: ${path}`, 'green');
      }
    }
  }
}

async function testRateLimiting() {
  log('\n=== Testing Rate Limiting ===', 'blue');

  const headers = { Authorization: `Bearer ${authToken}` };

  // Test auth endpoint rate limiting (5 requests per 15 min)
  log('Testing auth rate limit (5 requests)...', 'yellow');
  let authBlocked = false;
  for (let i = 0; i < 10; i++) {
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        username: 'test',
        password: 'wrong',
      });
    } catch (error) {
      if (error.response?.status === 429) {
        authBlocked = true;
        log(`✓ Auth rate limit triggered after ${i + 1} requests`, 'green');
        break;
      }
    }
  }
  if (!authBlocked) {
    log('✗ Auth rate limiting not working', 'red');
  }

  // Test general API rate limiting (100 requests per 15 min)
  log('Testing general rate limit (100 requests)...', 'yellow');
  let generalBlocked = false;
  for (let i = 0; i < 110; i++) {
    try {
      await axios.get(`${API_BASE}/tanks`, { headers });
    } catch (error) {
      if (error.response?.status === 429) {
        generalBlocked = true;
        log(`✓ General rate limit triggered after ${i + 1} requests`, 'green');
        break;
      }
    }
  }
  if (!generalBlocked) {
    log('✗ General rate limiting might not be working (or limit is higher)', 'yellow');
  }
}

async function testPayloadSize() {
  log('\n=== Testing Payload Size Limits ===', 'blue');

  const headers = {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };

  // Test oversized payload
  try {
    await axios.post(`${API_BASE}/tank-config`, {
      preAlarmPercentage: 86,
      overfillPercentage: 97.5,
      lowLevelPercentage: 10,
      tanks: {
        tank1: {
          name: injectionTests.oversizedPayloads.largeString,
          maxCapacity: 1000,
        },
      },
    }, { headers });
    log('✗ Oversized payload not blocked', 'red');
  } catch (error) {
    if (error.response?.status === 413 || error.response?.status === 400) {
      log('✓ Oversized payload blocked', 'green');
    }
  }

  // Test deeply nested object
  try {
    await axios.post(`${API_BASE}/config`, {
      test: injectionTests.oversizedPayloads.deepNesting,
    }, { headers });
    log('✗ Deeply nested object not blocked', 'red');
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 413) {
      log('✓ Deeply nested object blocked', 'green');
    }
  }
}

async function testUserManagement() {
  log('\n=== Testing User Management ===', 'blue');

  const headers = { Authorization: `Bearer ${authToken}` };

  // Test creating user with weak password
  try {
    await axios.post(`${API_BASE}/auth/users`, {
      username: 'testuser',
      password: '12345678', // Weak password
      role: 'operator',
    }, { headers });
    log('✗ Weak password not rejected', 'red');
  } catch (error) {
    if (error.response?.status === 400) {
      log('✓ Weak password rejected', 'green');
    }
  }

  // Test creating user with strong password
  try {
    await axios.post(`${API_BASE}/auth/users`, {
      username: 'testuser',
      password: 'Test@123456', // Strong password
      role: 'operator',
    }, { headers });
    log('✓ Strong password accepted', 'green');

    // Clean up - delete the test user
    await axios.delete(`${API_BASE}/auth/users/testuser`, { headers });
  } catch (error) {
    log(`✗ Valid user creation failed: ${error.response?.data?.message}`, 'red');
  }

  // Test SQL injection in username
  for (const injection of injectionTests.sqlInjection.slice(0, 2)) {
    try {
      await axios.post(`${API_BASE}/auth/users`, {
        username: injection,
        password: 'Test@123456',
        role: 'operator',
      }, { headers });
      log(`✗ SQL injection not blocked in username: ${injection}`, 'red');
    } catch (error) {
      if (error.response?.status === 400) {
        log(`✓ SQL injection blocked in username: ${injection}`, 'green');
      }
    }
  }
}

async function runAllTests() {
  log('🔒 Tank Monitoring API Security Test Suite', 'blue');
  log('==========================================\n', 'blue');

  try {
    await testLogin();

    if (!authToken) {
      log('\n❌ Cannot continue tests without authentication', 'red');
      return;
    }

    await testTankConfig();
    await testDataSources();
    await testFileBrowsing();
    await testPayloadSize();
    await testUserManagement();
    await testRateLimiting(); // Run this last as it may block further requests

    log('\n✅ Security test suite completed!', 'green');
  } catch (error) {
    log(`\n❌ Test suite failed with error: ${error.message}`, 'red');
    console.error(error);
  }
}

// Check if axios is installed
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function ensureAxios() {
  try {
    await import('axios');
  } catch {
    log('Installing axios for testing...', 'yellow');
    await execAsync('npm install axios');
  }
}

// Run tests
ensureAxios().then(() => {
  runAllTests();
}).catch(error => {
  log(`Failed to set up test environment: ${error.message}`, 'red');
});
