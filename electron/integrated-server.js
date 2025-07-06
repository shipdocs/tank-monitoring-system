// Integrated server for Electron main process
// This runs the server directly in Electron, no separate process needed

import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import chokidar from 'chokidar';

// Import server modules  
import { FlexibleFileMonitor } from '../server/fileMonitor.js';
import { FlexibleFileParser } from '../server/fileParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app;
let server;
let wss;
let fileMonitor;

// Store for debug logs
const debugLogs = [];
const MAX_LOGS = 200;

// Tank configuration storage
let tankConfiguration = {
  preAlarmPercentage: 86,
  overfillPercentage: 97.5,
  lowLevelPercentage: 10,
  tanks: {}
};

// App branding storage
let appBranding = {
  appName: 'Tank Monitoring System',
  appSlogan: 'Real-time tank level monitoring dashboard',
  primaryColor: '#2563eb'
};

// Security settings storage
let securitySettings = {
  passwordProtected: false,
  password: ''
};

// Tank data storage
let lastTankData = [];
let connectedClients = new Set();
let isFileMonitoringActive = false;

// Simple rate limiting for file system access
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

function checkRateLimit(ip, endpoint) {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  const limit = rateLimitMap.get(key);

  if (now > limit.resetTime) {
    // Reset the limit
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  limit.count++;
  return true;
}

function addLog(level, category, message) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message
  };
  
  debugLogs.push(log);
  if (debugLogs.length > MAX_LOGS) {
    debugLogs.shift();
  }
  
  console.log(`[${log.timestamp}] [${level}] [${category}] ${message}`);
}

// Configuration management
let currentConfig = {
  selectedPort: '',
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  autoConnect: true,
  tankCount: 0,
  dataFormat: 'csvfile',
  csvFile: {
    enabled: true,
    filePath: '',
    importInterval: 3000,
    hasHeaders: false,
    delimiter: ' ',
    encoding: 'utf8',
    columnMapping: {
      id: '',
      name: '',
      level: '',
      maxCapacity: '',
      minLevel: '',
      maxLevel: '',
      unit: '',
      location: ''
    },
    autoDiscoverColumns: true,
    isVerticalFormat: true,
    linesPerRecord: 4,
    lineMapping: { '0': 'level', '1': 'temperature', '2': 'ignore', '3': 'ignore' },
    autoDetectDataEnd: true,
    skipOutliers: true,
    maxRecords: 12,
    temperatureRange: { min: 0, max: 50 }
  }
};

const CONFIG_FILE = path.join(
  process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : process.env.HOME),
  '.tank-monitor-config.json'
);

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      currentConfig = { ...currentConfig, ...JSON.parse(data) };
      addLog('INFO', 'CONFIG', 'Configuration loaded');
    }
  } catch (error) {
    addLog('ERROR', 'CONFIG', `Failed to load config: ${error.message}`);
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
    addLog('INFO', 'CONFIG', 'Configuration saved');
  } catch (error) {
    addLog('ERROR', 'CONFIG', `Failed to save config: ${error.message}`);
  }
}

// Tank status helper function
function getStatus(level) {
  if (level < 25) return 'critical';
  if (level < 50) return 'low';
  if (level > 950) return 'high';
  return 'normal';
}

// Vertical format parser (copied from main server)
function parseVerticalFormatData(fileContent, config) {
  const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const { linesPerRecord, lineMapping, maxRecords } = config;
  const tanks = [];

  addLog('INFO', 'PARSER', `Parsing vertical format: ${lines.length} lines, ${linesPerRecord} lines per record`);

  for (let i = 0; i < lines.length; i += linesPerRecord) {
    if (maxRecords > 0 && tanks.length >= maxRecords) break;

    const recordLines = lines.slice(i, i + linesPerRecord);
    if (recordLines.length < linesPerRecord) break;

    const tank = {
      id: `tank_${tanks.length + 1}`,
      name: `Tank ${String.fromCharCode(65 + tanks.length)}`, // Tank A, Tank B, etc.
      currentLevel: 0,
      maxCapacity: 1000,
      minLevel: 50,
      maxLevel: 950,
      unit: 'L',
      status: 'normal',
      lastUpdated: new Date().toISOString(),
      location: `Position ${tanks.length + 1}`,
      group: tanks.length < 6 ? 'BB' : 'SB'
    };

    // Apply line mapping
    Object.entries(lineMapping).forEach(([lineIndex, fieldName]) => {
      const lineNum = parseInt(lineIndex);
      if (lineNum < recordLines.length && fieldName !== 'ignore') {
        const value = recordLines[lineNum];

        if (fieldName === 'level') {
          tank.currentLevel = parseFloat(value) || 0;
          tank.level = tank.currentLevel; // Also set level for compatibility
        } else if (fieldName === 'temperature') {
          tank.temperature = parseFloat(value) || 0;
        } else if (fieldName === 'name') {
          tank.name = value || tank.name;
        }
      }
    });

    tanks.push(tank);
  }

  addLog('INFO', 'PARSER', `Parsed ${tanks.length} tanks from vertical format`);
  return tanks;
}

