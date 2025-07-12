import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import fsSync from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// For Windows compatibility in packaged app - look for modules in parent directories
const require = createRequire(import.meta.url);

// Try to find node_modules in different locations
function findModule(moduleName) {
  const possiblePaths = [
    path.join(__dirname, 'node_modules', moduleName), // server/node_modules
    path.join(__dirname, '..', 'node_modules', moduleName), // app root node_modules
    path.join(__dirname, '..', '..', 'node_modules', moduleName), // parent directory
    path.join(process.resourcesPath || '', '..', 'node_modules', moduleName), // resources parent
  ];

  for (const modulePath of possiblePaths) {
    try {
      require.resolve(modulePath);
      console.log(`Found ${moduleName} at: ${modulePath}`);
      return require(modulePath);
    } catch (e) {
      // Continue searching
    }
  }

  // Fallback to normal require
  try {
    return require(moduleName);
  } catch (e) {
    console.error(`Failed to find module ${moduleName}. Searched paths:`, possiblePaths);
    throw e;
  }
}

// Load dependencies with fallback paths
let express, WebSocketServer, cors, csv, chokidar;

try {
  express = findModule('express');
  WebSocketServer = findModule('ws').WebSocketServer;
  cors = findModule('cors');
  csv = findModule('csv-parser');
  chokidar = findModule('chokidar');
} catch (error) {
  console.error('Failed to load dependencies:', error);
  process.exit(1);
}

// Local imports
import { FlexibleFileMonitor } from './fileMonitor.js';
import { FlexibleFileParser, DataMapper, TANK_FIELDS } from './fileParser.js';

const app = express();
const PORT = 3001;
const WS_PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Determine the correct path for static files
let staticPath;
const isPackaged = process.resourcesPath && __dirname.includes('resources');

if (isPackaged) {
  // In packaged app, frontend files are in app.asar
  staticPath = path.join(process.resourcesPath, 'app.asar', 'dist');
  console.log('Using packaged static path:', staticPath);
} else {
  // In development, use relative path
  staticPath = path.join(__dirname, '../dist');
  console.log('Using development static path:', staticPath);
}

// Check if the static path exists and log it
if (fsSync.existsSync(staticPath)) {
  console.log('Static path exists:', staticPath);
} else {
  console.log('Static path does not exist:', staticPath);
  // Try alternative paths
  const alternatives = [
    path.join(process.resourcesPath || '', 'app.asar', 'dist'),
    path.join(__dirname, '../../dist'),
    path.join(__dirname, '../../../dist'),
    path.join(process.cwd(), 'dist')
  ];

  for (const altPath of alternatives) {
    if (fsSync.existsSync(altPath)) {
      staticPath = altPath;
      console.log('Found alternative static path:', staticPath);
      break;
    }
  }
}

app.use(express.static(staticPath));

// Configuration file path
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Global variables
let lastTankData = [];

// Vertical format parser
function parseVerticalFormatData(fileContent, config) {
  const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const { linesPerRecord, lineMapping, maxRecords } = config;
  const tanks = [];

  console.log(`Parsing vertical format: ${lines.length} lines, ${linesPerRecord} lines per record`);

  for (let i = 0; i < lines.length; i += linesPerRecord) {
    if (maxRecords > 0 && tanks.length >= maxRecords) break;

    const recordLines = lines.slice(i, i + linesPerRecord);
    if (recordLines.length < linesPerRecord) break;

    // Only extract raw measurement data - no tank configuration
    const rawMeasurement = {
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
          rawMeasurement.currentLevel = parseFloat(value) || 0;
        } else if (fieldName === 'temperature') {
          rawMeasurement.temperature = parseFloat(value) || 0;
        }
      }
    });

    tanks.push(rawMeasurement);
  }

  console.log(`Parsed ${tanks.length} raw measurements from vertical format`);
  return tanks;
}

