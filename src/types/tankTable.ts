export interface VolumeEntry {
  height: number; // Height in mm
  volume: number; // Volume in liters
}

export interface TankTable {
  id: string;
  tankId?: string; // Optional tank identifier from file
  tankName?: string; // Optional tank name from file
  maxLevel: number; // Maximum height in mm
  unit: 'mm' | 'cm' | 'dm'; // Height unit from source
  volumeEntries: VolumeEntry[]; // Volume lookup table
  sourceFile: string; // Original filename
  uploadDate: Date;
  lastModified: Date;
}

export interface TankGroup {
  id: string;
  name: string;
  displayName: string;
  density: number; // Product density in kg/m³
  tanks: string[]; // Tank IDs in this group
  color?: string; // Optional color for UI
  description?: string;
}

export interface ProductType {
  id: string;
  name: string;
  density: number; // Standard density in kg/m³
  astmTable?: string; // ASTM table reference
  temperatureCorrection: boolean;
}

export interface VolumeCalculationResult {
  volume: number; // Volume in m³
  volumeLiters: number; // Volume in liters
  interpolated: boolean; // Whether value was interpolated
  accuracy: 'exact' | 'interpolated' | 'extrapolated';
}

export interface MassCalculationResult {
  mass: number; // Mass in metric tons
  density: number; // Actual density used (temperature corrected)
  temperatureCorrected: boolean;
  astmCorrectionApplied: boolean;
}

export interface FlowRateData {
  volumeFlowRate: number; // m³/hour
  massFlowRate: number; // tons/hour
  trend: 'loading' | 'unloading' | 'stable';
  confidence: number; // 0-1, confidence in the calculation
  smoothed: boolean; // Whether smoothing was applied
}

export interface ETACalculation {
  estimatedCompletion: Date;
  remainingVolume: number; // m³
  remainingMass: number; // tons
  currentRate: number; // Current flow rate
  confidence: number; // 0-1, confidence in ETA
  assumptions: string[]; // List of assumptions made
}

export interface TankTableParseResult {
  success: boolean;
  tankTable?: TankTable;
  errors: string[];
  warnings: string[];
  detectedFormat: 'pdf' | 'excel' | 'csv' | 'unknown';
  autoMappingApplied: boolean;
}

export interface TankTableConfiguration {
  id: string;
  vesselName: string;
  tankTables: TankTable[];
  tankGroups: TankGroup[];
  productTypes: ProductType[];
  defaultDensity: number;
  useASTMCorrection: boolean;
  flowRateSmoothing: number; // Smoothing factor 0-1
  lastUpdated: Date;
}

// Enhanced tank interface with volume and mass data
export interface EnhancedTank {
  // Original tank properties
  id: number;
  name: string;
  currentLevel: number; // mm
  maxCapacity: number; // mm
  minLevel: number; // mm
  maxLevel: number; // mm
  unit: string;
  status: 'normal' | 'low' | 'high' | 'critical';
  lastUpdated: Date;
  location: string;
  trend?: 'loading' | 'unloading' | 'stable';
  trendValue?: number;
  previousLevel?: number;
  position?: number;
  temperature?: number;
  group?: string;
  
  // New tank table properties
  tankTableId?: string;
  volumeData?: VolumeCalculationResult;
  massData?: MassCalculationResult;
  flowRateData?: FlowRateData;
  etaData?: ETACalculation;
  groupId?: string;
  productTypeId?: string;
}

export interface ASTM54BEntry {
  temperature: number; // °C
  correctionFactor: number; // Density correction factor
}

export interface ASTM54BTable {
  id: string;
  name: string;
  description: string;
  entries: ASTM54BEntry[];
  temperatureRange: {
    min: number;
    max: number;
  };
}

// Tank Mapping Types for Data Source Integration
export interface TankMapping {
  id: string;
  dataSourceTankId: string; // Tank ID from data source (sensors/files)
  dataSourceTankName: string; // Tank name from data source
  tankTableId: string; // Tank table ID to use for calculations
  tankGroupId?: string; // Optional tank group assignment
  productTypeId?: string; // Optional product type assignment
  confidence: number; // 0-1, confidence in this mapping (for auto-mapping)
  isAutoMapped: boolean; // Whether this was auto-mapped or manually set
  lastVerified: Date; // When this mapping was last verified
  notes?: string; // Optional notes about this mapping
}

export interface TankMappingConfiguration {
  id: string;
  vesselName: string;
  mappings: TankMapping[];
  autoMappingEnabled: boolean;
  lastUpdated: Date;
  validationStatus: {
    isValid: boolean;
    unmappedTanks: string[]; // Tank IDs without mappings
    invalidMappings: string[]; // Mapping IDs with issues
    warnings: string[];
  };
}

export interface AutoMappingSuggestion {
  dataSourceTankId: string;
  dataSourceTankName: string;
  suggestedTankTableId: string;
  suggestedTankTableName: string;
  confidence: number; // 0-1, confidence in suggestion
  reason: string; // Why this mapping was suggested
  alternatives: Array<{
    tankTableId: string;
    tankTableName: string;
    confidence: number;
    reason: string;
  }>;
}

export interface MappingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}