// Generate empty tank data
function generateEmptyTanks() {
  const tanks = [];
  const timestamp = new Date().toISOString();

  for (let i = 1; i <= 12; i++) {
    const group = i >= 1 && i <= 6 ? 'BB' : i >= 7 && i <= 12 ? 'SB' : 'CENTER';

    tanks.push({
      id: i,
      name: `Tank ${String.fromCharCode(64 + i)}`, // Tank A, Tank B, etc.
      currentLevel: 0, // Empty tanks
      maxCapacity: 1000,
      minLevel: 50,
      maxLevel: 950,
      unit: 'L',
      status: 'critical', // Empty tanks are critical
      lastUpdated: timestamp,
      location: `Zone ${Math.floor((i - 1) / 3) + 1}-${((i - 1) % 3) + 1}`,
      group: group,
      temperature: 20 // Default temperature
    });
  }

  // Store the empty tank data
  lastTankData = tanks;

  // Broadcast initial empty data
  broadcastTankData(tanks);

  addLog('INFO', 'SERVER', '📊 Generated 12 empty tanks - no data source configured');

  return tanks;
}

// Broadcast data to all connected WebSocket clients
function broadcastTankData(tanks) {
  // Store the latest tank data for API endpoint
  lastTankData = tanks;

  const message = JSON.stringify({
    type: 'tankData',
    data: {
      tanks,
      lastSync: new Date().toISOString(),
      connectionStatus: isFileMonitoringActive ? 'connected' : 'disconnected'
    }
  });

  connectedClients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// Broadcast connection status
function broadcastStatus(status) {
  const message = JSON.stringify({
    type: 'status',
    data: { connectionStatus: status, lastSync: new Date().toISOString() }
  });

  connectedClients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}



export function startIntegratedServer(isDev = false) {
  return new Promise((resolve, reject) => {
    try {
      addLog('INFO', 'SERVER', 'Starting integrated server...');
      
      // Load configuration
      loadConfig();
      
      // Create Express app
      app = express();
      app.use(cors());
      app.use(express.json());
      
      // Serve static files
      let staticPath = isDev
        ? path.join(__dirname, '..', 'dist')
        : path.join(process.resourcesPath, 'dist');

      // Check if the static path exists and log it
      if (fs.existsSync(staticPath)) {
        addLog('INFO', 'SERVER', `Static path exists: ${staticPath}`);
      } else {
        addLog('WARN', 'SERVER', `Static path does not exist: ${staticPath}`);
        // Try alternative paths
        const alternatives = [
          path.join(process.resourcesPath || '', 'app.asar', 'dist'),
          path.join(__dirname, '../../dist'),
          path.join(__dirname, '../../../dist'),
          path.join(process.cwd(), 'dist')
        ];

        for (const altPath of alternatives) {
          if (fs.existsSync(altPath)) {
            staticPath = altPath;
            addLog('INFO', 'SERVER', `Found alternative static path: ${staticPath}`);
            break;
          }
        }
      }

      app.use(express.static(staticPath));
      addLog('INFO', 'SERVER', `Serving static files from: ${staticPath}`);
      
      // API Routes
      app.get('/api/status', (req, res) => {
        const isConnected = currentConfig.csvFile.enabled && currentConfig.csvFile.filePath ?
          isFileMonitoringActive : false;

        res.json({
          connected: isConnected,
          selectedPort: currentConfig.selectedPort,
          csvFileEnabled: currentConfig.csvFile.enabled,
          csvFilePath: currentConfig.csvFile.filePath,
          dataSource: currentConfig.csvFile.enabled ? 'csvfile' : 'serial',
          lastSync: new Date().toISOString(),
          status: 'online',
          version: '2.0.0',
          debugLogs: debugLogs.length
        });
      });
      
      app.get('/api/config', (req, res) => {
        res.json(currentConfig);
      });
      
      app.post('/api/config', (req, res) => {
        currentConfig = { ...currentConfig, ...req.body };
        saveConfig();
        
        // Restart file monitoring if needed
        if (fileMonitor && currentConfig.csvFile.enabled) {
          fileMonitor.stop();
          startFileMonitoring();
        }
        
        res.json({ success: true, config: currentConfig });
      });
      
      app.get('/api/debug-logs', (req, res) => {
        res.json(debugLogs);
      });

      // Tank data endpoint
      app.get('/api/tanks', (req, res) => {
        if (lastTankData && lastTankData.length > 0) {
          res.json(lastTankData);
        } else {
          res.status(503).json({
            error: 'No tank data available',
            message: 'Data source not connected or no data received yet'
          });
        }
      });

      // Tank configuration endpoints
      app.get('/api/tank-config', (req, res) => {
        res.json(tankConfiguration);
      });

      app.post('/api/tank-config', (req, res) => {
        try {
          tankConfiguration = { ...tankConfiguration, ...req.body };
          addLog('INFO', 'CONFIG', 'Tank configuration updated');
          res.json({ success: true, message: 'Tank configuration saved' });
        } catch (error) {
          addLog('ERROR', 'CONFIG', `Failed to save tank configuration: ${error.message}`);
          res.status(500).json({ success: false, message: 'Failed to save configuration' });
        }
      });

      // App branding endpoints
      app.get('/api/branding', (req, res) => {
        res.json(appBranding);
      });

      app.post('/api/branding', (req, res) => {
        try {
          appBranding = { ...appBranding, ...req.body };
          addLog('INFO', 'CONFIG', 'App branding updated');
          res.json({ success: true, message: 'Branding saved' });
        } catch (error) {
          addLog('ERROR', 'CONFIG', `Failed to save branding: ${error.message}`);
          res.status(500).json({ success: false, message: 'Failed to save branding' });
        }
      });

      // Security endpoints
      app.get('/api/security', (req, res) => {
        // Don't send the actual password, just the protection status
        res.json({
          passwordProtected: securitySettings.passwordProtected
        });
      });

      app.post('/api/security', (req, res) => {
        try {
          securitySettings = { ...securitySettings, ...req.body };
          addLog('INFO', 'CONFIG', 'Security settings updated');
          res.json({ success: true, message: 'Security settings saved' });
        } catch (error) {
          addLog('ERROR', 'CONFIG', `Failed to save security settings: ${error.message}`);
          res.status(500).json({ success: false, message: 'Failed to save security settings' });
        }
      });

      app.post('/api/security/verify', (req, res) => {
        const { password } = req.body;
        if (!securitySettings.passwordProtected || password === securitySettings.password) {
          res.json({ success: true, message: 'Access granted' });
        } else {
          res.status(401).json({ success: false, message: 'Invalid password' });
        }
      });

      // Connection endpoints
      app.post('/api/connect', async (req, res) => {
        try {
          if (currentConfig.csvFile.enabled && currentConfig.csvFile.filePath) {
            startFileMonitoring();
            addLog('INFO', 'CONNECTION', 'File monitoring started');
            res.json({ success: true, connected: true });
          } else {
            addLog('WARN', 'CONNECTION', 'No data source configured');
            res.json({ success: false, connected: false, message: 'No data source configured' });
          }
        } catch (error) {
          addLog('ERROR', 'CONNECTION', `Connection failed: ${error.message}`);
          res.json({ success: false, connected: false, error: error.message });
        }
      });

      app.post('/api/disconnect', (req, res) => {
        try {
          if (fileMonitor) {
            fileMonitor.stop();
            addLog('INFO', 'CONNECTION', 'File monitoring stopped');
          }
          isFileMonitoringActive = false;
          broadcastStatus('disconnected');
          res.json({ success: true, connected: false });
        } catch (error) {
          addLog('ERROR', 'CONNECTION', `Disconnect failed: ${error.message}`);
          res.json({ success: false, error: error.message });
        }
      });
      
      app.post('/api/test-csv', async (req, res) => {
        const { filePath } = req.body;
        try {
          const parser = new FlexibleFileParser();
          const content = fs.readFileSync(filePath, 'utf8');
          const result = await parser.parse(content, 'csv', currentConfig.csvFile);
          res.json(result);
        } catch (error) {
          res.status(400).json({ error: error.message });
        }
      });



      // Serve settings page
      app.get('/settings', (req, res) => {
        const settingsPath = path.join(__dirname, '..', 'server', 'settings.html');
        if (fs.existsSync(settingsPath)) {
          res.sendFile(settingsPath);
        } else {
          res.status(404).send('Settings page not found');
        }
      });

      // Serve settings page
      app.get('/settings', (req, res) => {
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

        if (!checkRateLimit(clientIp, '/settings')) {
          return res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.'
          });
        }

        const settingsPath = path.join(__dirname, 'settings.html');
        if (fs.existsSync(settingsPath)) {
          res.sendFile(settingsPath);
        } else {
          res.status(404).send('Settings page not found');
        }
      });

      // Serve flexible settings page
      app.get('/flexible-settings', (req, res) => {
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

        if (!checkRateLimit(clientIp, '/flexible-settings')) {
          return res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.'
          });
        }

        const flexibleSettingsPath = path.join(__dirname, '..', 'server', 'flexible-settings.html');
        if (fs.existsSync(flexibleSettingsPath)) {
          res.sendFile(flexibleSettingsPath);
        } else {
          res.status(404).send('Flexible settings page not found');
        }
      });

      // Handle all routes for React app
      app.get('*', (req, res) => {
        res.sendFile(path.join(staticPath, 'index.html'));
      });
      
      // Create HTTP server
      server = app.listen(3001, () => {
        addLog('INFO', 'SERVER', 'HTTP server running on port 3001');
      });
      
      // Create WebSocket server
      wss = new WebSocketServer({ port: 3002 });
      
      wss.on('connection', (ws) => {
        addLog('INFO', 'WS', 'New WebSocket connection');
        connectedClients.add(ws);

        // Send initial data
        ws.send(JSON.stringify({
          type: 'config',
          data: currentConfig
        }));

        // Send current tank data if available
        if (lastTankData && lastTankData.length > 0) {
          ws.send(JSON.stringify({
            type: 'tankData',
            data: {
              tanks: lastTankData,
              lastSync: new Date().toISOString(),
              connectionStatus: 'connected'
            }
          }));
        }

        ws.on('message', (message) => {
          try {
            const msg = JSON.parse(message);
            addLog('DEBUG', 'WS', `Received: ${msg.type}`);
          } catch (error) {
            addLog('ERROR', 'WS', `Invalid message: ${error.message}`);
          }
        });

        ws.on('close', () => {
          addLog('INFO', 'WS', 'WebSocket connection closed');
          connectedClients.delete(ws);
        });

        ws.on('error', (error) => {
          addLog('ERROR', 'WS', `WebSocket error: ${error.message}`);
          connectedClients.delete(ws);
        });
      });
      
      addLog('INFO', 'SERVER', 'WebSocket server running on port 3002');
      
      // Start file monitoring if configured
      if (currentConfig.csvFile.enabled && currentConfig.csvFile.filePath) {
        startFileMonitoring();
      } else {
        // No file monitoring configured, generate empty tanks
        addLog('INFO', 'SERVER', 'No data source configured, generating empty tanks');
        setTimeout(() => {
          generateEmptyTanks();
        }, 1000);
      }

      addLog('INFO', 'SERVER', 'Integrated server started successfully');
      resolve({ app, server, wss });

    } catch (error) {
      addLog('ERROR', 'SERVER', `Failed to start server: ${error.message}`);
      reject(error);
    }
  });
}

