# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TankMon is a real-time maritime tank monitoring dashboard built with Electron, React, and Node.js. It tracks tank levels and temperatures for vessels, supporting multiple data sources including CSV files and serial port communication.

## Commands

### Development
```bash
npm run dev              # Run frontend and backend concurrently
npm run dev:frontend     # Frontend only (Vite dev server)
npm run dev:backend      # Backend only with hot reload
npm run electron:dev     # Electron app in development mode
```

### Building
```bash
npm run build            # Production build of frontend
npm run electron:pack    # Build Electron app for current platform
npm run electron:dist    # Build distributable without publishing
npm run build:all        # Build for Windows, macOS, and Linux
```

### Code Quality
```bash
npm run lint             # Run ESLint
```

### Release Management
```bash
npm run release patch    # Bump patch version and create git tag
npm run release minor    # Bump minor version and create git tag
npm run release major    # Bump major version and create git tag
```

### Testing
```bash
npm run test:autoupdate     # Test auto-update functionality
npm run test:consolidated   # Test integrated server functionality
```

## Architecture

### Tank-Table-First Architecture
The project is transitioning to a tank-table-first architecture where:
- Tank tables (PDF/Excel/CSV) define the authoritative vessel configuration
- Data sources are mapped TO pre-defined tanks (not vice versa)
- Supports volume calculations, flow rates, and mass calculations with ASTM 54B temperature correction
- Tank groups have configurable density settings

### Project Structure
- `/src/` - React frontend with TypeScript
  - `/components/` - UI components for tank displays and controls
  - `/hooks/` - Custom React hooks for data and configuration management
  - `/types/` - TypeScript type definitions
  - `/utils/` - Data parsing and configuration utilities
- `/server/` - Node.js/Express backend
  - File monitoring and CSV parsing
  - WebSocket server for real-time updates
  - Settings management API
- `/electron/` - Electron main process
  - Desktop application entry point
  - Integrated server management

### Key API Endpoints
- `/api/status` - Connection and monitoring status
- `/api/tanks` - Tank data and levels
- `/api/tank-config` - Tank configuration management
- `/api/branding` - Branding configuration
- `/api/security` - Security settings
- `/api/connect` - Start monitoring
- `/api/disconnect` - Stop monitoring

### Data Flow
1. CSV files or serial port data → File monitor/parser
2. Parsed data → WebSocket broadcast
3. Frontend receives real-time updates
4. Tank displays update with visual indicators

### Multi-Platform Support
- Windows: NSIS installer and portable version
- macOS: DMG installer
- Linux: AppImage
- Auto-update via GitHub releases

## Development Guidelines

### Git Workflow
- Feature branches (e.g., `feature/tank-tables`)
- Main branch: `main`
- Automated releases via GitHub Actions when tags are pushed

### TypeScript Configuration
- Frontend uses strict TypeScript mode
- Separate tsconfig for app and node environments
- React JSX configuration

### Real-Time Communication
- WebSocket for live tank updates
- CSV file monitoring with auto-discovery
- Serial port support for hardware integration

### Visual Features
- Tank level indicators with color coding
- Trend detection with visual speed indicators (3mm threshold)
- Alarm thresholds: 86% pre-alarm, 97.5% overfill
- Tank grouping (BB/SB - Port/Starboard)

## Important Notes

- No traditional database - uses file-based storage and monitoring
- Configuration stored in Electron store and localStorage
- Dual-licensed: non-commercial CC BY-NC 4.0, commercial requires separate license
- Testing is primarily manual with validation scripts
- Version management automated through release scripts