// Default configuration
const DEFAULT_CONFIG = {
  selectedPort: null,
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  autoConnect: false,
  tankCount: 12,
  dataFormat: 'csv', // csv, json, custom, flexible
  customParser: null,

  // Flexible File Import Settings
  dataSources: [
    {
      id: 'default',
      type: 'file', // file, directory, url
      enabled: false,
      path: '',
      format: 'auto', // auto, csv, json, xml, txt, fixed-width, tsv
      encoding: 'utf8',
      polling: false,
      pollInterval: 30000,
      options: {
        autoDetectDelimiter: true,
        autoDetectHeaders: true,
        skipEmptyLines: true,
        trimValues: true,
        delimiter: ',',
        extensions: ['.csv', '.json', '.txt', '.xml', '.tsv']
      },
      mapping: {
        id: 'tank_id',
        name: 'tank_name',
        level: 'level',
        maxCapacity: 'max_capacity',
        minLevel: 'min_level',
        maxLevel: 'max_level',
        temperature: 'temperature',
        pressure: 'pressure',
        humidity: 'humidity',
        status: 'status',
        unit: 'unit',
        location: 'location',
        type: 'type'
      },
      autoDiscoverColumns: true
    }
  ],

  // Legacy CSV File Import (for backward compatibility)
  csvFile: {
    enabled: false,
    filePath: '',
    importInterval: 30000,
    hasHeaders: true,
    delimiter: ',',
    encoding: 'utf8',
    columnMapping: {
      id: 'tank_id',
      name: 'tank_name',
      level: 'level',
      maxCapacity: 'max_capacity',
      minLevel: 'min_level',
      maxLevel: 'max_level',
      unit: 'unit',
      location: 'location'
    }
  }
};

// Global state
let currentConfig = { ...DEFAULT_CONFIG };
let serialPort = null;
let parser = null;
let wsServer = null;
let connectedClients = new Set();
let fileMonitor = null;
let flexibleParser = new FlexibleFileParser();
let SerialPort = null;
let ReadlineParser = null;
// CSV File Import state
let csvFileWatcher = null;
let csvImportInterval = null;
let lastCsvData = [];
let discoveredColumns = [];

// Try to load SerialPort modules (will fail in WebContainer)
async function initializeSerialPort() {
  try {
    const serialportModule = await import('serialport');
    const parserModule = await import('@serialport/parser-readline');
    SerialPort = serialportModule.SerialPort;
    ReadlineParser = parserModule.ReadlineParser;
    console.log('SerialPort modules loaded successfully');
    return true;
  } catch (error) {
    console.log('SerialPort not available in this environment (WebContainer)');
    console.log('Running in demo mode with simulated data');
    return false;
  }
}

// Load configuration
async function loadConfig() {
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf8');
    const loadedConfig = JSON.parse(configData);

    // Deep merge to ensure all default values are present
    currentConfig = {
      ...DEFAULT_CONFIG,
      ...loadedConfig,
      csvFile: {
        ...DEFAULT_CONFIG.csvFile,
        ...(loadedConfig.csvFile || {}),
        columnMapping: {
          ...DEFAULT_CONFIG.csvFile.columnMapping,
          ...(loadedConfig.csvFile?.columnMapping || {})
        }
      }
    };

    console.log('Configuration loaded:', currentConfig);
  } catch (error) {
    console.log('No config file found, using defaults');
    currentConfig = { ...DEFAULT_CONFIG };
    await saveConfig();
  }
}

