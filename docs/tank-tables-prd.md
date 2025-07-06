# Tank Tables & Volume Calculation System - PRD

## Overview
Transform the tank monitoring system to use tank tables as the foundation for vessel configuration, enabling accurate volume, mass, and flow rate calculations based on official vessel documentation.

## Current State
- System displays tank levels in millimeters and temperatures
- Basic alarm thresholds (86% pre-alarm, 97.5% overfill)
- Height-based measurements without volume conversion
- Manual tank configuration without vessel documentation integration

## Proposed Enhancement: Tank-Table-First Architecture
**Core Principle**: Tank tables serve as the authoritative source for vessel configuration, with data sources mapped to these defined tanks.

### 1. Tank Table Integration

#### 1.1 Tank Table Data Structure
Each tank table contains:
- **Tank ID**: Unique identifier // optional, may need manual mapping
- **Tank Name**: Descriptive name // optional, may need manual mapping
- **Maximum Level**: Maximum height in millimeters or centimeters or decimeters
- **Volume Lookup Table**: Volume in liters for each mm, cm or decimeter of height

#### 1.2 File Format Support
Support tank table file formats:
- **PDF files** (requires parsing capabilities)
- **Excel files** (.xlsx, .xls)
- **CSV files** (comma-separated values)

#### 1.3 Tank-Table-First Setup Process
- **Primary Configuration**: Tank tables define the vessel's tank configuration
- **Upload & Parse**: Import tank tables through file upload interface
- **Review & Validate**: Manual review of parsed tank data with mapping options
- **Tank Definition**: Tank tables become the authoritative tank configuration
- **Data Source Mapping**: Map sensors/data files TO the defined tanks (not vice versa)
- **Configuration Validation**: Ensure data sources match tank table definitions

### 2. Volume Calculations

#### 2.1 Height-to-Volume Conversion
- Use tank-specific lookup tables
- Implement interpolation for precise volume calculation
- Convert  measurements to cubic meters (m³)
- Display both height (mm) and volume (m³) in UI, maybe liters as well

#### 2.2 Flow Rate Calculations
- **Dynamic Flow Rates**: Calculate real-time volume flow rate (m³/hour) based on current tank level changes
- **Automatic Rate Detection**: Track loading/unloading rates dynamically without manual input
- **Volume-Based Trends**: Provide trend indicators showing m³/hour instead of mm/time
- **Rate Averaging**: Apply smoothing to prevent fluctuations from vessel movement

### 3. Product Density & Mass Calculations

#### 3.1 Tank Group Configuration
- **Tank Groups**: Users can organize tanks into logical groups (e.g., Port/Starboard, Cargo Types, etc.)
- **Group-Based Density**: Each tank group has a configurable product density value
- **Flexible Grouping**: Users can create custom groups and assign tanks to groups
- **Group Management**: Add, edit, delete tank groups with associated density values

#### 3.2 ASTM 54B Integration
- **Built-in ASTM 54B Tables**: Include standard ASTM 54B tables in the system
- **Temperature Correction**: Automatically calculate actual density based on current temperature
- **Real-time Correction**: Apply temperature corrections to mass calculations continuously

#### 3.3 Mass Calculations
- Calculate mass (metric tons) per tank
- Display total vessel mass
- Show mass flow rates (tons/hour)

### 4. Enhanced Display & Reporting

#### 4.1 Multi-Unit Display
Current display options:
- Height (mm) - existing
- Volume (m³) - new
- Mass (metric tons) - new
- Percentage full - existing

#### 4.2 Flow Rate Display
- Volume flow rate (m³/hour)
- Mass flow rate (tons/hour)
- Loading/unloading progress indicators

#### 4.3 Time Estimation
- Calculate estimated completion time
- Display target completion date/time
- Show remaining volume/mass to load/discharge
- Progress tracking with ETA updates

### 5. User Interface Enhancements

#### 5.1 Tank-Table-First Setup Wizard
- **Step 1**: Tank table upload and parsing (PDF/Excel/CSV)
- **Step 2**: Tank review and manual mapping interface
- **Step 3**: Tank group configuration and density assignment
- **Step 4**: Data source mapping to defined tanks
- **Step 5**: Validation and configuration confirmation

#### 5.2 Tank Group Management
- **Group Configuration**: Create and manage tank groups with custom names
- **Density Assignment**: Set product density per tank group
- **Tank Assignment**: Assign tanks to groups via drag-and-drop or selection
- **Group Visualization**: Display tanks grouped by their assigned groups in UI

#### 5.3 Operations Dashboard
- Multi-unit tank displays
- Flow rate monitoring
- Completion time estimates
- Progress tracking

### 6. Technical Implementation

#### 6.1 Data Storage
- **Tank Table Repository**: Store original tank tables and parsed data
- **Volume Lookup Tables**: Tank-specific interpolation data
- **Tank-to-DataSource Mapping**: Link sensors/files to specific tanks
- **Group Configuration**: Tank groups with density settings
- **ASTM Correction Tables**: Built-in temperature correction data

#### 6.2 Calculation Engine
- **Height-to-Volume Interpolation**: Precise volume calculation using tank-specific lookup tables
- **Dynamic Flow Rate Calculation**: Real-time m³/hour and tons/hour calculation from level changes
- **Temperature-Corrected Density**: ASTM 54B-based density correction using current temperature
- **ETA Estimation**: Completion time calculation based on current dynamic flow rates
- **Rate Smoothing**: Apply averaging to handle vessel movement and prevent false readings

#### 6.3 File Processing
- PDF parsing capabilities
- Excel/CSV import
- Data validation and error handling
- Bulk import processing

## Requirements Clarified

1. **File Formats**: ✅ PDF, Excel (.xlsx/.xls), and CSV formats
2. **ASTM Tables**: ✅ Built-in ASTM 54B tables included in system
3. **Product Configuration**: ✅ Tank groups with density per group (user-configurable)
4. **Flow Rate Calculation**: ✅ Dynamic/real-time calculation based on current level changes
5. **Temperature Correction**: ✅ Real-time temperature correction for accurate mass calculations

## Success Criteria

- [ ] Tank tables serve as primary vessel configuration source
- [ ] Wizard guides users through tank-table-first setup
- [ ] Data sources successfully map to tank-table-defined tanks
- [ ] Accurate volume calculations for all tank levels
- [ ] Mass calculations with temperature correction
- [ ] Flow rates displayed in m³/hour and tons/hour
- [ ] Completion time estimates with acceptable accuracy
- [ ] Configuration validation prevents data source mismatches

## Dependencies

- File parsing libraries (PDF, Excel)
- Mathematical interpolation functions
- ASTM 54B table data or integration
- Enhanced database schema
- Updated UI components for multi-unit display

## Timeline Estimate

- **Phase 1**: Tank table import and volume calculation (2-3 weeks)
- **Phase 2**: Product density and mass calculations (1-2 weeks)
- **Phase 3**: Flow rates and time estimation (1-2 weeks)
- **Phase 4**: UI enhancements and integration (1-2 weeks)

**Total Estimated Duration**: 5-9 weeks
