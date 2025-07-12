#!/usr/bin/env node

/**
 * Create Debug Build for Windows
 * Enhanced logging and error handling for debugging server startup issues
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Creating debug build for Windows...');

// Enhanced main.js with more logging
const enhancedMainJs = `
import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import http from 'http';
import { startIntegratedServer, stopIntegratedServer, getDebugLogs } from './integrated-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let serverInstance = null;

// Enhanced logging for Windows debugging
const debugLogs = [];
const MAX_DEBUG_LOGS = 500;

function addDebugLog(level, category, message, error = null) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : null,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    electronVersion: process.versions.electron
  };
  
  debugLogs.push(log);
  if (debugLogs.length > MAX_DEBUG_LOGS) {
    debugLogs.shift();
  }
  
  // Console output
  const timestamp = new Date().toLocaleTimeString();
  console.log(\`[\${timestamp}] [\${level}] [\${category}] \${message}\`);
  if (error) {
    console.error('Error details:', error);
  }
  
  // Write to file for Windows debugging
  try {
    const logFile = path.join(process.cwd(), 'debug.log');
    const logLine = \`[\${log.timestamp}] [\${level}] [\${category}] \${message}\${error ? ' ERROR: ' + error.message : ''}\\n\`;
    fs.appendFileSync(logFile, logLine);
  } catch (e) {
    // Ignore file write errors
  }
}

// Enhanced server startup with detailed logging
async function startServer() {
  if (isDev) {
    addDebugLog('INFO', 'SERVER', 'Development mode: Server should be started manually');
    return;
  }

  try {
    addDebugLog('INFO', 'SERVER', 'Starting integrated server...');
    addDebugLog('DEBUG', 'SERVER', \`Platform: \${process.platform}, Arch: \${process.arch}\`);
    addDebugLog('DEBUG', 'SERVER', \`Node version: \${process.version}\`);
    addDebugLog('DEBUG', 'SERVER', \`Electron version: \${process.versions.electron}\`);
    addDebugLog('DEBUG', 'SERVER', \`Working directory: \${process.cwd()}\`);
    addDebugLog('DEBUG', 'SERVER', \`Resources path: \${process.resourcesPath || 'undefined'}\`);
    
    // Check if integrated-server.js exists
    const serverPath = path.join(__dirname, 'integrated-server.js');
    addDebugLog('DEBUG', 'SERVER', \`Server script path: \${serverPath}\`);
    addDebugLog('DEBUG', 'SERVER', \`Server script exists: \${fs.existsSync(serverPath)}\`);
    
    // Check ports before starting
    addDebugLog('DEBUG', 'SERVER', 'Checking if ports 3001 and 3002 are available...');
    
    serverInstance = await startIntegratedServer(isDev);
    addDebugLog('INFO', 'SERVER', 'Integrated server started successfully');
    
  } catch (error) {
    addDebugLog('ERROR', 'SERVER', \`Failed to start integrated server: \${error.message}\`, error);
    
    // Show error dialog on Windows
    if (mainWindow) {
      dialog.showErrorBox('Server Startup Error', 
        \`Failed to start the integrated server:\\n\\n\${error.message}\\n\\nCheck debug.log for details.\`);
    }
  }
}

// Enhanced window creation with error handling
function createWindow() {
  addDebugLog('INFO', 'APP', 'Creating main window...');
  
  try {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, 'assets', 'icon.png'),
      show: false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
    });

    addDebugLog('INFO', 'APP', 'Main window created successfully');

    // Enhanced loading logic
    if (isDev) {
      addDebugLog('INFO', 'APP', 'Loading development server...');
      mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools();
    } else {
      addDebugLog('INFO', 'APP', 'Waiting for integrated server...');
      
      // Wait for server with enhanced logging
      waitForServer('http://localhost:3001')
        .then(() => {
          addDebugLog('INFO', 'APP', 'Server is ready, loading app...');
          mainWindow.loadURL('http://localhost:3001');
        })
        .catch((error) => {
          addDebugLog('ERROR', 'APP', \`Server failed to start: \${error.message}\`, error);
          
          // Show error and try to load anyway
          dialog.showErrorBox('Server Connection Error', 
            \`Could not connect to the integrated server.\\n\\nError: \${error.message}\\n\\nTrying to load anyway...\`);
          
          mainWindow.loadURL('http://localhost:3001');
        });
    }

    // Window event handlers
    mainWindow.once('ready-to-show', () => {
      addDebugLog('INFO', 'APP', 'Window ready to show');
      mainWindow.show();
    });

    mainWindow.on('closed', () => {
      addDebugLog('INFO', 'APP', 'Main window closed');
      mainWindow = null;
    });

    // Enhanced web contents error handling
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      addDebugLog('ERROR', 'APP', \`Failed to load: \${errorDescription} (code: \${errorCode}) URL: \${validatedURL}\`);
    });

    mainWindow.webContents.on('crashed', (event, killed) => {
      addDebugLog('ERROR', 'APP', \`Renderer process crashed. Killed: \${killed}\`);
    });

  } catch (error) {
    addDebugLog('ERROR', 'APP', \`Failed to create window: \${error.message}\`, error);
  }
}

// Enhanced server waiting with detailed logging
function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let attempts = 0;

    addDebugLog('DEBUG', 'SERVER', \`Waiting for server at \${url} (timeout: \${timeout}ms)\`);

    function checkServer() {
      attempts++;
      addDebugLog('DEBUG', 'SERVER', \`Server check attempt \${attempts}\`);
      
      const req = http.get(url, (res) => {
        addDebugLog('DEBUG', 'SERVER', \`Server responded with status: \${res.statusCode}\`);
        if (res.statusCode === 200) {
          addDebugLog('INFO', 'SERVER', \`Server is ready after \${attempts} attempts\`);
          resolve();
        } else {
          setTimeout(checkServer, 500);
        }
      });

      req.on('error', (error) => {
        const elapsed = Date.now() - startTime;
        addDebugLog('DEBUG', 'SERVER', \`Server check failed: \${error.message} (elapsed: \${elapsed}ms)\`);
        
        if (elapsed > timeout) {
          addDebugLog('ERROR', 'SERVER', \`Server startup timeout after \${attempts} attempts\`);
          reject(new Error(\`Server startup timeout after \${elapsed}ms\`));
        } else {
          setTimeout(checkServer, 500);
        }
      });

      req.setTimeout(1000, () => {
        req.destroy();
        const elapsed = Date.now() - startTime;
        if (elapsed > timeout) {
          addDebugLog('ERROR', 'SERVER', \`Server startup timeout (request timeout)\`);
          reject(new Error('Server startup timeout'));
        } else {
          setTimeout(checkServer, 500);
        }
      });
    }

    checkServer();
  });
}

// IPC handler for debug logs
ipcMain.handle('get-debug-logs', () => {
  return debugLogs;
});

// App event handlers
app.whenReady().then(async () => {
  addDebugLog('INFO', 'APP', 'Electron app ready, initializing...');
  addDebugLog('DEBUG', 'APP', \`App version: \${app.getVersion()}\`);
  addDebugLog('DEBUG', 'APP', \`App path: \${app.getAppPath()}\`);
  
  createWindow();
  startServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  addDebugLog('INFO', 'APP', 'All windows closed, stopping server...');
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  addDebugLog('INFO', 'APP', 'App quitting, stopping server...');
  stopServer();
});

// Stop server function
async function stopServer() {
  if (serverInstance) {
    try {
      await stopIntegratedServer();
      serverInstance = null;
      addDebugLog('INFO', 'SERVER', 'Integrated server stopped');
    } catch (error) {
      addDebugLog('ERROR', 'SERVER', \`Error stopping server: \${error.message}\`, error);
    }
  }
}

export { createWindow, startServer, stopServer };
`;

// Write the enhanced main.js
fs.writeFileSync('electron/main-debug.js', enhancedMainJs);

console.log('✅ Created electron/main-debug.js with enhanced logging');

// Create debug package.json entry
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
packageJson.main = 'electron/main-debug.js';

fs.writeFileSync('package-debug.json', JSON.stringify(packageJson, null, 2));

console.log('✅ Created package-debug.json');

console.log('');
console.log('🔧 Debug build created! To build:');
console.log('1. cp package-debug.json package.json');
console.log('2. npm run build');
console.log('3. npx electron-builder --win --publish=never');
console.log('');
console.log('📋 The debug version will:');
console.log('- Write detailed logs to debug.log file');
console.log('- Show error dialogs for server issues');
console.log('- Log platform/environment information');
console.log('- Track server startup attempts');
console.log('- Provide detailed error information');
