#!/bin/bash

# Test Tank Monitoring System v1.2.3 with Wine
# Check for errors and verify functionality

echo "🍷 TESTING TANK MONITORING SYSTEM v1.2.3 WITH WINE"
echo "=================================================="

# Check if Wine is installed
if ! command -v wine &> /dev/null; then
    echo "❌ Wine is not installed. Please install wine first."
    exit 1
fi

# Check if the executable exists
EXE_PATH="dist-electron/Tank Monitoring System 1.2.3.exe"
if [ ! -f "$EXE_PATH" ]; then
    echo "❌ Executable not found: $EXE_PATH"
    echo "Please build the application first with: npx electron-builder --win --publish=never"
    exit 1
fi

echo "✅ Found executable: $EXE_PATH"
echo "📊 File size: $(du -h "$EXE_PATH" | cut -f1)"

# Create a clean Wine prefix for testing
export WINEPREFIX="$HOME/.wine-tankmon-test"
echo "🍷 Using Wine prefix: $WINEPREFIX"

# Initialize Wine prefix if it doesn't exist
if [ ! -d "$WINEPREFIX" ]; then
    echo "🔧 Initializing Wine prefix..."
    winecfg /v win10 2>/dev/null
fi

echo ""
echo "🚀 Starting Tank Monitoring System v1.2.3..."
echo "============================================"

# Start the application with Wine and capture output
echo "📋 Command: wine '$EXE_PATH'"
echo "⏰ Starting at: $(date)"
echo ""

# Run with timeout to prevent hanging
timeout 60s wine "$EXE_PATH" 2>&1 | while IFS= read -r line; do
    timestamp=$(date '+%H:%M:%S')
    echo "[$timestamp] $line"
    
    # Check for specific error patterns
    if echo "$line" | grep -qi "error\|exception\|crash\|fail"; then
        echo "🚨 POTENTIAL ERROR DETECTED: $line"
    fi
    
    # Check for successful startup indicators
    if echo "$line" | grep -qi "server.*start\|listening\|ready"; then
        echo "✅ SERVER STARTUP DETECTED: $line"
    fi
    
    # Check for auto-update related messages
    if echo "$line" | grep -qi "update\|version"; then
        echo "🔄 UPDATE MESSAGE: $line"
    fi
done

echo ""
echo "⏰ Test completed at: $(date)"

# Check if any Wine processes are still running
WINE_PROCESSES=$(pgrep -f "Tank Monitoring System" || true)
if [ -n "$WINE_PROCESSES" ]; then
    echo "🔍 Wine processes still running:"
    ps aux | grep -E "(Tank Monitoring System|wine)" | grep -v grep
    echo ""
    echo "🛑 Killing remaining processes..."
    pkill -f "Tank Monitoring System" 2>/dev/null || true
    sleep 2
fi

echo ""
echo "🔍 WINE TEST SUMMARY"
echo "==================="

# Check Wine logs for errors
WINE_LOG="$HOME/.wine-tankmon-test/drive_c/windows/temp/wine.log"
if [ -f "$WINE_LOG" ]; then
    echo "📋 Wine log found, checking for errors..."
    if grep -qi "error\|exception\|crash" "$WINE_LOG"; then
        echo "⚠️ Errors found in Wine log:"
        grep -i "error\|exception\|crash" "$WINE_LOG" | tail -5
    else
        echo "✅ No critical errors in Wine log"
    fi
else
    echo "ℹ️ No Wine log found"
fi

# Test network connectivity (check if ports are available)
echo ""
echo "🌐 Network Port Check:"
if netstat -tuln 2>/dev/null | grep -q ":3001"; then
    echo "✅ Port 3001 is in use (likely by the application)"
else
    echo "❌ Port 3001 is not in use"
fi

if netstat -tuln 2>/dev/null | grep -q ":3002"; then
    echo "✅ Port 3002 is in use (likely by the application)"
else
    echo "❌ Port 3002 is not in use"
fi

echo ""
echo "🎯 WINE TEST RECOMMENDATIONS:"
echo "============================="
echo "✅ If you saw 'SERVER STARTUP DETECTED' messages, the app is working"
echo "✅ If ports 3001/3002 are in use, the integrated server started"
echo "⚠️ If you saw 'POTENTIAL ERROR DETECTED' messages, investigate those"
echo "🔧 If the app didn't start, check Wine configuration and dependencies"

echo ""
echo "📋 Next Steps:"
echo "- If test passed: Commit the TypeScript fixes and push"
echo "- If test failed: Investigate errors and fix before pushing"
echo "- Test auto-update functionality with stable version detection"

echo ""
echo "🍷 Wine test completed!"
