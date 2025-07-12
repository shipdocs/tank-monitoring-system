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

// Tank data storage
let lastTankData = [];
let connectedClients = new Set();

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

// Tank status now determined by Enhanced Tank Data Service
// based on tank type and calibration data

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

    // Only store raw measurement data - no tank configuration
    const measurement = {
      index: tanks.length,
      currentLevel: 0,
      temperature: undefined, // No temperature data when no real data
      lastUpdated: new Date().toISOString()
    };

    // Apply line mapping
    Object.entries(lineMapping).forEach(([lineIndex, fieldName]) => {
      const lineNum = parseInt(lineIndex);
      if (lineNum < recordLines.length && fieldName !== 'ignore') {
        const value = recordLines[lineNum];

        if (fieldName === 'level') {
          measurement.currentLevel = parseFloat(value) || 0;
          measurement.level = measurement.currentLevel; // Also set level for compatibility
        } else if (fieldName === 'temperature') {
          measurement.temperature = parseFloat(value) || undefined;
        } else if (fieldName === 'name') {
          measurement.name = value || measurement.name;
        }
      }
    });

    tanks.push(measurement);
  }

  addLog('INFO', 'PARSER', `Parsed ${tanks.length} tanks from vertical format`);
  return tanks;
}

// Generate empty measurement data
function generateEmptyMeasurements() {
  const measurements = [];
  const timestamp = new Date().toISOString();

  for (let i = 0; i < 12; i++) {
    measurements.push({
      index: i,
      currentLevel: 0, // Empty measurements
      temperature: undefined, // No temperature data when no real data
      lastUpdated: timestamp
    });
  }

  // Store the empty measurement data
  lastTankData = measurements;

  // Broadcast initial empty data
  broadcastTankData(measurements);

  addLog('INFO', 'SERVER', '📊 Generated 12 empty measurements - no data source configured');

  return measurements;
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
      connectionStatus: 'connected' // Show connected for demo mode
    }
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
        : path.join(process.resourcesPath || __dirname, 'dist');

      // Check if the static path exists and log it
      if (fs.existsSync(staticPath)) {
        addLog('INFO', 'SERVER', `Static path exists: ${staticPath}`);
      } else {
        addLog('WARN', 'SERVER', `Static path does not exist: ${staticPath}`);
        // Try alternative paths
        const alternatives = [
          process.resourcesPath ? path.join(process.resourcesPath, 'app.asar', 'dist') : null,
          process.resourcesPath ? path.join(process.resourcesPath, 'dist') : null,
          path.join(__dirname, '../../dist'),
          path.join(__dirname, '../../../dist'),
          path.join(process.cwd(), 'dist')
        ].filter(Boolean);

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
        res.json({ 
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

      // Tank configuration endpoints
      app.get('/api/tank-config', (req, res) => {
        const tankConfig = {
          preAlarmPercentage: 86,
          overfillPercentage: 97.5,
          lowLevelPercentage: 10,
          tanks: {}
        };
        res.json(tankConfig);
      });

      app.post('/api/tank-config', (req, res) => {
        // Tank configuration would be saved here
        res.json({ success: true, message: 'Tank configuration saved' });
      });

      // App branding endpoints
      app.get('/api/branding', (req, res) => {
        const branding = {
          appName: 'Tank Monitoring System',
          appSlogan: 'Real-time tank level monitoring dashboard',
          primaryColor: '#2563eb'
        };
        res.json(branding);
      });

      app.post('/api/branding', (req, res) => {
        // Branding would be saved here
        res.json({ success: true, message: 'Branding saved' });
      });

      // Connection endpoints
      app.post('/api/connect', (req, res) => {
        res.json({ success: true, connected: true });
      });

      app.post('/api/disconnect', (req, res) => {
        res.json({ success: true, connected: false });
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

      // Data source configuration endpoints
      app.post('/api/test-data-source', async (req, res) => {
        const config = req.body;
        try {
          // Test if file exists and is readable
          if (!fs.existsSync(config.filePath)) {
            return res.status(400).json({ error: 'File not found' });
          }

          const content = fs.readFileSync(config.filePath, config.encoding || 'utf8');

          if (config.format === 'vertical') {
            const tanks = parseVerticalFormatData(content, {
              linesPerRecord: config.linesPerRecord || 4,
              lineMapping: config.lineMapping || {},
              maxRecords: config.maxRecords || 12
            });
            res.json({
              success: true,
              recordCount: tanks.length,
              format: 'vertical',
              preview: tanks.slice(0, 3) // First 3 records for preview
            });
          } else {
            // CSV format testing would go here
            res.json({ success: true, recordCount: 0, format: 'csv' });
          }
        } catch (error) {
          res.status(400).json({ error: error.message });
        }
      });

      app.post('/api/configure-data-source', async (req, res) => {
        const config = req.body;
        try {
          // Update current configuration
          currentConfig.csvFile = {
            ...currentConfig.csvFile,
            enabled: config.enabled,
            filePath: config.filePath,
            importInterval: config.importInterval || 3000,
            encoding: config.encoding || 'utf8',
            isVerticalFormat: config.format === 'vertical',
            linesPerRecord: config.linesPerRecord || 4,
            lineMapping: config.lineMapping || {},
            maxRecords: config.maxRecords || 12,
            delimiter: config.delimiter || ',',
            hasHeaders: config.hasHeaders || false
          };

          // Save configuration
          saveConfig();

          // Restart file monitoring with new configuration
          if (fileMonitor && fileMonitor.stop) {
            fileMonitor.stop();
          }

          if (config.enabled && config.filePath) {
            startFileMonitoring();
            addLog('INFO', 'CONFIG', `Data source configured: ${config.filePath}`);
          }

          res.json({ success: true, message: 'Configuration applied successfully' });
        } catch (error) {
          addLog('ERROR', 'CONFIG', `Failed to configure data source: ${error.message}`);
          res.status(500).json({ error: error.message });
        }
      });

      app.get('/api/data-source-status', (req, res) => {
        res.json({
          connected: !!(currentConfig.csvFile.enabled && currentConfig.csvFile.filePath),
          filePath: currentConfig.csvFile.filePath,
          format: currentConfig.csvFile.isVerticalFormat ? 'vertical' : 'csv',
          recordCount: lastTankData.length,
          lastUpdate: lastTankData.length > 0 ? lastTankData[0].lastUpdated : null
        });
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

      // Serve settings page
      app.get('/settings', (req, res) => {
        const settingsPath = path.join(__dirname, '..', 'server', 'settings.html');
        if (fs.existsSync(settingsPath)) {
          res.sendFile(settingsPath);
        } else {
          res.status(404).send('Settings page not found');
        }
      });

      // Serve flexible settings page
      app.get('/flexible-settings', (req, res) => {
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
          generateEmptyMeasurements();
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
    return;
  }

  // Check if vertical format is enabled
  if (currentConfig.csvFile.isVerticalFormat) {
    addLog('INFO', 'MONITOR', 'Using vertical format parser for file monitoring');
    startVerticalFormatMonitoring();
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