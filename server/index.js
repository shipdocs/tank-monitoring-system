import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import logger
import logger, {
  auditLog,
  createModuleLogger,
  logError,
  logPerformance,
  logShutdown,
  logStartup,
  logTankData,
  requestLogger,
} from './logger.js';

// Create module logger
const moduleLogger = createModuleLogger('main-server');

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
      moduleLogger.debug(`Found ${moduleName} at: ${modulePath}`);
      return require(modulePath);
    } catch (_e) {
      // Continue searching
    }
  }

  // Fallback to normal require
  try {
    return require(moduleName);
  } catch (_e) {
    moduleLogger.error(`Failed to find module ${moduleName}`, { searchedPaths: possiblePaths });
    throw _e;
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
  logError(error, { context: 'Failed to load dependencies' });
  process.exit(1);
}

// Local imports
import { FlexibleFileMonitor } from './fileMonitor.js';
import { DataMapper, FlexibleFileParser, TANK_FIELDS } from './fileParser.js';
import { authenticate } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import { joi, validate, validateParams, validationErrorHandler } from './middleware/validation.js';
import {
  sourceIdParamSchema,
} from './validation/schemas.js';
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
const PORT = 3001;
const WS_PORT = 3002;

// Middleware
app.use(cors());

// Security headers middleware
const securityHeaders = () => (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

app.use(securityHeaders());

// Enhanced JSON parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Content type validation middleware
const validateContentType = (allowedTypes) => (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type');
    if (contentType && !allowedTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({ error: 'Unsupported Media Type' });
    }
  }
  next();
};

app.use(validateContentType(['application/json', 'application/x-www-form-urlencoded']));

// Automation detection middleware
const detectAutomation = () => (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const isBot = /bot|crawler|spider|scraper/i.test(userAgent);
  req.isBot = isBot;
  next();
};

app.use(detectAutomation());

// Add request logging middleware
app.use(requestLogger);

// Add IP banning middleware (before rate limiters)
app.use(banAbusiveIPs);

// Authentication routes (before auth middleware)
app.use('/api/auth', authLimiter, authRoutes);

// Apply authentication middleware to all routes
app.use(authenticate);

// Validation error handler
app.use(validationErrorHandler());

// Determine the correct path for static files
let staticPath;
const isPackaged = process.resourcesPath && __dirname.includes('resources');

if (isPackaged) {
  // In packaged app, frontend files are in app.asar
  staticPath = path.join(process.resourcesPath, 'app.asar', 'dist');
  moduleLogger.info('Using packaged static path', { staticPath });
} else {
  // In development, use relative path
  staticPath = path.join(__dirname, '../dist');
  moduleLogger.info('Using development static path', { staticPath });
}

// Check if the static path exists and log it
async function findStaticPath() {
  try {
    await fs.access(staticPath);
    moduleLogger.debug('Static path exists', { staticPath });
    return staticPath;
  } catch {
    moduleLogger.warn('Static path does not exist', { staticPath });
    // Try alternative paths
    const alternatives = [
      path.join(process.resourcesPath || '', 'app.asar', 'dist'),
      path.join(__dirname, '../../dist'),
      path.join(__dirname, '../../../dist'),
      path.join(process.cwd(), 'dist'),
    ];

    for (const altPath of alternatives) {
      try {
        await fs.access(altPath);
        staticPath = altPath;
        moduleLogger.info('Found alternative static path', { staticPath: altPath });
        return staticPath;
      } catch {
        // Continue to next alternative
      }
    }
  }
  return staticPath;
}

// Static path will be set during initialization

// Configuration file path
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Global variables
let lastTankData = [];

// Create module loggers for different components
const csvLogger = createModuleLogger('csv-parser');
const serialLogger = createModuleLogger('serial-port');
const wsLogger = createModuleLogger('websocket');
const fileMonitorLogger = createModuleLogger('file-monitor');

// Vertical format parser
function parseVerticalFormatData(fileContent, config) {
  const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const { linesPerRecord, lineMapping, maxRecords } = config;
  const tanks = [];

  csvLogger.debug('Parsing vertical format', {
    totalLines: lines.length,
    linesPerRecord,
    maxRecords,
  });

  for (let i = 0; i < lines.length; i += linesPerRecord) {
    if (maxRecords > 0 && tanks.length >= maxRecords) break;

    const recordLines = lines.slice(i, i + linesPerRecord);
    if (recordLines.length < linesPerRecord) break;

    const tank = {
      id: tanks.length + 1,
      name: `Tank ${tanks.length + 1}`,
      currentLevel: 0,
      maxCapacity: 1000,
      minLevel: 50,
      maxLevel: 950,
      unit: 'L',
      status: 'normal',
      lastUpdated: new Date().toISOString(),
      location: `Position ${tanks.length + 1}`,
    };

    // Apply line mapping
    Object.entries(lineMapping).forEach(([lineIndex, fieldName]) => {
      const lineNum = parseInt(lineIndex);
      if (lineNum < recordLines.length && fieldName !== 'ignore') {
        const value = recordLines[lineNum];

        if (fieldName === 'level') {
          tank.currentLevel = parseFloat(value) || 0;
        } else if (fieldName === 'temperature') {
          tank.temperature = parseFloat(value) || 0;
        } else if (fieldName === 'name') {
          tank.name = value || tank.name;
        }
      }
    });

    tanks.push(tank);
  }

  csvLogger.info('Parsed tanks from vertical format', { tankCount: tanks.length });
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
        extensions: ['.csv', '.json', '.txt', '.xml', '.tsv'],
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
        type: 'type',
      },
      autoDiscoverColumns: true,
    },
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
      location: 'location',
    },
  },
};

