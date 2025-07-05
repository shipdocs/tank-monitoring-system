# Tank Monitoring System

A real-time tank monitoring dashboard for maritime operations with CSV file import and serial communication capabilities.

## Features

- **Real-time Tank Monitoring**: Live display of tank levels and temperatures
- **Multiple Data Sources**: Support for CSV files and serial port communication
- **Flexible File Import**: Auto-discovery and mapping of CSV data to tank values
- **Configurable Alarms**: Pre-alarm and overfill thresholds
- **Multiple View Modes**: Grid, list, and column layouts
- **Drag & Drop**: Reorder tanks to match vessel configuration
- **Professional Interface**: Clean, maritime-focused design
- **Cross-platform**: Windows, macOS, and Linux support
- **Built-in Help System**: Comprehensive help and troubleshooting guides
- **Debug Logging**: Real-time log viewer and export functionality

## Quick Start

### Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Run Electron app**:
   ```bash
   npm run electron:dev
   ```

### Building

- **Build for current platform**:
  ```bash
  npm run electron:pack
  ```

- **Build for all platforms**:
  ```bash
  npm run build:all
  ```

## Release Management

### Creating a New Release

Use the automated release script:

```bash
# Patch release (1.1.0 -> 1.1.1)
npm run release patch

# Minor release (1.1.0 -> 1.2.0)
npm run release minor

# Major release (1.1.0 -> 2.0.0)
npm run release major
```

This will:
1. Update version in `package.json`
2. Update version in Electron app
3. Create a git commit and tag
4. Provide instructions for publishing

### Publishing the Release

After running the release script:

```bash
# Push changes and tag to GitHub
git push origin main && git push origin v1.1.1
```

GitHub Actions will automatically:
- Build for Windows, macOS, and Linux
- Create a GitHub release
- Upload all platform binaries

### Manual Release (if needed)

You can also trigger a release manually from GitHub:
1. Go to **Actions** tab
2. Select **Build and Release** workflow
3. Click **Run workflow**
4. Enter the version (e.g., v1.1.1)

## Configuration

### CSV File Import

The system supports flexible CSV file import with auto-discovery:

1. Go to **Settings** → **Data Sources**
2. Select your CSV file
3. Configure format (horizontal/vertical)
4. Set up column mapping
5. Enable auto-import with desired interval

### Serial Port Communication

1. Go to **Settings** → **Serial Port**
2. Select port and configure parameters
3. Set up data parsing rules
4. Enable auto-connect

## Tank Configuration

- **Tank Names**: Editable via settings
- **Max Heights**: Configurable per tank
- **Alarm Thresholds**: 86% pre-alarm, 97.5% overfill
- **Grouping**: Support for BB/SB (Port/Starboard) layouts

## File Structure

```
├── src/                 # React frontend
├── server/             # Node.js backend
├── electron/           # Electron main process
├── sample-data/        # Example data files
├── scripts/            # Build and release scripts
├── .github/workflows/  # GitHub Actions
└── dist-electron/      # Built applications
```

## Requirements

- **Node.js**: 18.x or higher
- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **Memory**: 4GB RAM minimum
- **Storage**: 500MB free space

## License

This project is dual-licensed:

### Non-Commercial Use
For personal, educational, and non-commercial use, this software is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International License**.

You are free to:
- Use the software for personal projects
- Modify and adapt the code
- Share with others (with attribution)

### Commercial Use
For commercial use, including business operations, commercial products, or removing attribution requirements, a separate commercial license is required.

**Contact for commercial licensing:** [your-email@example.com]

See the [LICENSE](LICENSE) file for full details.