// Save configuration
async function saveConfig() {
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
    console.log('Configuration saved');
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

// Discover available COM ports
async function discoverPorts() {
  if (!SerialPort) {
    throw new Error('SerialPort not available in this environment');
  }

  try {
    const ports = await SerialPort.list();
    return ports.map(port => ({
      path: port.path,
      manufacturer: port.manufacturer || 'Unknown',
      serialNumber: port.serialNumber || 'N/A',
      vendorId: port.vendorId || 'N/A',
      productId: port.productId || 'N/A',
      friendlyName: port.friendlyName || port.path
    }));
  } catch (error) {
    console.error('Error discovering ports:', error);
    return [];
  }
}

// Parse tank data from serial input
function parseTankData(data) {
  try {
    const timestamp = new Date();
    
    if (currentConfig.dataFormat === 'json') {
      // Expect JSON format: {"tanks": [{"id": 1, "level": 123.4}, ...]}
      const parsed = JSON.parse(data);
      return parsed.tanks?.map((tank, index) => {
        return {
          index: index,
          currentLevel: parseFloat(tank.level) || 0,
          temperature: tank.temperature ? parseFloat(tank.temperature) : undefined,
          lastUpdated: timestamp
        };
      }) || [];
    } else {
      // Default CSV format: "123.4,234.5,345.6,..." (12 values)
      const values = data.trim().split(',').map(v => parseFloat(v.trim()) || 0);
      return values.slice(0, currentConfig.tankCount).map((level, index) => {
        return {
          index: index,
          currentLevel: level,
          temperature: undefined, // No temperature data when no real data
          lastUpdated: timestamp
        };
      });
    }
  } catch (error) {
    console.error('Error parsing tank data:', error);
    return [];
  }
}



// Tank status now determined by Enhanced Tank Data Service
// based on tank type and calibration data

// Auto-discover CSV columns and suggest mappings
async function discoverCsvColumns(filePath) {
  return new Promise((resolve, reject) => {
    let isFirstRow = true;
    let headers = [];

    createReadStream(filePath)
      .pipe(csv({
        separator: currentConfig.csvFile.delimiter,
        headers: currentConfig.csvFile.hasHeaders,
        skipEmptyLines: true
      }))
      .on('headers', (csvHeaders) => {
        headers = csvHeaders;
        discoveredColumns = csvHeaders;
        console.log('Discovered CSV columns via headers event:', csvHeaders);

        // Auto-suggest column mappings
        const suggestedMapping = suggestColumnMapping(csvHeaders);
        if (currentConfig.csvFile.autoDiscoverColumns) {
          currentConfig.csvFile.columnMapping = { ...currentConfig.csvFile.columnMapping, ...suggestedMapping };
          console.log('Auto-suggested column mapping:', suggestedMapping);
        }

        resolve(csvHeaders);
      })
      .on('data', (data) => {
        if (isFirstRow) {
          if (!currentConfig.csvFile.hasHeaders) {
            // For headerless CSV, use the keys from the first data row
            headers = Object.keys(data);
            discoveredColumns = headers;
            console.log('Discovered CSV columns (no headers):', headers);

            // Auto-suggest mappings for headerless CSV
            const suggestedMapping = suggestColumnMapping(headers);
            if (currentConfig.csvFile.autoDiscoverColumns) {
              currentConfig.csvFile.columnMapping = { ...currentConfig.csvFile.columnMapping, ...suggestedMapping };
            }

            resolve(headers);
          } else if (headers.length === 0) {
            // Fallback: if headers event didn't fire but we have headers enabled
            headers = Object.keys(data);
            discoveredColumns = headers;
            console.log('Discovered CSV columns via first data row:', headers);

            const suggestedMapping = suggestColumnMapping(headers);
            if (currentConfig.csvFile.autoDiscoverColumns) {
              currentConfig.csvFile.columnMapping = { ...currentConfig.csvFile.columnMapping, ...suggestedMapping };
            }

            resolve(headers);
          }
          isFirstRow = false;
        }
      })
      .on('error', (error) => {
        console.error('Error discovering CSV columns:', error);
        reject(error);
      })
      .on('end', () => {
        if (headers.length === 0) {
          reject(new Error('No columns discovered from CSV file'));
        }
      });
  });
}

// Suggest column mappings based on column names
function suggestColumnMapping(columns) {
  const mapping = {};

  // Define patterns for each field
  const patterns = {
    id: /^(id|tank_?id|tank_?number|number|index)$/i,
    name: /^(name|tank_?name|label|title|description)$/i,
    level: /^(level|current_?level|value|amount|quantity|volume)$/i,
    maxCapacity: /^(max_?capacity|capacity|max_?volume|total_?capacity)$/i,
    minLevel: /^(min_?level|minimum|min_?value|low_?limit)$/i,
    maxLevel: /^(max_?level|maximum|max_?value|high_?limit)$/i,
    unit: /^(unit|units|measurement|uom)$/i,
    location: /^(location|zone|area|position|site)$/i
  };

  // Try to match each column to a field
  columns.forEach(column => {
    for (const [field, pattern] of Object.entries(patterns)) {
      if (pattern.test(column)) {
        mapping[field] = column;
        break;
      }
    }
  });

  console.log('Suggested column mapping:', mapping);
  return mapping;
}

// Read and parse CSV file
async function readCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    createReadStream(filePath)
      .pipe(csv({
        separator: currentConfig.csvFile.delimiter,
        headers: currentConfig.csvFile.hasHeaders,
        skipEmptyLines: true
      }))
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', () => {
        console.log(`CSV file read successfully: ${results.length} rows`);
        resolve(results);
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });
  });
}