// Global state
let currentConfig = { ...DEFAULT_CONFIG };
let serialPort = null;
let parser = null;
let wsServer = null;
const connectedClients = new Set();
let fileMonitor = null;
const flexibleParser = new FlexibleFileParser();
let SerialPort = null;
let ReadlineParser = null;
// CSV File Import state
let csvFileWatcher = null;
let csvImportInterval = null;
let _lastCsvData = [];
let discoveredColumns = [];

// Try to load SerialPort modules (will fail in WebContainer)
async function initializeSerialPort() {
  try {
    const serialportModule = await import('serialport');
    const parserModule = await import('@serialport/parser-readline');
    SerialPort = serialportModule.SerialPort;
    ReadlineParser = parserModule.ReadlineParser;
    serialLogger.info('SerialPort modules loaded successfully');
    return true;
  } catch (_error) {
    moduleLogger.info('SerialPort not available in this environment (WebContainer)');
    moduleLogger.info('Running in demo mode with simulated data');
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
          ...(loadedConfig.csvFile?.columnMapping || {}),
        },
      },
    };

    moduleLogger.info('Configuration loaded', { configFile: CONFIG_FILE });
  } catch (_error) {
    moduleLogger.info('No config file found, using defaults');
    currentConfig = { ...DEFAULT_CONFIG };
    await saveConfig();
  }
}

// Save configuration
async function saveConfig() {
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
    moduleLogger.debug('Configuration saved', { configFile: CONFIG_FILE });
  } catch (error) {
    logError(error, { context: 'Error saving config' });
  }
}

// Discover available COM ports
async function discoverPorts() {
  if (!SerialPort) {
    throw new Error('SerialPort not available in this environment');
  }

  try {
    const ports = await SerialPort.list();
    serialLogger.debug('Discovered serial ports', { portCount: ports.length });
    return ports.map(port => ({
      path: port.path,
      manufacturer: port.manufacturer || 'Unknown',
      serialNumber: port.serialNumber || 'N/A',
      vendorId: port.vendorId || 'N/A',
      productId: port.productId || 'N/A',
      friendlyName: port.friendlyName || port.path,
    }));
  } catch (error) {
    logError(error, { context: 'Error discovering ports' });
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
      return parsed.tanks?.map(tank => {
        const tankId = tank.id;
        const group = tankId >= 1 && tankId <= 6 ? 'BB' :
          tankId >= 7 && tankId <= 12 ? 'SB' : 'CENTER';

        return {
          id: tankId,
          name: `Tank ${String.fromCharCode(64 + tankId)}`,
          currentLevel: parseFloat(tank.level) || 0,
          maxCapacity: 1000,
          minLevel: 50,
          maxLevel: 950,
          unit: 'L',
          status: getStatus(parseFloat(tank.level) || 0),
          lastUpdated: timestamp,
          location: `Zone ${Math.floor((tankId - 1) / 3) + 1}-${((tankId - 1) % 3) + 1}`,
          group,
        };
      }) || [];
    } else {
      // Default CSV format: "123.4,234.5,345.6,..." (12 values)
      const values = data.trim().split(',').map(v => parseFloat(v.trim()) || 0);
      return values.slice(0, currentConfig.tankCount).map((level, index) => {
        const tankId = index + 1;
        const group = tankId >= 1 && tankId <= 6 ? 'BB' :
          tankId >= 7 && tankId <= 12 ? 'SB' : 'CENTER';

        return {
          id: tankId,
          name: `Tank ${String.fromCharCode(65 + index)}`,
          currentLevel: level,
          maxCapacity: 1000,
          minLevel: 50,
          maxLevel: 950,
          unit: 'L',
          status: getStatus(level),
          lastUpdated: timestamp,
          location: `Zone ${Math.floor(index / 3) + 1}-${(index % 3) + 1}`,
          group,
        };
      });
    }
  } catch (error) {
    logError(error, { context: 'Error parsing tank data', data });
    return [];
  }
}


// Determine tank status based on level
function getStatus(level) {
  if (level < 25) return 'critical';
  if (level < 50) return 'low';
  if (level > 950) return 'high';
  return 'normal';
}

