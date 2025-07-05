# 🪟 Windows Troubleshooting Guide

## 🚀 **Fixed Issues in Latest Build**

The Windows executable has been updated to fix the server startup issue. Here's what was changed:

### **✅ Server Startup Fixes:**
1. **Correct Server Path**: Fixed path resolution for packaged app
2. **Server Ready Detection**: Added waiting for server to be ready before loading UI
3. **Better Error Logging**: Enhanced logging for debugging
4. **Resource Path**: Uses `process.resourcesPath` for packaged apps

## 🔧 **How to Test the Windows App**

### **1. Download the Latest Build:**
- **Portable**: `Tank Monitoring System 1.0.0.exe` (69 MB)
- **Installer**: `Tank Monitoring System Setup 1.0.0.exe` (69 MB)

### **2. Run the Application:**
```cmd
# For portable version:
"Tank Monitoring System 1.0.0.exe"

# For installer version:
"Tank Monitoring System Setup 1.0.0.exe"
```

### **3. What Should Happen:**
1. ✅ **App window opens** (may take 2-3 seconds)
2. ✅ **Backend server starts automatically** in the background
3. ✅ **Dashboard loads** showing tank monitoring interface
4. ✅ **Settings accessible** via File → Settings menu

## 🐛 **If Issues Persist:**

### **Check Server Status:**
1. Open Task Manager
2. Look for `node.exe` process (this is the backend server)
3. If missing, the server failed to start

### **Manual Server Test:**
```cmd
# Navigate to app directory and test server manually
cd "C:\path\to\app\resources\server"
node index.js
```

### **Check Ports:**
```cmd
# Check if ports are in use
netstat -an | findstr :3001
netstat -an | findstr :3002
```

### **Firewall/Antivirus:**
- **Windows Defender**: May block the app initially
- **Corporate Firewall**: May block localhost connections
- **Antivirus**: May quarantine the executable

### **Run with Admin Rights:**
- Right-click → "Run as administrator"
- This can help with permission issues

## 📋 **Expected Behavior:**

### **Startup Sequence:**
1. **Electron app starts** (main window)
2. **Backend server launches** (Node.js process)
3. **Server ready check** (waits for HTTP 200)
4. **Frontend loads** (React dashboard)
5. **WebSocket connects** (real-time updates)

### **File Structure in Packaged App:**
```
Tank Monitoring System.exe
├── resources/
│   ├── app.asar (frontend)
│   └── server/
│       ├── index.js (backend)
│       ├── config.json (settings)
│       └── settings.html (config UI)
```

## 🔍 **Debug Information:**

### **Console Output:**
The app now logs detailed information:
- Server startup path
- Server working directory
- Server PID when started
- Server ready confirmation
- Any error messages

### **Log Files:**
- Windows: `%APPDATA%\tank-monitoring-system\logs\`
- Check for error logs if app fails to start

## 📞 **Getting Help:**

If the app still doesn't work:

1. **Check Windows Event Viewer**:
   - Windows Logs → Application
   - Look for errors from "Tank Monitoring System"

2. **Run from Command Line**:
   ```cmd
   "Tank Monitoring System 1.0.0.exe" --verbose
   ```

3. **Provide Debug Info**:
   - Windows version
   - Error messages
   - Task Manager screenshot
   - Event Viewer logs

## ✅ **Success Indicators:**

When working correctly, you should see:
- ✅ Tank monitoring dashboard
- ✅ Settings page accessible
- ✅ Real-time data updates
- ✅ CSV file import working
- ✅ Serial port detection

The latest build should resolve the server startup issues on Windows! 🎉
