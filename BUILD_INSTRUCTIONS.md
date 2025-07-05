# 🚀 Tank Monitoring System - Build Instructions

## 📦 Available Builds

### ✅ **Linux (Ready to Use)**
- **File**: `dist-electron/Tank Monitoring System-1.0.0.AppImage`
- **Size**: ~104 MB
- **Usage**: 
  ```bash
  chmod +x "Tank Monitoring System-1.0.0.AppImage"
  ./Tank\ Monitoring\ System-1.0.0.AppImage
  ```

## 🪟 **Building Windows Executable**

### **Option 1: Build on Windows Machine (Recommended)**

1. **Install Prerequisites on Windows:**
   - [Node.js 18+](https://nodejs.org/)
   - [Git](https://git-scm.com/)

2. **Clone and Build:**
   ```cmd
   git clone <your-repo-url>
   cd tank-monitoring-system
   npm install
   npm run electron:dist -- --win
   ```

3. **Output Files:**
   - `Tank Monitoring System-1.0.0.exe` (portable)
   - `Tank Monitoring System Setup 1.0.0.exe` (installer)

### **Option 2: GitHub Actions (Automated)**

1. **Push to GitHub** with the included `.github/workflows/build.yml`
2. **Create a Release Tag:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. **Download** built executables from GitHub Actions artifacts

### **Option 3: Install Wine on Linux (Advanced)**

```bash
# Install Wine (takes ~10 minutes)
sudo apt update
sudo apt install wine

# Build Windows executable
npm run electron:dist -- --win
```

## 🍎 **Building macOS Application**

**Requirements:** macOS machine with Xcode Command Line Tools

```bash
npm run electron:dist -- --mac
```

**Output:** `Tank Monitoring System-1.0.0.dmg`

## 🔧 **Build All Platforms**

Use the included build script:

```bash
npm run build:all
```

This will:
- ✅ Build for current platform
- ⚠️ Skip platforms that require special setup
- 📊 Show file sizes and locations

## 📁 **Output Directory Structure**

```
dist-electron/
├── Tank Monitoring System-1.0.0.AppImage     # Linux
├── Tank Monitoring System-1.0.0.exe          # Windows Portable
├── Tank Monitoring System Setup 1.0.0.exe    # Windows Installer
├── Tank Monitoring System-1.0.0.dmg          # macOS
├── win-unpacked/                              # Windows Unpacked
├── linux-unpacked/                           # Linux Unpacked
└── mac/                                       # macOS Unpacked
```

## 🎯 **Quick Start for End Users**

### **Linux:**
```bash
./Tank\ Monitoring\ System-1.0.0.AppImage
```

### **Windows:**
- Double-click `Tank Monitoring System-1.0.0.exe`
- Or run the installer `Tank Monitoring System Setup 1.0.0.exe`

### **macOS:**
- Open `Tank Monitoring System-1.0.0.dmg`
- Drag app to Applications folder

## 🔍 **Troubleshooting**

### **"App can't be opened" (macOS)**
```bash
sudo xattr -rd com.apple.quarantine "/Applications/Tank Monitoring System.app"
```

### **"Windows protected your PC" (Windows)**
- Click "More info" → "Run anyway"
- Or right-click → Properties → Unblock

### **Permission denied (Linux)**
```bash
chmod +x "Tank Monitoring System-1.0.0.AppImage"
```

## 📊 **Features Included**

- ✅ **Real-time Tank Monitoring**
- ✅ **CSV File Import System**
- ✅ **Serial Port Communication**
- ✅ **Auto-discovery & Column Mapping**
- ✅ **WebSocket Real-time Updates**
- ✅ **Professional Dashboard UI**
- ✅ **Settings Configuration**
- ✅ **Built-in Backend Server**

## 🚀 **Next Steps**

1. **Test the Linux AppImage** on your current system
2. **Build Windows version** using Option 1 or 2 above
3. **Distribute** the appropriate executable to end users
4. **Configure** CSV file paths and serial ports in the app settings

Your Tank Monitoring System is now ready for production use! 🎉