// Convert CSV data to tank format
function convertCsvToTanks(csvData) {
  const mapping = currentConfig.csvFile.columnMapping;
  const timestamp = new Date();

  return csvData.map((row, index) => {
    // Get values using column mapping - throw error if required fields missing
    const id = row[mapping.id];
    const name = row[mapping.name];
    const level = parseFloat(row[mapping.level]);

    if (!id || !name || isNaN(level)) {
      throw new Error(`Missing required data in row ${index + 1}: id=${id}, name=${name}, level=${level}`);
    }

    const maxCapacity = parseFloat(row[mapping.maxCapacity]) || 1000;
    const minLevel = parseFloat(row[mapping.minLevel]) || 50;
    const maxLevel = parseFloat(row[mapping.maxLevel]) || 950;
    const unit = row[mapping.unit] || 'L';
    const location = row[mapping.location] || '';

    return {
      id: parseInt(id),
      name,
      currentLevel: level,
      maxCapacity,
      minLevel,
      maxLevel,
      unit,
      status: getStatus(level),
      lastUpdated: timestamp,
      location
    };
  });
}

// Import CSV file data
async function importCsvData() {
  if (!currentConfig.csvFile.enabled || !currentConfig.csvFile.filePath) {
    return;
  }

  try {
    // Check if file exists
    await fs.access(currentConfig.csvFile.filePath);

    // Check if vertical format
    if (currentConfig.csvFile.isVerticalFormat) {
      console.log('Using vertical format parser...');

      // Read file as text for vertical parsing
      const fileContent = await fs.readFile(currentConfig.csvFile.filePath, 'utf8');

      // Parse vertical format directly
      const tanks = parseVerticalFormatData(fileContent, {
        linesPerRecord: currentConfig.csvFile.linesPerRecord || 4,
        lineMapping: currentConfig.csvFile.lineMapping || {},
        autoDetectDataEnd: currentConfig.csvFile.autoDetectDataEnd !== false,
        skipOutliers: currentConfig.csvFile.skipOutliers !== false,
        maxRecords: currentConfig.csvFile.maxRecords || 0,
        temperatureRange: currentConfig.csvFile.temperatureRange || { min: 0, max: 50 }
      });

      console.log(`Parsed ${tanks.length} tanks using vertical format`);

      // Store last data and broadcast
      lastTankData = tanks;
      broadcastTankData(tanks);
      return;
    }

    // Fallback to horizontal CSV parsing
    const csvData = await readCsvFile(currentConfig.csvFile.filePath);

    if (csvData.length === 0) {
      console.log('CSV file is empty');
      return;
    }

    // Convert to tank format
    const tanks = convertCsvToTanks(csvData);

    // Store last data and broadcast
    lastCsvData = tanks;
    broadcastTankData(tanks);

    console.log(`Imported ${tanks.length} tanks from CSV file`);

  } catch (error) {
    console.error('Error importing CSV data:', error);
    broadcastStatus('error');
  }
}

