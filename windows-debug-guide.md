# 🔧 Windows Debug Guide - Tank Monitoring System

## 🎯 Issue Analysis

Based on Wine testing, the application **works correctly** and the integrated server **responds properly**. The 503 error on Windows is likely due to:

1. **Windows Firewall blocking the integrated server**
2. **Antivirus software interfering**
3. **Port conflicts (3001/3002 already in use)**
4. **Windows networking configuration**

## 🔍 Diagnostic Steps for Windows

### Step 1: Check if Server is Running
Open Command Prompt as Administrator and run:
```cmd
netstat -an | findstr :3001
netstat -an | findstr :3002
```

**Expected Result:**
```
TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING
TCP    0.0.0.0:3002           0.0.0.0:0              LISTENING
```

### Step 2: Test API Endpoints
Open Command Prompt and test:
```cmd
curl http://localhost:3001/api/tanks
curl http://localhost:3001/api/status
curl http://localhost:3001/
```

**Expected Result:** JSON responses, not 503 errors

### Step 3: Check Windows Firewall
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Look for "Tank Monitoring System" 
4. If not found, click "Change Settings" → "Allow another app"
5. Browse to the .exe file and add it

### Step 4: Check Antivirus
Temporarily disable antivirus and test the application

### Step 5: Check Application Logs
The application creates logs. Look for:
- Console output when starting the app
- Any error messages in the Electron developer console (Ctrl+Shift+I)

## 🛠️ Quick Fixes to Try

### Fix 1: Run as Administrator
Right-click the .exe file and select "Run as administrator"

### Fix 2: Add Firewall Exception
```cmd
netsh advfirewall firewall add rule name="Tank Monitoring System" dir=in action=allow program="C:\path\to\Tank Monitoring System.exe"
```

### Fix 3: Check Port Conflicts
```cmd
netstat -ano | findstr :3001
netstat -ano | findstr :3002
```
If ports are in use, kill the processes:
```cmd
taskkill /PID <process_id> /F
```

### Fix 4: Reset Network Stack
```cmd
netsh winsock reset
netsh int ip reset
```
(Requires restart)

## 🔧 Advanced Debugging

### Enable Debug Logging
Create a batch file to start with debug logging:
```batch
@echo off
set DEBUG=*
set NODE_ENV=development
"Tank Monitoring System.exe"
pause
```

### Check Developer Console
1. Start the application
2. Press Ctrl+Shift+I to open developer tools
3. Check Console tab for JavaScript errors
4. Check Network tab for failed requests

## 📊 Expected Behavior

When working correctly, you should see:
1. **Application window opens**
2. **12 empty tanks displayed** (this is normal - no data source configured)
3. **Totals dashboard shows 0.0 m³ and 0.0 MT**
4. **Settings sidebar accessible**
5. **No 503 errors in browser console**

## 🎯 Data Source Configuration

The "No data source configured" message is **normal**. To configure a data source:

1. Click the settings icon (⚙️) in the top-right
2. Go to "Data Source" tab
3. Configure your data source (file, API, etc.)
4. Or use the sample data for testing

## 🚨 Common Windows Issues

### Issue 1: Port Already in Use
**Symptoms:** Server fails to start, 503 errors
**Solution:** Change ports in configuration or kill conflicting processes

### Issue 2: Firewall Blocking
**Symptoms:** Server starts but API calls fail
**Solution:** Add firewall exception

### Issue 3: Antivirus Interference
**Symptoms:** Application crashes or behaves strangely
**Solution:** Add application to antivirus whitelist

### Issue 4: Missing Dependencies
**Symptoms:** Application won't start
**Solution:** Install Visual C++ Redistributable

## 📞 Support Information

If issues persist, collect this information:
1. Windows version
2. Antivirus software
3. Firewall settings
4. Console output from the application
5. Network configuration (corporate network, VPN, etc.)

## ✅ Verification Checklist

- [ ] Application starts without errors
- [ ] Ports 3001 and 3002 are listening
- [ ] API endpoints respond (not 503)
- [ ] Firewall allows the application
- [ ] Antivirus doesn't block the application
- [ ] 12 empty tanks are displayed
- [ ] Settings sidebar is accessible
- [ ] No JavaScript errors in console
