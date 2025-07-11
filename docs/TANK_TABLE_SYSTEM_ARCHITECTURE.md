# 🏗️ Tank Table Import System Architecture

## 📋 Overview

This document outlines the comprehensive tank table import system designed to replace hardcoded tank configurations with proper calibration data from CSV files.

## 🎯 Goals

1. **Replace hardcoded configurations** with flexible, importable tank calibration data
2. **Separate concerns**: Data source provides measurements, tank tables provide specifications
3. **Accurate calculations**: Use height-to-volume calibration for precise percentage and volume calculations
4. **Professional workflow**: Import once, configure mappings, monitor accurately

## 🏗️ System Architecture

### **1. Data Flow**
```
CSV Tank Table → Import Service → Tank Table Storage → Mapping Configuration → Enhanced Tank Data Service → UI Components
```

### **2. Core Components**

#### **Types & Interfaces** (`src/types/tankTable.ts`)
- `TankTableEntry`: Individual tank with calibration data
- `TankTable`: Collection of tanks with metadata
- `TankMapping`: Maps data source indices to tank table entries
- `EnhancedTank`: Extended tank interface with volume calculations

#### **Storage Layer** (`src/storage/TankTableStorage.ts`)
- Persistent storage for tank tables and configurations
- Volume calculation using linear interpolation
- Import/export functionality

#### **Import Service** (`src/services/TankTableImportService.ts`)
- CSV parsing and validation
- Error handling and reporting
- Calibration data parsing

#### **Data Enhancement** (`src/services/EnhancedTankDataService.ts`)
- Combines real-time data with tank table specifications
- Volume calculations from height measurements
- Status determination based on tank type

#### **UI Components**
- `TankTableImport.tsx`: Import wizard with drag-drop
- `TankMappingConfig.tsx`: Configure data source to tank mappings

## 📊 CSV Format Specification

### **Required Columns**
- `tank_id`: Unique identifier
- `tank_name`: Display name
- `max_height_mm`: Maximum height in millimeters
- `max_volume_liters`: Maximum volume in liters
- `tank_type`: ballast, cargo, fuel, fresh_water, slop, hydraulic, waste, other
- `location`: Physical location description
- `calibration_data`: Height:Volume pairs (e.g., "0:0,100:750,200:1500")

### **Optional Columns**
- `description`: Tank description
- `manufacturer`: Tank manufacturer
- `installation_date`: Installation date
- `last_calibrated`: Last calibration date

### **Example CSV Row**
```csv
TANK_001,Forward Port Ballast,2000,15000,ballast,Forward Port,"0:0,100:750,200:1500,300:2250,400:3000,500:3750,600:4500,700:5250,800:6000,900:6750,1000:7500,1100:8250,1200:9000,1300:9750,1400:10500,1500:11250,1600:12000,1700:12750,1800:13500,1900:14250,2000:15000",Main ballast tank
```

## 🔄 Workflow

### **1. Initial Setup**
1. Import tank table CSV file
2. Configure mappings between data source and tank table entries
3. Activate tank table

### **2. Runtime Operation**
1. Data source provides real-time height measurements
2. Enhanced Tank Data Service maps measurements to tank specifications
3. Volume calculated using calibration data
4. Accurate percentages and status determined
5. UI displays enhanced tank information

## 🎨 UI Enhancements

### **Enhanced Tank Display**
- **Height Percentage**: Based on physical height (current/max_height)
- **Fill Percentage**: Based on volume (current_volume/max_volume)
- **Volume Display**: Actual content in liters
- **Tank Type Indicators**: Visual indicators for different tank types
- **Status Calculation**: Tank-type-specific thresholds

### **New Configuration Screens**
- **Tank Table Management**: Import, view, delete tank tables
- **Mapping Configuration**: Map data sources to tank entries
- **Calibration Viewer**: Visualize height-to-volume curves

## 🔧 Implementation Steps

### **Phase 1: Core Infrastructure** ✅
- [x] Type definitions
- [x] Storage layer
- [x] Import service
- [x] Enhanced data service

### **Phase 2: UI Components** ✅
- [x] Import wizard
- [x] Mapping configuration
- [x] Template download

### **Phase 3: Integration** (Next Steps)
1. Update main tank data hook to use enhanced service
2. Modify tank display components to show volume data
3. Add tank table management to settings
4. Update server-side parsing to work with mappings

### **Phase 4: Advanced Features** (Future)
1. Calibration curve visualization
2. Tank table validation tools
3. Bulk import/export
4. Historical calibration tracking

## 📈 Benefits

### **Accuracy**
- Precise volume calculations using actual tank geometry
- Tank-type-specific status thresholds
- Professional-grade calibration data support

### **Flexibility**
- Support for any tank configuration
- Easy reconfiguration without code changes
- Multiple tank table support

### **Maintainability**
- Clear separation of concerns
- Standardized data format
- Comprehensive error handling

### **User Experience**
- Intuitive import process
- Visual mapping configuration
- Real-time validation and feedback

## 🚀 Next Steps

1. **Integrate with existing tank data flow**
2. **Update UI components to display volume information**
3. **Add tank table management to settings interface**
4. **Test with real tank calibration data**
5. **Create user documentation and tutorials**

## 📝 Notes

- The system maintains backward compatibility with existing hardcoded configurations
- Tank tables are stored in localStorage for desktop app simplicity
- Linear interpolation provides sufficient accuracy for most tank geometries
- The architecture supports future enhancements like non-linear calibration curves