// Auto-discover CSV columns and suggest mappings
async function discoverCsvColumns(filePath) {
  return new Promise((resolve, reject) => {
    let isFirstRow = true;
    let headers = [];

    createReadStream(filePath)
      .pipe(csv({
        separator: currentConfig.csvFile.delimiter,
        headers: currentConfig.csvFile.hasHeaders,
        skipEmptyLines: true,
      }))
      .on('headers', (csvHeaders) => {
        headers = csvHeaders;
        discoveredColumns = csvHeaders;
        csvLogger.debug('Discovered CSV columns via headers event', { columns: csvHeaders });

        // Auto-suggest column mappings
        const suggestedMapping = suggestColumnMapping(csvHeaders);
        if (currentConfig.csvFile.autoDiscoverColumns) {
          currentConfig.csvFile.columnMapping = { ...currentConfig.csvFile.columnMapping, ...suggestedMapping };
          csvLogger.info('Auto-suggested column mapping', { mapping: suggestedMapping });
        }

        resolve(csvHeaders);
      })
      .on('data', (data) => {
        if (isFirstRow) {
          if (!currentConfig.csvFile.hasHeaders) {
            // For headerless CSV, use the keys from the first data row
            headers = Object.keys(data);
            discoveredColumns = headers;
            csvLogger.debug('Discovered CSV columns (no headers)', { columns: headers });

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
            csvLogger.debug('Discovered CSV columns via first data row', { columns: headers });

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
        logError(error, { context: 'Error discovering CSV columns', filePath });
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
    location: /^(location|zone|area|position|site)$/i,
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

  csvLogger.debug('Suggested column mapping', { mapping });
  return mapping;
}

// Read and parse CSV file
async function readCsvFile(filePath) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const results = [];

    createReadStream(filePath)
      .pipe(csv({
        separator: currentConfig.csvFile.delimiter,
        headers: currentConfig.csvFile.hasHeaders,
        skipEmptyLines: true,
      }))
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', () => {
        const duration = Date.now() - startTime;
        csvLogger.info('CSV file read successfully', {
          filePath,
          rowCount: results.length,
          duration: `${duration}ms`,
        });
        logPerformance('CSV file read', duration, { rowCount: results.length });
        resolve(results);
      })
      .on('error', (error) => {
        logError(error, { context: 'Error reading CSV file', filePath });
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
      const error = new Error(`Missing required data in row ${index + 1}: id=${id}, name=${name}, level=${level}`);
      csvLogger.error('Invalid CSV row', { row: index + 1, id, name, level });
      throw error;
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
      location,
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
      csvLogger.info('Using vertical format parser');

      // Read file as text for vertical parsing
      const fileContent = await fs.readFile(currentConfig.csvFile.filePath, 'utf8');

      // Parse vertical format directly
      const tanks = parseVerticalFormatData(fileContent, {
        linesPerRecord: currentConfig.csvFile.linesPerRecord || 4,
        lineMapping: currentConfig.csvFile.lineMapping || {},
        autoDetectDataEnd: currentConfig.csvFile.autoDetectDataEnd !== false,
        skipOutliers: currentConfig.csvFile.skipOutliers !== false,
        maxRecords: currentConfig.csvFile.maxRecords || 0,
        temperatureRange: currentConfig.csvFile.temperatureRange || { min: 0, max: 50 },
      });

      csvLogger.info('Parsed tanks using vertical format', { tankCount: tanks.length });

      // Store last data and broadcast
      lastTankData = tanks;
      broadcastTankData(tanks);
      return;
    }

    // Fallback to horizontal CSV parsing
    const csvData = await readCsvFile(currentConfig.csvFile.filePath);

    if (csvData.length === 0) {
      csvLogger.warn('CSV file is empty', { filePath: currentConfig.csvFile.filePath });
      return;
    }

    // Convert to tank format
    const tanks = convertCsvToTanks(csvData);

    // Store last data and broadcast
    _lastCsvData = tanks;
    broadcastTankData(tanks);
    logTankData('imported from CSV', tanks, { source: 'csv-file' });

  } catch (error) {
    logError(error, { context: 'Error importing CSV data' });
    broadcastStatus('error');
  }
}

// Connect to data source (serial port or CSV file)
async function connectDataSource() {
  // Check if CSV file mode is enabled
  if (currentConfig.dataFormat === 'csvfile' || currentConfig.csvFile.enabled) {
    moduleLogger.info('Starting CSV file monitoring mode');
    return await startCsvFileMonitoring();
  }

  // Serial port mode
  if (!SerialPort) {
    moduleLogger.info('SerialPort not available, generating empty tanks');
    generateEmptyTanks();
    return true;
  }

  if (!currentConfig.selectedPort) {
    serialLogger.warn('No port selected');
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
      parity: currentConfig.parity,
    });

    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    serialPort.on('open', () => {
      serialLogger.info('Serial port opened', { port: currentConfig.selectedPort });
      auditLog('SERIAL_PORT_CONNECTED', 'system', { port: currentConfig.selectedPort });
      broadcastStatus('connected');
    });

    serialPort.on('error', (error) => {
      logError(error, { context: 'Serial port error' });
      broadcastStatus('error');
    });

    serialPort.on('close', () => {
      serialLogger.info('Serial port closed');
      auditLog('SERIAL_PORT_DISCONNECTED', 'system', { port: currentConfig.selectedPort });
      broadcastStatus('disconnected');
    });

    parser.on('data', (data) => {
      serialLogger.debug('Received serial data', { dataLength: data.length });
      const tanks = parseTankData(data);
      if (tanks.length > 0) {
        broadcastTankData(tanks);
        logTankData('received from serial', tanks, { source: 'serial-port' });
      }
    });

    return true;
  } catch (error) {
    logError(error, { context: 'Error connecting to serial port' });
    return false;
  }
}

// Start CSV file monitoring
async function startCsvFileMonitoring() {
  if (!currentConfig.csvFile.enabled || !currentConfig.csvFile.filePath) {
    csvLogger.warn('CSV file monitoring not enabled or no file path specified');
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
        logError(error, { context: 'Error discovering columns' });
      }
    }

    // Initial import
    await importCsvData();

    // Set up file watcher
    csvFileWatcher = chokidar.watch(currentConfig.csvFile.filePath, {
      persistent: true,
      ignoreInitial: true,
    });

    csvFileWatcher.on('change', () => {
      csvLogger.info('CSV file changed, reimporting data');
      importCsvData();
    });

    csvFileWatcher.on('error', (error) => {
      logError(error, { context: 'CSV file watcher error' });
    });

    // Set up periodic import
    csvImportInterval = setInterval(() => {
      importCsvData();
    }, currentConfig.csvFile.importInterval);

    csvLogger.info('CSV file monitoring started', {
      filePath: currentConfig.csvFile.filePath,
      importInterval: currentConfig.csvFile.importInterval,
    });
    auditLog('CSV_MONITORING_STARTED', 'system', { filePath: currentConfig.csvFile.filePath });
    broadcastStatus('connected');

    return true;

  } catch (error) {
    logError(error, { context: 'Error starting CSV file monitoring' });
    broadcastStatus('error');
    return false;
  }
}

