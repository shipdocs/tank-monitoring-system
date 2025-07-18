import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { autoUpdater } = require('electron-updater');
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
let serverInstance = null; // Integrated server instance

// Configure auto-updater (will be called after window creation)
// Only enable auto-updates for stable releases (exclude RC, beta, alpha, testing versions)
function isStableVersion(version) {
  // Check if version contains any pre-release identifiers
  const preReleasePatterns = [
    /rc/i,           // Release Candidate
    /beta/i,         // Beta versions
    /alpha/i,        // Alpha versions
    /test/i,         // Testing versions
    /dev/i,          // Development versions
    /pre/i,          // Pre-release
    /snapshot/i,     // Snapshot builds
    /-/              // Any version with dash (e.g., 1.2.3-rc1)
  ];

  return !preReleasePatterns.some(pattern => pattern.test(version));
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  addLog('INFO', 'UPDATER', 'Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  addLog('INFO', 'UPDATER', `Update available: ${info.version}`);

  // Check if the available version is stable
  if (!isStableVersion(info.version)) {
    addLog('INFO', 'UPDATER', `Skipping pre-release version: ${info.version} (RC/beta/testing version)`);
    return; // Skip pre-release versions
  }

  // Show notification to user for stable versions only
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new stable version (${info.version}) is available!`,
      detail: 'The update will be downloaded in the background. You will be notified when it\'s ready to install.',
      buttons: ['OK']
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  addLog('INFO', 'UPDATER', 'Update not available');
});

autoUpdater.on('error', (err) => {
  addLog('ERROR', 'UPDATER', `Update error: ${err.message}`);
});

autoUpdater.on('download-progress', (progressObj) => {
  const percent = Math.round(progressObj.percent);
  addLog('INFO', 'UPDATER', `Download progress: ${percent}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  addLog('INFO', 'UPDATER', `Update downloaded: ${info.version}`);

  // Double-check that the downloaded version is stable
  if (!isStableVersion(info.version)) {
    addLog('WARN', 'UPDATER', `Refusing to install pre-release version: ${info.version}`);
    return; // Don't install pre-release versions
  }

  // Show restart dialog for stable versions only
  if (mainWindow) {
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Stable Update Ready',
      message: `Stable update ${info.version} has been downloaded and is ready to install.`,
      detail: 'The application will restart to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  }
});

// Manual update check function
function checkForUpdatesManually() {
  addLog('INFO', 'UPDATER', 'Manual update check initiated');

  const currentVersion = app.getVersion();

  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Checking for Updates',
      message: 'Checking for stable updates...',
      detail: `Current version: ${currentVersion}\nLooking for stable releases only (excluding RC/beta/testing versions).`,
      buttons: ['OK']
    });
  }

  autoUpdater.checkForUpdatesAndNotify().catch(err => {
    addLog('ERROR', 'UPDATER', `Manual update check failed: ${err.message}`);

    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Check Failed',
        message: 'Failed to check for updates',
        detail: `Error: ${err.message}\n\nPlease check your internet connection and try again.`,
        buttons: ['OK']
      });
    }
  });
}

// Debug logging system
const debugLogs = [];
const MAX_LOG_ENTRIES = 1000;

function addLog(level, source, message) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    source,
    message
  };

  debugLogs.push(logEntry);

  // Keep only the last MAX_LOG_ENTRIES
  if (debugLogs.length > MAX_LOG_ENTRIES) {
    debugLogs.shift();
  }

  // Also log to console
  const formattedMessage = `[${timestamp}] [${level}] [${source}] ${message}`;
  switch(level) {
    case 'ERROR':
      console.error(formattedMessage);
      break;
    case 'WARN':
      console.warn(formattedMessage);
      break;
    case 'INFO':
    default:
      console.log(formattedMessage);
      break;
  }
}

// Wait for server to be ready
function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function checkServer() {
      const req = http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(checkServer, 500);
        }
      });

      req.on('error', () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Server startup timeout'));
        } else {
          setTimeout(checkServer, 500);
        }
      });

      req.setTimeout(1000, () => {
        req.destroy();
        if (Date.now() - startTime > timeout) {
          reject(new Error('Server startup timeout'));
        } else {
          setTimeout(checkServer, 500);
        }
      });
    }

    checkServer();
  });
}

