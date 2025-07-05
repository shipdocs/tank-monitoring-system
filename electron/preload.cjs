const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App information
  getAppVersion: () => {
    return process.env.npm_package_version || '1.0.0';
  },

  // Platform information
  getPlatform: () => {
    return process.platform;
  },

  // Open external links
  openExternal: (url) => {
    ipcRenderer.invoke('open-external', url);
  },

  // Window controls
  minimizeWindow: () => {
    ipcRenderer.invoke('minimize-window');
  },

  maximizeWindow: () => {
    ipcRenderer.invoke('maximize-window');
  },

  closeWindow: () => {
    ipcRenderer.invoke('close-window');
  },

  // Settings
  openSettings: () => {
    ipcRenderer.invoke('open-settings');
  },

  // Development helpers
  isDev: () => {
    return process.env.NODE_ENV === 'development';
  }
});

// Expose a limited API for tank monitoring specific features
contextBridge.exposeInMainWorld('tankMonitorAPI', {
  // Server communication helpers
  getServerStatus: () => {
    return ipcRenderer.invoke('get-server-status');
  },

  // File system helpers
  showOpenDialog: (options) => {
    return ipcRenderer.invoke('show-open-dialog', options);
  },

  // Notification helpers (for future use)
  showNotification: (title, body) => {
    return ipcRenderer.invoke('show-notification', { title, body });
  }
});

// Security: Remove any Node.js APIs that might have been exposed
delete window.require;
delete window.exports;
delete window.module;

// Log that preload script has loaded (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('Preload script loaded successfully');
}