// Connect to data source (serial port or CSV file)
async function connectDataSource() {
  // Check if CSV file mode is enabled
  if (currentConfig.dataFormat === 'csvfile' || currentConfig.csvFile.enabled) {
    console.log('Starting CSV file monitoring mode');
    return await startCsvFileMonitoring();
  }

  // Serial port mode
  if (!SerialPort) {
    console.log('SerialPort not available, generating empty tanks');
    generateEmptyMeasurements();
    return true;
  }

  if (!currentConfig.selectedPort) {
    console.log('No port selected');
    return false;
  }

  try {
    if (serialPort && serialPort.isOpen) {
      serialPort.close();
    }

    serialPort = new SerialPort({
      path: currentConfig.selectedPort,
      baudRate: currentConfig.baudRate,
      dataBits: currentConfig.dataBits,
      stopBits: currentConfig.stopBits,
      parity: currentConfig.parity
    });

    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    serialPort.on('open', () => {
      console.log(`Serial port ${currentConfig.selectedPort} opened`);
      broadcastStatus('connected');
    });

    serialPort.on('error', (error) => {
      console.error('Serial port error:', error);
      broadcastStatus('error');
    });

    serialPort.on('close', () => {
      console.log('Serial port closed');
      broadcastStatus('disconnected');
    });

    parser.on('data', (data) => {
      console.log('Received data:', data);
      const tanks = parseTankData(data);
      if (tanks.length > 0) {
        broadcastTankData(tanks);
      }
    });

    return true;
  } catch (error) {
    console.error('Error connecting to serial port:', error);
    return false;
  }
}

// Start CSV file monitoring
async function startCsvFileMonitoring() {
  if (!currentConfig.csvFile.enabled || !currentConfig.csvFile.filePath) {
    console.log('CSV file monitoring not enabled or no file path specified');
    return false;
  }

  try {
    // Stop existing monitoring
    stopCsvFileMonitoring();

    // Check if file exists
    await fs.access(currentConfig.csvFile.filePath);

    // Auto-discover columns if enabled
    if (currentConfig.csvFile.autoDiscoverColumns) {
      try {
        await discoverCsvColumns(currentConfig.csvFile.filePath);
      } catch (error) {
        console.error('Error discovering columns:', error);
      }
    }

    // Initial import
    await importCsvData();

    // Set up file watcher
    csvFileWatcher = chokidar.watch(currentConfig.csvFile.filePath, {
      persistent: true,
      ignoreInitial: true
    });

    csvFileWatcher.on('change', () => {
      console.log('CSV file changed, reimporting data...');
      importCsvData();
    });

    csvFileWatcher.on('error', (error) => {
      console.error('CSV file watcher error:', error);
    });

    // Set up periodic import
    csvImportInterval = setInterval(() => {
      importCsvData();
    }, currentConfig.csvFile.importInterval);

    console.log(`CSV file monitoring started: ${currentConfig.csvFile.filePath}`);
    console.log(`Import interval: ${currentConfig.csvFile.importInterval}ms`);
    broadcastStatus('connected');

    return true;

  } catch (error) {
    console.error('Error starting CSV file monitoring:', error);
    broadcastStatus('error');
    return false;
  }
}

// Stop CSV file monitoring
function stopCsvFileMonitoring() {
  if (csvFileWatcher) {
    csvFileWatcher.close();
    csvFileWatcher = null;
    console.log('CSV file watcher stopped');
  }

  if (csvImportInterval) {
    clearInterval(csvImportInterval);
    csvImportInterval = null;
    console.log('CSV import interval stopped');
  }
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

  console.log('📊 Generated 12 empty measurements - no data source configured');

  return measurements;
}