// Enable live reload for Electron in development
async function setupHotReload() {
  if (isDev) {
    try {
      const electronReload = await import('electron-reload');
      electronReload.default(__dirname, {
        electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
        hardResetMethod: 'exit'
      });
    } catch (error) {
      console.log('electron-reload not available, continuing without hot reload');
    }
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true
    },
    show: false, // Don't show until ready-to-show
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // Load the app
  if (isDev) {
    // In development, load from the dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, wait for server to be ready, then load the app
    waitForServer('http://localhost:3001')
      .then(() => {
        console.log('Server is ready, loading app...');
        mainWindow.loadURL('http://localhost:3001');
      })
      .catch((error) => {
        console.error('Server failed to start:', error);
        // Fallback: try to load anyway
        mainWindow.loadURL('http://localhost:3001');
      });
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Focus on window
    if (isDev) {
      mainWindow.focus();
    }

    // Start auto-updater after window is ready (only in production and for stable versions)
    if (!isDev) {
      // Check if current version is stable before enabling auto-updates
      const currentVersion = app.getVersion();
      if (isStableVersion(currentVersion)) {
        addLog('INFO', 'UPDATER', `Current version ${currentVersion} is stable - enabling auto-updates`);
        setTimeout(() => {
          autoUpdater.checkForUpdatesAndNotify().catch(err => {
            addLog('ERROR', 'UPDATER', `Update error: ${err.message}`);
          });
        }, 5000); // Wait 5 seconds after startup
      } else {
        addLog('INFO', 'UPDATER', `Current version ${currentVersion} is pre-release - auto-updates disabled`);
      }
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external websites
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== 'http://localhost:5173' &&
        parsedUrl.origin !== 'http://localhost:3001' &&
        !navigationUrl.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
}

// Start the integrated server
async function startServer() {
  if (isDev) {
    console.log('Development mode: Server should be started manually with npm run dev:backend');
    return;
  }

  try {
    addLog('INFO', 'SERVER', 'Starting integrated server...');
    serverInstance = await startIntegratedServer(isDev);
    addLog('INFO', 'SERVER', 'Integrated server started successfully');
    
    // Server is now running in the same process!
    // No need for spawn, process management, etc.
  } catch (error) {
    addLog('ERROR', 'SERVER', `Failed to start integrated server: ${error.message}`);
    console.error('Server startup error:', error);
  }
}

// Stop the integrated server
async function stopServer() {
  if (serverInstance) {
    try {
      await stopIntegratedServer();
      serverInstance = null;
      addLog('INFO', 'SERVER', 'Integrated server stopped');
    } catch (error) {
      addLog('ERROR', 'SERVER', `Error stopping server: ${error.message}`);
    }
  }
}

// Show debug logs in a window
function showDebugLogs() {
  const logWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    parent: mainWindow,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const logsHtml = generateLogsHtml();
  // Properly encode the HTML content for data URL
  const encodedLogsHtml = encodeURIComponent(logsHtml);
  logWindow.loadURL(`data:text/html;charset=utf-8,${encodedLogsHtml}`);

  logWindow.once('ready-to-show', () => {
    logWindow.show();
  });

  // Add error handling
  logWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Debug logs window failed to load:', errorCode, errorDescription);
    addLog('ERROR', 'DEBUG', `Failed to load debug logs window: ${errorDescription}`);
  });

  // Auto-refresh logs every 2 seconds
  const refreshInterval = setInterval(() => {
    if (!logWindow.isDestroyed()) {
      const updatedLogsHtml = generateLogsHtml();
      const encodedUpdatedLogsHtml = encodeURIComponent(updatedLogsHtml);
      logWindow.loadURL(`data:text/html;charset=utf-8,${encodedUpdatedLogsHtml}`);
    } else {
      clearInterval(refreshInterval);
    }
  }, 2000);
}