function startFileMonitoring() {
  if (!currentConfig.csvFile.filePath) {
    addLog('INFO', 'MONITOR', 'No CSV file configured');
    isFileMonitoringActive = false;
    broadcastStatus('disconnected');
    return;
  }

  // Check if vertical format is enabled
  if (currentConfig.csvFile.isVerticalFormat) {
    addLog('INFO', 'MONITOR', 'Using vertical format parser for file monitoring');
    startVerticalFormatMonitoring();
    isFileMonitoringActive = true;
    broadcastStatus('connected');
    return;
  }

  // Use FlexibleFileMonitor for regular CSV files
  fileMonitor = new FlexibleFileMonitor();

  // Configure the data source
  const dataSource = {
    id: 'csv-file',
    type: 'file',
    enabled: true,
    path: currentConfig.csvFile.filePath,
    format: 'csv',
    encoding: currentConfig.csvFile.encoding || 'utf8',
    polling: false,
    options: {
      delimiter: currentConfig.csvFile.delimiter || ',',
      hasHeaders: currentConfig.csvFile.hasHeaders || false,
      ...currentConfig.csvFile
    }
  };
  
  fileMonitor.on('data', (data) => {
    // Get the configured tank count limit
    const tankCountLimit = currentConfig.tankCount || 12;

    // Limit the tank data to the configured count
    let tanks = data.tanks || [];
    if (tanks.length > tankCountLimit) {
      tanks = tanks.slice(0, tankCountLimit);
      addLog('INFO', 'MONITOR', `Limited tank data from ${data.tanks.length} to ${tankCountLimit} tanks`);
    }

    // Store the limited tank data for API endpoint
    lastTankData = tanks;

    // Broadcast to all WebSocket clients
    broadcastTankData(lastTankData);

    addLog('DEBUG', 'MONITOR', `Broadcasting data for ${tanks.length} tanks (limit: ${tankCountLimit})`);
  });
  
  fileMonitor.on('error', (error) => {
    addLog('ERROR', 'MONITOR', error.message);
  });
  
  // Add the data source and start monitoring
  fileMonitor.addSource(dataSource);
  fileMonitor.start();
  isFileMonitoringActive = true;
  broadcastStatus('connected');
  addLog('INFO', 'MONITOR', `Started monitoring: ${currentConfig.csvFile.filePath}`);
}