// Stop CSV file monitoring
function stopCsvFileMonitoring() {
  if (csvFileWatcher) {
    csvFileWatcher.close();
    csvFileWatcher = null;
    csvLogger.info('CSV file watcher stopped');
  }

  if (csvImportInterval) {
    clearInterval(csvImportInterval);
    csvImportInterval = null;
    csvLogger.info('CSV import interval stopped');
  }
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
      group,
      temperature: 20, // Default temperature
    });
  }

  // Store the empty tank data
  lastTankData = tanks;

  // Broadcast initial empty data
  broadcastTankData(tanks);
  logTankData('generated empty tanks', tanks, { source: 'demo-mode' });

  return tanks;
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

// Helper function to safely send message to a WebSocket client
function safeSend(client, message) {
  try {
    if (client.readyState === client.OPEN) {
      client.send(message);
      client.lastActivity = Date.now();
      return true;
    }
    return false;
  } catch (error) {
    wsLogger.error('Error sending message to client', { error: error.message });
    return false;
  }
}

// Helper function to broadcast messages with automatic cleanup
function _safeBroadcast(message) {
  const deadClients = [];

  connectedClients.forEach(client => {
    if (!safeSend(client, message) && client.readyState !== client.CONNECTING) {
      deadClients.push(client);
    }
  });

  // Clean up dead clients
  deadClients.forEach(client => {
    connectedClients.delete(client);
    try {
      client.terminate();
    } catch (e) {
      // Ignore errors during termination
    }
  });

  return connectedClients.size - deadClients.length; // Return number of successful sends
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
      connectionStatus: SerialPort && serialPort?.isOpen ? 'connected' : 'connected', // Show connected for demo mode
    },
  });

  const deadClients = [];

  connectedClients.forEach(client => {
    try {
      if (client.readyState === client.OPEN) {
        client.send(message);
        client.lastActivity = Date.now(); // Update activity timestamp
      } else if (client.readyState !== client.CONNECTING) {
        // Client is CLOSING or CLOSED
        deadClients.push(client);
      }
    } catch (error) {
      wsLogger.error('Error broadcasting to client', { error: error.message });
      deadClients.push(client);
    }
  });

  // Clean up dead clients
  deadClients.forEach(client => {
    connectedClients.delete(client);
    try {
      client.terminate();
    } catch (e) {
      // Ignore errors during termination
    }
  });

  wsLogger.debug('Broadcast tank data', {
    clientCount: connectedClients.size,
    deadClientCount: deadClients.length,
  });
}