// Disconnect data source
function disconnectDataSource() {
  // Stop CSV monitoring
  stopCsvFileMonitoring();

  // Stop serial port
  if (serialPort && serialPort.isOpen) {
    serialPort.close();
  }
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
      connectionStatus: SerialPort && serialPort?.isOpen ? 'connected' : 'connected' // Show connected for demo mode
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

// API Routes
app.get('/api/ports', async (req, res) => {
  const ports = await discoverPorts();
  res.json(ports);
});

app.get('/api/config', (req, res) => {
  res.json(currentConfig);
});

// Tank data endpoint - returns raw measurements
app.get('/api/tanks', (req, res) => {
  if (lastTankData && lastTankData.length > 0) {
    // Ensure we return raw measurement format
    const rawMeasurements = lastTankData.map((data, index) => ({
      index: data.index !== undefined ? data.index : index,
      currentLevel: data.currentLevel || data.level || 0,
      temperature: data.temperature || undefined,
      lastUpdated: data.lastUpdated || new Date().toISOString()
    }));
    res.json(rawMeasurements);
  } else {
    res.status(503).json({
      error: 'No tank data available',
      message: 'Data source not connected or no data received yet'
    });
  }
});

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

// API endpoint to get tank configuration
app.get('/api/tank-config', (req, res) => {
  res.json(tankConfiguration);
});

// API endpoint to save tank configuration
app.post('/api/tank-config', (req, res) => {
  try {
    tankConfiguration = { ...tankConfiguration, ...req.body };
    console.log('Tank configuration updated:', tankConfiguration);
    res.json({ success: true, message: 'Tank configuration saved' });
  } catch (error) {
    console.error('Failed to save tank configuration:', error);
    res.status(500).json({ success: false, message: 'Failed to save configuration' });
  }
});

// API endpoint to get app branding
app.get('/api/branding', (req, res) => {
  res.json(appBranding);
});

// API endpoint to save app branding
app.post('/api/branding', (req, res) => {
  try {
    appBranding = { ...appBranding, ...req.body };
    console.log('App branding updated:', appBranding);
    res.json({ success: true, message: 'App branding saved' });
  } catch (error) {
    console.error('Failed to save app branding:', error);
    res.status(500).json({ success: false, message: 'Failed to save branding' });
  }
});

app.post('/api/config', async (req, res) => {
  // Deep merge CSV file configuration to preserve existing settings
  const newConfig = { ...currentConfig, ...req.body };
  if (req.body.csvFile) {
    newConfig.csvFile = {
      ...currentConfig.csvFile,
      ...req.body.csvFile,
      columnMapping: {
        ...currentConfig.csvFile.columnMapping,
        ...(req.body.csvFile.columnMapping || {})
      }
    };
  }

  // If port or CSV settings changed, disconnect current connection
  if (newConfig.selectedPort !== currentConfig.selectedPort ||
      newConfig.csvFile?.enabled !== currentConfig.csvFile?.enabled ||
      newConfig.csvFile?.filePath !== currentConfig.csvFile?.filePath) {
    disconnectDataSource();
  }

  currentConfig = newConfig;
  await saveConfig();

  res.json({ success: true, config: currentConfig });
});

app.post('/api/connect', async (req, res) => {
  const success = await connectDataSource();
  const isConnected = currentConfig.csvFile.enabled ?
    (csvFileWatcher !== null || csvImportInterval !== null) :
    (SerialPort ? (serialPort?.isOpen || false) : true);
  res.json({ success, connected: isConnected });
});

app.post('/api/disconnect', (req, res) => {
  disconnectDataSource();
  res.json({ success: true, connected: false });
});

// CSV file specific endpoints
app.get('/api/csv/columns', async (req, res) => {
  if (!currentConfig.csvFile.filePath) {
    return res.status(400).json({ error: 'No CSV file path configured' });
  }

  try {
    await fs.access(currentConfig.csvFile.filePath);
    const columns = await discoverCsvColumns(currentConfig.csvFile.filePath);
    res.json({ columns, discovered: discoveredColumns });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/csv/test-import', async (req, res) => {
  if (!currentConfig.csvFile.filePath) {
    return res.status(400).json({ error: 'No CSV file path configured' });
  }

  try {
    await fs.access(currentConfig.csvFile.filePath);
    const csvData = await readCsvFile(currentConfig.csvFile.filePath);
    const tanks = convertCsvToTanks(csvData.slice(0, 5)); // Preview first 5 rows
    res.json({
      success: true,
      preview: tanks,
      totalRows: csvData.length,
      columns: discoveredColumns
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/csv/validate-file', async (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }

  try {
    await fs.access(filePath);
    const columns = await discoverCsvColumns(filePath);
    res.json({
      valid: true,
      exists: true,
      columns,
      message: 'File is accessible and readable'
    });
  } catch (error) {
    res.status(400).json({
      valid: false,
      exists: false,
      error: error.message
    });
  }
});

// File browser endpoint
app.get('/api/flexible/browse', (req, res) => {
    const requestedPath = req.query.path || process.cwd();

    try {
        // Security check - only allow browsing within project directory
        const projectRoot = process.cwd();
        const resolvedPath = path.resolve(requestedPath);

        if (!resolvedPath.startsWith(projectRoot)) {
            return res.json({ error: 'Access denied: Path outside project directory' });
        }

        if (!fsSync.existsSync(resolvedPath)) {
            return res.json({ error: 'Directory does not exist' });
        }

        const stats = fsSync.statSync(resolvedPath);
        if (!stats.isDirectory()) {
            return res.json({ error: 'Path is not a directory' });
        }

        const items = fsSync.readdirSync(resolvedPath);
        const directories = [];
        const files = [];

        items.forEach(item => {
            const itemPath = path.join(resolvedPath, item);
            try {
                const itemStats = fsSync.statSync(itemPath);
                if (itemStats.isDirectory()) {
                    directories.push(item);
                } else if (itemStats.isFile()) {
                    files.push(item);
                }
            } catch (err) {
                // Skip items we can't read
            }
        });

        res.json({
            path: resolvedPath,
            directories: directories.sort(),
            files: files.sort()
        });

    } catch (error) {
        res.json({ error: error.message });
    }
});

// Flexible File System API endpoints
app.get('/api/flexible/sources', (req, res) => {
  if (!fileMonitor) {
    return res.json([]);
  }
  res.json(fileMonitor.getSourceInfo());
});

app.post('/api/flexible/sources', async (req, res) => {
  try {
    if (!fileMonitor) {
      fileMonitor = new FlexibleFileMonitor();
      setupFileMonitor();
    }

    const source = fileMonitor.addSource(req.body);
    res.json({ success: true, source });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/flexible/sources/:id', (req, res) => {
  if (!fileMonitor) {
    return res.status(404).json({ error: 'No file monitor active' });
  }

  const success = fileMonitor.removeSource(req.params.id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Source not found' });
  }
});

app.get('/api/flexible/validate', async (req, res) => {
  const { path: filePath, format } = req.query;

  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }

  try {
    const result = await flexibleParser.parseFile(filePath, format || null);
    const suggestedMapping = DataMapper.suggestMapping(result.columns);

    res.json({
      success: true,
      format: result.format || 'detected',
      columns: result.columns,
      sampleData: result.data.slice(0, 5),
      suggestedMapping,
      totalRows: result.data.length
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
      details: error.stack
    });
  }
});

app.get('/api/flexible/fields', (req, res) => {
  res.json(TANK_FIELDS);
});

app.post('/api/flexible/test-mapping', async (req, res) => {
  const { path: filePath, format, mapping } = req.body;

  if (!filePath || !mapping) {
    return res.status(400).json({ error: 'File path and mapping are required' });
  }

  try {
    const result = await flexibleParser.parseFile(filePath, format || null);
    const mapper = new DataMapper(mapping);
    const tanks = mapper.mapData(result.data.slice(0, 10), result.columns);

    res.json({
      success: true,
      sampleTanks: tanks,
      totalRows: result.data.length
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

app.get('/api/status', (req, res) => {
  const isConnected = currentConfig.csvFile.enabled ?
    (csvFileWatcher !== null || csvImportInterval !== null) :
    (SerialPort ? (serialPort?.isOpen || false) : true);

  const flexibleSourcesActive = fileMonitor ? fileMonitor.getSourceInfo().filter(s => s.lastUpdate).length : 0;

  res.json({
    connected: isConnected,
    selectedPort: currentConfig.selectedPort,
    csvFileEnabled: currentConfig.csvFile.enabled,
    csvFilePath: currentConfig.csvFile.filePath,
    dataSource: currentConfig.csvFile.enabled ? 'csvfile' : 'serial',
    lastSync: new Date().toISOString()
  });
});

// Serve settings page
app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'settings.html'));
});

// Serve flexible settings page
app.get('/flexible-settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'flexible-settings.html'));
});

// Fallback to main app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// File Monitor Setup
function setupFileMonitor() {
  if (!fileMonitor) {
    fileMonitor = new FlexibleFileMonitor();
  }

  fileMonitor.on('data', (event) => {
    console.log(`Received data from source ${event.source}: ${event.tanks.length} tanks`);

    // Get the configured tank count limit
    const tankCountLimit = currentConfig.tankCount || 12;

    // Limit the tank data to the configured count
    let tanks = event.tanks || [];
    if (tanks.length > tankCountLimit) {
      tanks = tanks.slice(0, tankCountLimit);
      console.log(`Limited tank data from ${event.tanks.length} to ${tankCountLimit} tanks`);
    }

    // Store the limited tank data
    lastTankData = tanks;

    // Broadcast to WebSocket clients
    const message = JSON.stringify({
      type: 'tankData',
      data: tanks,
      source: event.source,
      timestamp: new Date().toISOString()
    });

    connectedClients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  });

  fileMonitor.on('error', (event) => {
    console.error(`File monitor error for source ${event.source}:`, event.error);

    // Broadcast error to WebSocket clients
    const message = JSON.stringify({
      type: 'error',
      source: event.source,
      error: event.error.message,
      timestamp: new Date().toISOString()
    });

    connectedClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  });

  // Start monitoring configured sources
  if (currentConfig.dataSources) {
    currentConfig.dataSources.forEach(sourceConfig => {
      if (sourceConfig.enabled) {
        fileMonitor.addSource(sourceConfig);
      }
    });
  }

  fileMonitor.start();
}

// WebSocket Server
function setupWebSocket() {
  wsServer = new WebSocketServer({ port: WS_PORT });
  
  wsServer.on('connection', (ws) => {
    console.log('WebSocket client connected');
    connectedClients.add(ws);
    
    // Send current status
    ws.send(JSON.stringify({
      type: 'status',
      data: {
        connectionStatus: SerialPort ? (serialPort?.isOpen ? 'connected' : 'disconnected') : 'connected',
        lastSync: new Date().toISOString()
      }
    }));
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      connectedClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });
  
  console.log(`WebSocket server running on port ${WS_PORT}`);
}

// Initialize server
async function init() {
  await initializeSerialPort();
  await loadConfig();
  setupWebSocket();
  setupFileMonitor();
  
  app.listen(PORT, () => {
    console.log(`Bridge service running on port ${PORT}`);
    console.log(`Settings page: http://localhost:${PORT}/settings`);
    console.log(`Main dashboard: http://localhost:${PORT}`);
    
    if (!SerialPort) {
      console.log('Running in DEMO MODE - SerialPort not available in WebContainer');
    }
  });
  
  // Auto-connect if configured or start demo mode
  if (currentConfig.csvFile.enabled && currentConfig.csvFile.filePath) {
    setTimeout(() => {
      startCsvFileMonitoring();
    }, 1000);
  } else if (!SerialPort) {
    setTimeout(() => {
      generateEmptyMeasurements();
    }, 1000);
  } else if (currentConfig.autoConnect && currentConfig.selectedPort) {
    setTimeout(() => {
      connectDataSource();
    }, 2000);
  }
}

init().catch(console.error);