// Vertical format monitoring using direct file reading
function startVerticalFormatMonitoring() {

  // Initial load
  loadVerticalFormatFile();

  // Set up file watcher
  const watcher = chokidar.watch(currentConfig.csvFile.filePath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    }
  });

  watcher.on('change', () => {
    addLog('DEBUG', 'MONITOR', 'Vertical format file changed, reloading...');
    loadVerticalFormatFile();
  });

  watcher.on('error', (error) => {
    addLog('ERROR', 'MONITOR', `File watcher error: ${error.message}`);
  });

  // Store watcher for cleanup
  fileMonitor = { watcher, stop: () => watcher.close() };

  addLog('INFO', 'MONITOR', `Started vertical format monitoring: ${currentConfig.csvFile.filePath}`);
}

// Load and parse vertical format file
async function loadVerticalFormatFile() {
  try {
    const fileContent = await fsPromises.readFile(currentConfig.csvFile.filePath, 'utf8');

    // Parse vertical format
    const tanks = parseVerticalFormatData(fileContent, {
      linesPerRecord: currentConfig.csvFile.linesPerRecord || 4,
      lineMapping: currentConfig.csvFile.lineMapping || {},
      maxRecords: currentConfig.csvFile.maxRecords || currentConfig.tankCount || 12
    });

    addLog('INFO', 'MONITOR', `Loaded ${tanks.length} tanks from vertical format file`);

    // Apply tank count limit
    const tankCountLimit = currentConfig.tankCount || 12;
    let limitedTanks = tanks;
    if (tanks.length > tankCountLimit) {
      limitedTanks = tanks.slice(0, tankCountLimit);
      addLog('INFO', 'MONITOR', `Limited tank data from ${tanks.length} to ${tankCountLimit} tanks`);
    }

    // Store and broadcast
    lastTankData = limitedTanks;
    broadcastTankData(limitedTanks);

  } catch (error) {
    addLog('ERROR', 'MONITOR', `Error loading vertical format file: ${error.message}`);
  }
}

export function stopIntegratedServer() {
  return new Promise((resolve) => {
    addLog('INFO', 'SERVER', 'Stopping integrated server...');

    if (fileMonitor) {
      fileMonitor.stop();
      fileMonitor = null;
    }

    if (wss) {
      wss.close(() => {
        addLog('INFO', 'SERVER', 'WebSocket server stopped');
      });
    }

    if (server) {
      server.close(() => {
        addLog('INFO', 'SERVER', 'HTTP server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export function getDebugLogs() {
  return debugLogs;
}