// Tank Table Import System Types

export interface TankCalibrationPoint {
  height_mm: number;
  volume_liters: number;
}

export interface TankTableEntry {
  tank_id: string;
  tank_name: string;
  max_height_mm: number;
  max_volume_liters: number;
  tank_type: 'ballast' | 'cargo' | 'fuel' | 'fresh_water' | 'slop' | 'hydraulic' | 'waste' | 'other';
  location: string;
  calibration_data: TankCalibrationPoint[];
  // Optional metadata
  description?: string;
  manufacturer?: string;
  installation_date?: string;
  last_calibrated?: string;
}

export interface TankTable {
  id: string;
  name: string;
  description?: string;
  vessel_name?: string;
  vessel_type?: string;
  created_date: string;
  last_modified: string;
  version: string;
  tanks: TankTableEntry[];
}

export interface TankMapping {
  data_source_index: number; // Index in the data source (0-based)
  tank_table_id: string; // Tank ID from the tank table
  enabled: boolean;
  custom_name?: string; // Override tank name if needed
}

export interface TankTableConfiguration {
  id: string;
  active_tank_table_id?: string;
  tank_mappings: TankMapping[];
  last_updated: string;
  version: string;
}

// Enhanced Tank interface that includes calibration data
export interface EnhancedTank {
  // Original Tank properties
  id: number;
  name: string;
  currentLevel: number;
  maxCapacity: number; // This will be max_height_mm from tank table
  minLevel: number;
  maxLevel: number;
  unit: string;
  status: 'normal' | 'low' | 'high' | 'critical';
  lastUpdated: Date;
  location: string;
  trend?: 'loading' | 'unloading' | 'stable';
  trendValue?: number;
  previousLevel?: number;
  position?: number;
  temperature?: number;
  group?: 'BB' | 'SB' | 'CENTER';
  
  // New tank table properties
  tank_table_id?: string;
  tank_type?: string;
  max_volume_liters?: number;
  current_volume_liters?: number; // Calculated from height using calibration
  fill_percentage?: number; // Based on volume, not height
  height_percentage?: number; // Based on height
  calibration_data?: TankCalibrationPoint[];
}

// Import/Export interfaces
export interface TankTableImportResult {
  success: boolean;
  tank_table?: TankTable;
  errors: string[];
  warnings: string[];
  tanks_imported: number;
}

export interface TankTableValidationError {
  row: number;
  column: string;
  message: string;
  severity: 'error' | 'warning';
}