// Broadcast connection status
function broadcastStatus(status) {
  const message = JSON.stringify({
    type: 'status',
    data: { connectionStatus: status, lastSync: new Date().toISOString() },
  });

  const deadClients = [];

  connectedClients.forEach(client => {
    try {
      if (client.readyState === client.OPEN) {
        client.send(message);
        client.lastActivity = Date.now(); // Update activity timestamp
      } else if (client.readyState !== client.CONNECTING) {
        // Client is CLOSING or CLOSED
        deadClients.push(client);
      }
    } catch (error) {
      wsLogger.error('Error broadcasting status to client', { error: error.message });
      deadClients.push(client);
    }
  });

  // Clean up dead clients
  deadClients.forEach(client => {
    connectedClients.delete(client);
    try {
      client.terminate();
    } catch (e) {
      // Ignore errors during termination
    }
  });
}

// API Routes
app.get('/api/ports', apiLimiter, async (req, res) => {
  const ports = await discoverPorts();
  res.json(ports);
});

app.get('/api/config', apiLimiter, (req, res) => {
  res.json(currentConfig);
});

// Tank data endpoint
app.get('/api/tanks', apiLimiter, (req, res) => {
  if (lastTankData && lastTankData.length > 0) {
    res.json(lastTankData);
  } else {
    res.status(503).json({
      error: 'No tank data available',
      message: 'Data source not connected or no data received yet',
    });
  }
});

// Tank configuration storage
let tankConfiguration = {
  preAlarmPercentage: 86,
  overfillPercentage: 97.5,
  lowLevelPercentage: 10,
  tanks: {},
};

// App branding storage
let appBranding = {
  appName: 'Tank Monitoring System',
  appSlogan: 'Real-time tank level monitoring dashboard',
  primaryColor: '#2563eb',
};

// API endpoint to get tank configuration
app.get('/api/tank-config', apiLimiter, (req, res) => {
  res.json(tankConfiguration);
});

// API endpoint to save tank configuration
app.post('/api/tank-config', configLimiter, (req, res) => {
  try {
    tankConfiguration = { ...tankConfiguration, ...req.body };
    moduleLogger.info('Tank configuration updated');
    auditLog('TANK_CONFIG_UPDATED', req.user?.username || 'unknown', { config: tankConfiguration });
    res.json({ success: true, message: 'Tank configuration saved' });
  } catch (error) {
    logError(error, { context: 'Failed to save tank configuration' });
    res.status(500).json({ success: false, message: 'Failed to save configuration' });
  }
});

// API endpoint to get app branding
app.get('/api/branding', apiLimiter, (req, res) => {
  res.json(appBranding);
});

// API endpoint to save app branding
app.post('/api/branding', configLimiter, (req, res) => {
  try {
    appBranding = { ...appBranding, ...req.body };
    moduleLogger.info('App branding updated');
    auditLog('BRANDING_UPDATED', req.user?.username || 'unknown', { branding: appBranding });
    res.json({ success: true, message: 'App branding saved' });
  } catch (error) {
    logError(error, { context: 'Failed to save app branding' });
    res.status(500).json({ success: false, message: 'Failed to save branding' });
  }
});