// Export logs to file
async function exportLogsToFile() {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Debug Logs',
      defaultPath: `tank-monitor-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      const logsText = debugLogs.map(log =>
        `[${log.timestamp}] [${log.level}] [${log.source}] ${log.message}`
      ).join('\n');

      await fsPromises.writeFile(result.filePath, logsText, 'utf8');

      addLog('INFO', 'EXPORT', `Logs exported to: ${result.filePath}`);

      // Show success dialog
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Export Successful',
        message: 'Debug logs have been exported successfully!',
        detail: `File saved to: ${result.filePath}`,
        buttons: ['OK']
      });
    }
  } catch (error) {
    addLog('ERROR', 'EXPORT', `Failed to export logs: ${error.message}`);

    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Export Failed',
      message: 'Failed to export debug logs',
      detail: error.message,
      buttons: ['OK']
    });
  }
}

// Generate HTML for logs display
function generateLogsHtml() {
  const logsHtml = debugLogs.slice(-200).map(log => {
    const levelClass = log.level === 'ERROR' ? 'error' :
                      log.level === 'WARN' ? 'warning' : 'info';

    return `
      <div class="log-entry ${levelClass}">
        <span class="timestamp">${new Date(log.timestamp).toLocaleString()}</span>
        <span class="level">${log.level}</span>
        <span class="source">${log.source}</span>
        <span class="message">${log.message}</span>
      </div>
    `;
  }).join('');

  return `
    <html>
      <head>
        <title>Debug Logs - Tank Monitoring System</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 20px;
            background: #1a1a1a;
            color: #e0e0e0;
            font-size: 12px;
            line-height: 1.4;
          }
          .header {
            background: #2d2d2d;
            padding: 15px;
            margin: -20px -20px 20px -20px;
            border-bottom: 2px solid #444;
          }
          .header h1 {
            margin: 0;
            color: #fff;
            font-size: 18px;
          }
          .header p {
            margin: 5px 0 0 0;
            color: #aaa;
            font-size: 14px;
          }
          .log-entry {
            padding: 8px;
            margin: 2px 0;
            border-left: 3px solid #555;
            background: #2a2a2a;
            border-radius: 3px;
          }
          .log-entry.error {
            border-left-color: #ff4444;
            background: #2a1a1a;
          }
          .log-entry.warning {
            border-left-color: #ffaa00;
            background: #2a2a1a;
          }
          .log-entry.info {
            border-left-color: #4488ff;
            background: #1a1a2a;
          }
          .timestamp {
            color: #888;
            margin-right: 10px;
          }
          .level {
            font-weight: bold;
            margin-right: 10px;
            min-width: 50px;
            display: inline-block;
          }
          .error .level { color: #ff6666; }
          .warning .level { color: #ffcc66; }
          .info .level { color: #66aaff; }
          .source {
            color: #aaa;
            margin-right: 10px;
            min-width: 80px;
            display: inline-block;
          }
          .message {
            color: #fff;
          }
          .controls {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #555;
          }
          .controls button {
            background: #555;
            color: white;
            border: none;
            padding: 5px 10px;
            margin: 0 5px;
            border-radius: 3px;
            cursor: pointer;
          }
          .controls button:hover {
            background: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔍 Debug Logs - Tank Monitoring System</h1>
          <p>Showing last 200 log entries • Auto-refreshes every 2 seconds • Total logs: ${debugLogs.length}</p>
        </div>

        <div class="controls">
          <button onclick="window.location.reload()">🔄 Refresh</button>
          <button onclick="window.scrollTo(0, document.body.scrollHeight)">⬇️ Scroll to Bottom</button>
        </div>

        <div class="logs">
          ${logsHtml || '<div class="log-entry info"><span class="message">No logs available yet...</span></div>'}
        </div>

        <script>
          // Auto-scroll to bottom on load
          window.addEventListener('load', () => {
            window.scrollTo(0, document.body.scrollHeight);
          });
        </script>
      </body>
    </html>
  `;
}

// Create help window with different content
function createHelpWindow(type) {
  const helpWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: mainWindow,
    modal: true,
    show: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const helpContent = getHelpContent(type);
  // Properly encode the HTML content for data URL
  const encodedContent = encodeURIComponent(helpContent);
  helpWindow.loadURL(`data:text/html;charset=utf-8,${encodedContent}`);

  helpWindow.once('ready-to-show', () => {
    helpWindow.show();
  });

  // Add error handling
  helpWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Help window failed to load:', errorCode, errorDescription);
  });
}

// Get help content based on type
function getHelpContent(type) {
  const baseStyle = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        padding: 40px;
        margin: 0;
        background: #f8fafc;
        color: #334155;
      }
      h1 { color: #1e293b; margin-bottom: 20px; }
      h2 { color: #475569; margin-top: 30px; margin-bottom: 15px; }
      h3 { color: #64748b; margin-top: 20px; margin-bottom: 10px; }
      .highlight { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 15px 0; }
      .warning { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
      .success { background: #d1fae5; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
      code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; }
      ul { margin: 10px 0; padding-left: 20px; }
      li { margin: 5px 0; }
    </style>
  `;

  switch(type) {
    case 'getting-started':
      return `
        <html>
          <head><title>Getting Started</title>${baseStyle}</head>
          <body>
            <h1>🚀 Getting Started with Tank Monitoring System</h1>

            <div class="success">
              <h3>✅ Quick Start (No Installation Required)</h3>
              <p>This is a <strong>portable application</strong> - just double-click the .exe file to start!</p>
            </div>

            <h2>📋 First Time Setup</h2>
            <ol>
              <li><strong>Start the Application</strong> - Double-click the .exe file</li>
              <li><strong>Wait for Server</strong> - Allow 10-15 seconds for the server to start</li>
              <li><strong>Dashboard Opens</strong> - The main dashboard will appear automatically</li>
              <li><strong>Configure Data Source</strong> - Click the Settings button to set up your data source</li>
            </ol>

            <h2>🔌 Data Source Options</h2>
            <h3>Serial Port Communication</h3>
            <ul>
              <li>Connect your device to a COM port</li>
              <li>Go to Settings → Serial Configuration</li>
              <li>Select the correct COM port and baud rate</li>
              <li>Click Connect to start receiving data</li>
            </ul>

            <h3>CSV File Import</h3>
            <ul>
              <li>Place your data files in an accessible folder</li>
              <li>Go to Settings → Data Source</li>
              <li>Select "CSV File" and browse to your file</li>
              <li>Configure the import interval and format</li>
            </ul>

            <h2>🎛️ Using the Dashboard</h2>
            <ul>
              <li><strong>View Modes</strong> - Switch between grid, list, and column views</li>
              <li><strong>Tank Reordering</strong> - Drag tanks to rearrange them</li>
              <li><strong>Tank Renaming</strong> - Click the edit icon to rename tanks</li>
              <li><strong>Alarms</strong> - Monitor tank levels and receive alerts</li>
            </ul>

            <div class="highlight">
              <h3>💡 Pro Tip</h3>
              <p>The application runs a local server on ports 3001 and 3002. If you see connection errors, make sure these ports aren't blocked by your firewall.</p>
            </div>
          </body>
        </html>
      `;

    case 'requirements':
      return `
        <html>
          <head><title>System Requirements</title>${baseStyle}</head>
          <body>
            <h1>💻 System Requirements</h1>

            <h2>🔧 Minimum Requirements</h2>
            <ul>
              <li><strong>Operating System:</strong> Windows 10 (version 1903+) or Windows 11</li>
              <li><strong>Architecture:</strong> 64-bit (x64) processor</li>
              <li><strong>Memory:</strong> 4 GB RAM minimum, 8 GB recommended</li>
              <li><strong>Storage:</strong> 500 MB free disk space</li>
              <li><strong>Network:</strong> No internet required after installation</li>
            </ul>

            <h2>🔌 Hardware Requirements (Optional)</h2>
            <h3>For Serial Communication</h3>
            <ul>
              <li>USB-to-Serial adapter (if no built-in COM port)</li>
              <li>Proper drivers for your serial adapter</li>
              <li>Compatible tank monitoring hardware</li>
            </ul>

            <h3>For File Import</h3>
            <ul>
              <li>Access to data files (.txt, .csv, .json)</li>
              <li>File system permissions to read data files</li>
            </ul>

            <h2>🌐 Network Ports</h2>
            <div class="highlight">
              <p>The application uses these local ports:</p>
              <ul>
                <li><strong>Port 3001:</strong> Web interface and API</li>
                <li><strong>Port 3002:</strong> WebSocket connections</li>
              </ul>
              <p>These ports must be available and not blocked by firewall.</p>
            </div>

            <h2>🛡️ Security Considerations</h2>
            <ul>
              <li>Windows Defender may show warnings for unsigned applications</li>
              <li>Firewall may request permission for network access</li>
              <li>Antivirus software may scan the executable</li>
            </ul>

            <div class="warning">
              <h3>⚠️ Important Notes</h3>
              <ul>
                <li>32-bit Windows systems are not supported</li>
                <li>Windows 7/8 are not officially supported</li>
                <li>Administrator rights may be required for serial port access</li>
              </ul>
            </div>
          </body>
        </html>
      `;

    case 'troubleshooting':
      return `
        <html>
          <head><title>Troubleshooting</title>${baseStyle}</head>
          <body>
            <h1>🔧 Troubleshooting Guide</h1>

            <h2>❌ Application Won't Start</h2>
            <div class="warning">
              <h3>Possible Causes & Solutions:</h3>
              <ul>
                <li><strong>Windows Defender blocking:</strong> Click "More info" → "Run anyway"</li>
                <li><strong>32-bit system:</strong> This app requires 64-bit Windows</li>
                <li><strong>Corrupted download:</strong> Re-download the application</li>
                <li><strong>Insufficient permissions:</strong> Right-click → "Run as administrator"</li>
              </ul>
            </div>

            <h2>🌐 Server Connection Issues</h2>
            <h3>Error: "Server offline" or "Connection failed"</h3>
            <ul>
              <li><strong>Wait longer:</strong> Server startup can take 15-30 seconds</li>
              <li><strong>Check ports:</strong> Ensure ports 3001/3002 are available</li>
              <li><strong>Close other instances:</strong> Only run one copy at a time</li>
              <li><strong>Restart application:</strong> Close completely and restart</li>
            </ul>

            <h2>📡 Serial Port Problems</h2>
            <h3>COM port not detected</h3>
            <ul>
              <li>Install proper drivers for your USB-to-Serial adapter</li>
              <li>Check Device Manager for COM port availability</li>
              <li>Try a different USB port</li>
              <li>Restart the application after connecting hardware</li>
            </ul>

            <h3>Connection timeout</h3>
            <ul>
              <li>Verify baud rate settings match your device</li>
              <li>Check data bits, stop bits, and parity settings</li>
              <li>Ensure no other software is using the COM port</li>
            </ul>

            <h2>📁 File Import Issues</h2>
            <h3>CSV file not loading</h3>
            <ul>
              <li>Check file permissions - ensure the file is readable</li>
              <li>Verify file format matches configuration</li>
              <li>Try moving the file to a different location</li>
              <li>Check if file is locked by another application</li>
            </ul>

            <h2>🔍 Getting Debug Information</h2>
            <div class="highlight">
              <h3>To get detailed error logs:</h3>
              <ol>
                <li>Open Command Prompt (cmd)</li>
                <li>Navigate to the application folder</li>
                <li>Run: <code>"Tank Monitoring System 1.0.0.exe"</code></li>
                <li>Watch the console output for error messages</li>
              </ol>
            </div>

            <h2>🆘 Still Having Issues?</h2>
            <div class="success">
              <p>If problems persist:</p>
              <ul>
                <li>Check Windows Event Viewer for system errors</li>
                <li>Temporarily disable antivirus software</li>
                <li>Try running from a different folder location</li>
                <li>Ensure Windows is up to date</li>
              </ul>
            </div>
          </body>
        </html>
      `;

    case 'changelog':
      return `
        <html>
          <head><title>What's New</title>${baseStyle}</head>
          <body>
            <h1>🆕 What's New in Tank Monitoring System</h1>

            <div class="success">
              <h2>Version 1.4.1 - Latest Release</h2>
              <p><strong>Release Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <h3>🔍 New Debug & Logging Features</h3>
            <ul>
              <li><strong>Built-in Debug Logs Viewer</strong> - Access via Help → Show Debug Logs</li>
              <li><strong>Export Logs to File</strong> - Save debug information for troubleshooting</li>
              <li><strong>Real-time Log Monitoring</strong> - Auto-refreshing log window</li>
              <li><strong>Categorized Logging</strong> - Server, App, and Diagnosis logs</li>
              <li><strong>No More Terminal Required</strong> - Debug without command line</li>
            </ul>

            <h3>🎨 Logo & Branding Improvements</h3>
            <ul>
              <li><strong>Smart Logo Display</strong> - Automatic detection of square vs round logos</li>
              <li><strong>Better Logo Styling</strong> - Proper aspect ratio preservation</li>
              <li><strong>API-based Branding</strong> - Server-side storage for consistency</li>
              <li><strong>Cross-platform Branding</strong> - Works on both Windows and Linux</li>
            </ul>

            <h3>🔧 Windows Compatibility Fixes</h3>
            <ul>
              <li><strong>Improved Server Startup</strong> - Better ES module support on Windows</li>
              <li><strong>Bundled Dependencies</strong> - All required modules included</li>
              <li><strong>Enhanced Error Handling</strong> - More detailed error messages</li>
              <li><strong>Path Resolution Fixes</strong> - Better Windows path handling</li>
            </ul>

            <h3>📚 Enhanced Help System</h3>
            <ul>
              <li><strong>Comprehensive Help Menu</strong> - Getting Started, Requirements, Troubleshooting</li>
              <li><strong>System Requirements Guide</strong> - Clear hardware and software requirements</li>
              <li><strong>Troubleshooting Guide</strong> - Step-by-step problem solving</li>
              <li><strong>What's New Section</strong> - This changelog you're reading now!</li>
            </ul>

            <div class="highlight">
              <h3>💡 How to Use New Features</h3>
              <ul>
                <li><strong>View Debug Logs:</strong> Help → Show Debug Logs</li>
                <li><strong>Export Logs:</strong> Help → Export Logs to File</li>
                <li><strong>Upload Smart Logos:</strong> Settings → Branding → Choose File</li>
                <li><strong>Access Help:</strong> Help menu in the top menu bar</li>
              </ul>
            </div>

            <hr style="margin: 30px 0; border: 1px solid #e2e8f0;">

            <h2>📋 Previous Versions</h2>

            <h3>Version 1.0.0 - Initial Release</h3>
            <ul>
              <li>Real-time tank monitoring dashboard</li>
              <li>Serial port communication support</li>
              <li>CSV file import functionality</li>
              <li>Multiple view modes (grid, list, column)</li>
              <li>Configurable alarms and thresholds</li>
              <li>Tank reordering and renaming</li>
              <li>Custom branding support</li>
              <li>Cross-platform support (Windows, Linux)</li>
            </ul>

            <div class="success">
              <h3>🚀 Coming Soon</h3>
              <p>Future updates may include:</p>
              <ul>
                <li>Historical data charts and trends</li>
                <li>Advanced alarm configurations</li>
                <li>Data export capabilities</li>
                <li>Network monitoring support</li>
                <li>Mobile companion app</li>
              </ul>
            </div>
          </body>
        </html>
      `;

    case 'about':
    default:
      return `
        <html>
          <head><title>About</title>${baseStyle}</head>
          <body style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <h1 style="font-size: 32px; margin-bottom: 20px;">Tank Monitoring System</h1>
            <p style="font-size: 20px; font-weight: bold; margin-bottom: 30px;">Version 1.4.1</p>

            <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; margin: 30px auto; max-width: 500px;">
              <h2>🚢 Professional Maritime Tank Monitoring</h2>
              <p>Real-time tank level monitoring dashboard designed for ship crews and maritime operations.</p>
            </div>

            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 400px;">
              <h3>🛠️ Built With</h3>
              <ul style="list-style: none; padding: 0;">
                <li>⚡ Electron - Desktop application framework</li>
                <li>⚛️ React - User interface library</li>
                <li>🟢 Node.js - Server runtime</li>
                <li>🎨 Tailwind CSS - Styling framework</li>
              </ul>
            </div>

            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 400px;">
              <h3>✨ Features</h3>
              <ul style="list-style: none; padding: 0;">
                <li>📊 Real-time tank monitoring</li>
                <li>🔌 Serial port communication</li>
                <li>📁 CSV file import</li>
                <li>🚨 Configurable alarms</li>
                <li>🎛️ Multiple view modes</li>
                <li>🏷️ Custom branding support</li>
              </ul>
            </div>

            <p style="margin-top: 40px; opacity: 0.8;">© 2024 Tank Monitoring Team</p>
          </body>
        </html>
      `;
  }
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          click: () => {
            shell.openExternal('http://localhost:3001/settings');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Getting Started',
          click: () => {
            createHelpWindow('getting-started');
          }
        },
        {
          label: 'System Requirements',
          click: () => {
            createHelpWindow('requirements');
          }
        },
        {
          label: 'Troubleshooting',
          click: () => {
            createHelpWindow('troubleshooting');
          }
        },
        {
          label: 'What\'s New',
          click: () => {
            createHelpWindow('changelog');
          }
        },
        { type: 'separator' },
        {
          label: 'Show Debug Logs',
          click: () => {
            showDebugLogs();
          }
        },
        {
          label: 'Export Logs to File',
          click: () => {
            exportLogsToFile();
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            checkForUpdatesManually();
          }
        },
        {
          label: 'About Tank Monitoring System',
          click: () => {
            createHelpWindow('about');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
  addLog('INFO', 'APP', 'Electron app ready, initializing...');
  await setupHotReload();
  createWindow();
  createMenu();
  startServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopServer();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('http://localhost:')) {
    // Allow localhost certificates
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// IPC Handlers for file system operations
ipcMain.handle('show-open-dialog', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Data Files', extensions: ['txt', 'csv', 'json'] },
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      ...options
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, filePath: result.filePaths[0] };
    } else {
      return { success: false, canceled: true };
    }
  } catch (error) {
    console.error('Error showing open dialog:', error);
    return { success: false, error: error.message };
  }
});

// Export for testing
export { createWindow, startServer, stopServer };