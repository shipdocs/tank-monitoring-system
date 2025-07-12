#!/bin/bash

# Test Windows Executable with Wine
# Debug datasource and API issues

echo "🍷 TESTING WINDOWS EXECUTABLE WITH WINE"
echo "========================================"

# Set Wine environment
export WINEDEBUG=-all
export DISPLAY=:0

echo ""
echo "🔍 Step 1: Wine Environment Check"
echo "Wine version: $(wine --version)"
echo "Wine prefix: $WINEPREFIX"

echo ""
echo "🔍 Step 2: Testing Windows Executable"
echo "Executable: dist-electron/win-unpacked/Tank Monitoring System.exe"

# Check if executable exists
if [ ! -f "dist-electron/win-unpacked/Tank Monitoring System.exe" ]; then
    echo "❌ Windows executable not found!"
    exit 1
fi

echo "✅ Windows executable found"

echo ""
echo "🔍 Step 3: Running Windows Executable with Wine"
echo "Starting application..."

# Run the Windows executable with Wine
cd "dist-electron/win-unpacked"
wine "Tank Monitoring System.exe" &
WINE_PID=$!

echo "✅ Application started with PID: $WINE_PID"
echo ""
echo "🔍 Step 4: Monitoring Application"
echo "Application will run for 30 seconds for testing..."

# Wait for application to start
sleep 10

echo ""
echo "🔍 Step 5: Testing API Endpoints"
echo "Checking if integrated server is running..."

# Test API endpoints
echo "Testing localhost:3001/api/tanks..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3001/api/tanks || echo "❌ API not accessible"

echo "Testing localhost:3001/api/status..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3001/api/status || echo "❌ Status API not accessible"

echo "Testing localhost:3001/..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3001/ || echo "❌ Server not accessible"

echo ""
echo "🔍 Step 6: Checking Wine Processes"
ps aux | grep -i wine | grep -v grep

echo ""
echo "🔍 Step 7: Checking Network Connections"
netstat -tlnp | grep :3001 || echo "❌ No process listening on port 3001"

echo ""
echo "🔍 Step 8: Waiting for manual testing..."
echo "Application is running. Check the GUI for:"
echo "  - Does the application window open?"
echo "  - Are there any error messages?"
echo "  - Does the datasource configuration work?"
echo "  - Can you see tank data?"
echo ""
echo "Press Ctrl+C to stop the test or wait 20 more seconds..."

# Wait for manual testing
sleep 20

echo ""
echo "🔍 Step 9: Cleanup"
echo "Stopping Wine processes..."

# Kill the Wine process
kill $WINE_PID 2>/dev/null || echo "Process already stopped"

# Kill any remaining Wine processes
pkill -f "Tank Monitoring System.exe" 2>/dev/null || echo "No remaining processes"

echo ""
echo "✅ Wine test completed"
echo ""
echo "🔍 Summary:"
echo "  - Check if the application window opened"
echo "  - Look for any error messages in the console above"
echo "  - Note any API connection issues"
echo "  - Check if datasource configuration is accessible"