app.post('/api/config', configLimiter, async (req, res) => {
  // Deep merge CSV file configuration to preserve existing settings
  const newConfig = { ...currentConfig, ...req.body };
  if (req.body.csvFile) {
    newConfig.csvFile = {
      ...currentConfig.csvFile,
      ...req.body.csvFile,
      columnMapping: {
        ...currentConfig.csvFile.columnMapping,
        ...(req.body.csvFile.columnMapping || {}),
      },
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
  auditLog('CONFIG_UPDATED', req.user?.username || 'unknown', { config: currentConfig });

  res.json({ success: true, config: currentConfig });
});

app.post('/api/connect', apiLimiter, async (req, res) => {
  const success = await connectDataSource();
  const isConnected = currentConfig.csvFile.enabled ?
    (csvFileWatcher !== null || csvImportInterval !== null) :
    (SerialPort ? (serialPort?.isOpen || false) : true);
  res.json({ success, connected: isConnected });
});

app.post('/api/disconnect', apiLimiter, (req, res) => {
  disconnectDataSource();
  res.json({ success: true, connected: false });
});

// CSV file specific endpoints
app.get('/api/csv/columns', fileSystemLimiter, async (req, res) => {
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

app.post('/api/csv/test-import', fileSystemLimiter, async (req, res) => {
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
      columns: discoveredColumns,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/csv/validate-file', fileSystemLimiter, validate(joi.object({ filePath: joi.safeCustom().safePath().required() })), async (req, res) => {
  const { filePath } = req.body;

  try {
    await fs.access(filePath);
    const columns = await discoverCsvColumns(filePath);
    res.json({
      valid: true,
      exists: true,
      columns,
      message: 'File is accessible and readable',
    });
  } catch (error) {
    res.status(400).json({
      valid: false,
      exists: false,
      error: error.message,
    });
  }
});

// File browser endpoint
app.get('/api/flexible/browse', fileSystemLimiter, async (req, res) => {
  const requestedPath = req.query.path || process.cwd();

  try {
    // CRITICAL SECURITY: Comprehensive path validation
    const projectRoot = path.resolve(process.cwd());

    // Step 1: Reject any path containing null bytes
    if (requestedPath.includes('\0')) {
      return res.status(400).json({ error: 'Invalid path: null bytes not allowed' });
    }

    // Step 2: Normalize and resolve the path to remove any .. or . sequences
    const normalizedPath = path.normalize(requestedPath);
    const resolvedPath = path.resolve(projectRoot, normalizedPath);

    // Step 3: Ensure the resolved path starts with project root (after normalization)
    // This prevents directory traversal attacks
    if (!resolvedPath.startsWith(projectRoot + path.sep) && resolvedPath !== projectRoot) {
      return res.status(403).json({ error: 'Access denied: Path outside project directory' });
    }

    // Step 4: Additional validation - check for suspicious patterns
    const pathSegments = resolvedPath.split(path.sep);
    for (const segment of pathSegments) {
      // Block hidden files/directories (starting with .)
      if (segment.startsWith('.') && segment !== '.') {
        return res.status(403).json({ error: 'Access denied: Hidden files/directories not allowed' });
      }
      // Block any remaining encoded traversal attempts
      if (segment.includes('..') || segment.includes('%2e%2e') || segment.includes('%252e')) {
        return res.status(403).json({ error: 'Access denied: Path traversal attempt detected' });
      }
    }

    // Step 5: Verify the path exists and is accessible
    try {
      await fs.access(resolvedPath);
    } catch {
      return res.status(404).json({ error: 'Directory does not exist' });
    }

    // Step 6: Ensure it's a directory using lstat to avoid symlink attacks
    const stats = await fs.lstat(resolvedPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

    // Step 7: Check if it's a symbolic link (potential security risk)
    if (stats.isSymbolicLink()) {
      return res.status(403).json({ error: 'Access denied: Symbolic links not allowed' });
    }

    // Safe to read directory contents
    const items = await fs.readdir(resolvedPath);
    const directories = [];
    const files = [];

    for (const item of items) {
      // Skip hidden files/directories
      if (item.startsWith('.')) {
        continue;
      }

      const itemPath = path.join(resolvedPath, item);
      try {
        // Use lstat to avoid following symlinks
        const itemStats = await fs.lstat(itemPath);

        // Skip symbolic links
        if (itemStats.isSymbolicLink()) {
          continue;
        }

        if (itemStats.isDirectory()) {
          directories.push(item);
        } else if (itemStats.isFile()) {
          files.push(item);
        }
      } catch (err) {
        // Skip items we can't read
        moduleLogger.warn('Cannot access file', { path: itemPath, error: err.message });
      }
    }

    res.json({
      path: resolvedPath,
      directories: directories.sort(),
      files: files.sort(),
    });

  } catch (error) {
    res.json({ error: error.message });
  }
});

// Flexible File System API endpoints
app.get('/api/flexible/sources', apiLimiter, (req, res) => {
  if (!fileMonitor) {
    return res.json([]);
  }
  res.json(fileMonitor.getSourceInfo());
});

app.post('/api/flexible/sources', configLimiter, async (req, res) => {
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

app.delete('/api/flexible/sources/:id', configLimiter, validateParams(sourceIdParamSchema), (req, res) => {
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

app.get('/api/flexible/validate', fileSystemLimiter, async (req, res) => {
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
      totalRows: result.data.length,
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
      details: error.stack,
    });
  }
});

app.get('/api/flexible/fields', apiLimiter, (req, res) => {
  res.json(TANK_FIELDS);
});

app.post('/api/flexible/test-mapping', fileSystemLimiter, async (req, res) => {
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
      totalRows: result.data.length,
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.get('/api/status', apiLimiter, (req, res) => {
  const isConnected = currentConfig.csvFile.enabled ?
    (csvFileWatcher !== null || csvImportInterval !== null) :
    (SerialPort ? (serialPort?.isOpen || false) : true);

  const _flexibleSourcesActive = fileMonitor ? fileMonitor.getSourceInfo().filter(s => s.lastUpdate).length : 0;

  res.json({
    connected: isConnected,
    selectedPort: currentConfig.selectedPort,
    csvFileEnabled: currentConfig.csvFile.enabled,
    csvFilePath: currentConfig.csvFile.filePath,
    dataSource: currentConfig.csvFile.enabled ? 'csvfile' : 'serial',
    lastSync: new Date().toISOString(),
  });
});

// Serve login page
app.get('/login', staticLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve settings page
app.get('/settings', staticLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'settings.html'));
});

// Serve flexible settings page
app.get('/flexible-settings', staticLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'flexible-settings.html'));
});

// Fallback to main app
app.get('*', staticLimiter, (req, res) => {
  // If not authenticated, redirect to login
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token && !req.path.startsWith('/api/')) {
    return res.redirect('/login');
  }

  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// File Monitor Setup
function setupFileMonitor() {
  if (!fileMonitor) {
    fileMonitor = new FlexibleFileMonitor();
  }

  fileMonitor.on('data', (event) => {
    fileMonitorLogger.info('Received data from source', {
      source: event.source,
      tankCount: event.tanks.length,
    });

    // Get the configured tank count limit
    const tankCountLimit = currentConfig.tankCount || 12;

    // Limit the tank data to the configured count
    let tanks = event.tanks || [];
    if (tanks.length > tankCountLimit) {
      tanks = tanks.slice(0, tankCountLimit);
      fileMonitorLogger.debug('Limited tank data', {
        originalCount: event.tanks.length,
        limitedCount: tankCountLimit,
      });
    }

    // Store the limited tank data
    lastTankData = tanks;

    // Broadcast to WebSocket clients
    const message = JSON.stringify({
      type: 'tankData',
      data: tanks,
      source: event.source,
      timestamp: new Date().toISOString(),
    });

    const deadClients = [];

    connectedClients.forEach(client => {
      try {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
          client.lastActivity = Date.now(); // Update activity timestamp
        } else if (client.readyState !== 0) { // Not CONNECTING
          deadClients.push(client);
        }
      } catch (error) {
        wsLogger.error('Error broadcasting file monitor data', { error: error.message });
        deadClients.push(client);
      }
    });

    // Clean up dead clients
    deadClients.forEach(client => {
      connectedClients.delete(client);
      try {
        client.terminate();
      } catch (e) {
        // Ignore errors during termination
      }
    });
  });

  fileMonitor.on('error', (event) => {
    logError(event.error, { context: 'File monitor error', source: event.source });

    // Broadcast error to WebSocket clients
    const message = JSON.stringify({
      type: 'error',
      source: event.source,
      error: event.error.message,
      timestamp: new Date().toISOString(),
    });

    const deadClients = [];

    connectedClients.forEach(client => {
      try {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
          client.lastActivity = Date.now(); // Update activity timestamp
        } else if (client.readyState !== 0) { // Not CONNECTING
          deadClients.push(client);
        }
      } catch (error) {
        wsLogger.error('Error broadcasting error message', { error: error.message });
        deadClients.push(client);
      }
    });

    // Clean up dead clients
    deadClients.forEach(client => {
      connectedClients.delete(client);
      try {
        client.terminate();
      } catch (e) {
        // Ignore errors during termination
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

  // Periodic health check interval
  const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  const CONNECTION_TIMEOUT = 60000; // 60 seconds timeout for inactive connections

  wsServer.on('connection', async (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    wsLogger.info('WebSocket client connected', { ip: clientIp });

    // Apply WebSocket connection rate limiting
    const { wsConnectionLimiter } = await import('./middleware/rateLimiter.js');

    // Create a mock Express request/response for rate limiting
    const mockReq = {
      ip: clientIp,
      connection: { remoteAddress: clientIp },
      get: (header) => req.headers[header.toLowerCase()],
      headers: req.headers,
    };
    const mockRes = {
      status: (code) => ({ json: (data) => {
        wsLogger.warn('WebSocket connection rate limited', { ip: clientIp, code, data });
        ws.close(1008, `Rate limited: ${data.message}`);
      } }),
      getHeader: (_name) => null,
      setHeader: (_name, _value) => {},
    };

    // Check rate limit
    try {
      await new Promise((resolve, reject) => {
        wsConnectionLimiter(mockReq, mockRes, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (_error) {
      // Rate limit exceeded, connection already closed by mock response
      return;
    }

    // Extract token from query string or headers
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token') ||
                  (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
                    ? req.headers.authorization.substring(7)
                    : null);

    // Verify token
    if (!token) {
      wsLogger.warn('WebSocket connection rejected: No token', { ip: clientIp });
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      const { verifyToken } = await import('./middleware/auth.js');
      const decoded = verifyToken(token);
      ws.user = decoded;
      wsLogger.info('WebSocket authenticated', { username: decoded.username, ip: clientIp });
      auditLog('WEBSOCKET_CONNECTED', decoded.username, { ip: clientIp });
    } catch (_error) {
      wsLogger.warn('WebSocket connection rejected: Invalid token', { ip: clientIp });
      ws.close(1008, 'Invalid authentication');
      return;
    }

    // Add connection metadata
    ws.isAlive = true;
    ws.connectionTime = Date.now();
    ws.lastActivity = Date.now();

    connectedClients.add(ws);

    // Set up ping-pong heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastActivity = Date.now();
    });

    // Send current status
    try {
      ws.send(JSON.stringify({
        type: 'status',
        data: {
          connectionStatus: SerialPort ? (serialPort?.isOpen ? 'connected' : 'disconnected') : 'connected',
          lastSync: new Date().toISOString(),
        },
      }));
    } catch (error) {
      wsLogger.error('Error sending initial status', { error: error.message });
      connectedClients.delete(ws);
      ws.terminate();
      return;
    }

    // Handle close event
    ws.on('close', (code, reason) => {
      wsLogger.info('WebSocket client disconnected', {
        code,
        reason: reason || 'No reason provided',
        username: ws.user?.username,
      });
      auditLog('WEBSOCKET_DISCONNECTED', ws.user?.username || 'unknown', { code, reason });
      connectedClients.delete(ws);
    });

    // Handle error event
    ws.on('error', (error) => {
      wsLogger.error('WebSocket error', { error: error.message, username: ws.user?.username });
      connectedClients.delete(ws);
      try {
        ws.terminate();
      } catch (e) {
        // Ignore errors during termination
      }
    });

    // Handle message event (for activity tracking)
    ws.on('message', (_data) => {
      ws.lastActivity = Date.now();
      // Handle any incoming messages if needed
    });
  });

  // Set up periodic health checks
  const healthCheckInterval = setInterval(() => {
    const now = Date.now();
    const clientsToRemove = [];

    connectedClients.forEach((ws) => {
      // Check if connection is stale (no activity for CONNECTION_TIMEOUT)
      if (now - ws.lastActivity > CONNECTION_TIMEOUT) {
        wsLogger.warn('Removing stale connection (timeout)', { username: ws.user?.username });
        clientsToRemove.push(ws);
        return;
      }

      // Check if connection is alive
      if (ws.isAlive === false) {
        wsLogger.warn('Removing dead connection (failed ping)', { username: ws.user?.username });
        clientsToRemove.push(ws);
        return;
      }

      // Send ping to check connection
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (error) {
        wsLogger.error('Error sending ping', { error: error.message });
        clientsToRemove.push(ws);
      }
    });

    // Clean up dead connections
    clientsToRemove.forEach((ws) => {
      connectedClients.delete(ws);
      try {
        ws.terminate();
      } catch (e) {
        // Ignore errors during termination
      }
    });

    if (clientsToRemove.length > 0) {
      wsLogger.info('Cleaned up dead connections', {
        removedCount: clientsToRemove.length,
        activeConnections: connectedClients.size,
      });
    }
  }, HEALTH_CHECK_INTERVAL);

  // Handle server errors
  wsServer.on('error', (error) => {
    logError(error, { context: 'WebSocket server error' });
  });

  // Store interval reference for cleanup
  wsServer.healthCheckInterval = healthCheckInterval;

  wsLogger.info('WebSocket server started', {
    port: WS_PORT,
    healthCheckInterval: HEALTH_CHECK_INTERVAL,
  });
}

// Initialize server
async function init() {
  await initializeSerialPort();
  await loadConfig();

  // Log startup
  logStartup({
    port: PORT,
    wsPort: WS_PORT,
    dataFormat: currentConfig.dataFormat,
    csvFile: currentConfig.csvFile,
    dataSources: currentConfig.dataSources,
  });

  // Set up static path and middleware
  const finalStaticPath = await findStaticPath();
  app.use(express.static(finalStaticPath));

  setupWebSocket();
  setupFileMonitor();

  app.listen(PORT, () => {
    moduleLogger.info('Bridge service running', {
      port: PORT,
      settingsPage: `http://localhost:${PORT}/settings`,
      mainDashboard: `http://localhost:${PORT}`,
    });

    if (!SerialPort) {
      moduleLogger.info('Running in DEMO MODE - SerialPort not available in WebContainer');
    }
  });

  // Auto-connect if configured or start demo mode
  if (currentConfig.csvFile.enabled && currentConfig.csvFile.filePath) {
    setTimeout(() => {
      startCsvFileMonitoring();
    }, 1000);
  } else if (!SerialPort) {
    setTimeout(() => {
      generateEmptyTanks();
    }, 1000);
  } else if (currentConfig.autoConnect && currentConfig.selectedPort) {
    setTimeout(() => {
      connectDataSource();
    }, 2000);
  }
}

// Graceful shutdown handler
async function gracefulShutdown() {
  logShutdown('SIGTERM/SIGINT received');

  // Close WebSocket server
  if (wsServer) {
    wsLogger.info('Closing WebSocket server');

    // Clear health check interval
    if (wsServer.healthCheckInterval) {
      clearInterval(wsServer.healthCheckInterval);
    }

    // Close all client connections
    connectedClients.forEach(client => {
      try {
        client.close(1000, 'Server shutting down');
      } catch (e) {
        try {
          client.terminate();
        } catch (_e2) {
          // Ignore errors
        }
      }
    });

    // Clear the clients set
    connectedClients.clear();

    // Close the server
    wsServer.close(() => {
      wsLogger.info('WebSocket server closed');
    });
  }

  // Disconnect data sources
  disconnectDataSource();

  // Stop file monitor
  if (fileMonitor) {
    fileMonitor.stop();
  }

  // Shutdown rate limiter
  try {
    await shutdownRateLimiter();
    moduleLogger.info('Rate limiter shutdown complete');
  } catch (error) {
    logError(error, { context: 'Error shutting down rate limiter' });
  }

  // Exit process
  setTimeout(() => {
    moduleLogger.info('Shutdown complete');
    process.exit(0);
  }, 1000);
}

// Handle process termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logError(error, { context: 'Uncaught Exception' });
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString(),
  });
  // Don't exit on unhandled rejections, just log them
});

init().catch(error => {
  logError(error, { context: 'Initialization failed' });
  process.exit(1);
});
