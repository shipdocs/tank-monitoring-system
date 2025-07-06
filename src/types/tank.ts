export interface Tank {
  id: number;
  name: string;
  currentLevel: number; // Current level in mm
  maxCapacity: number; // Maximum height in mm (not liters!)
  minLevel: number; // Minimum level in mm
  maxLevel: number; // Maximum level in mm
  unit: string; // Always 'mm' for height-based measurements
  status: 'normal' | 'low' | 'high' | 'critical';
  lastUpdated: Date;
  location: string;
  trend?: 'loading' | 'unloading' | 'stable';
  trendValue?: number; // Rate of change per minute
  previousLevel?: number;
  position?: number; // For sorting
  temperature?: number; // Temperature in Celsius
  group?: 'BB' | 'SB' | 'CENTER'; // Tank group (Backboard/Starboard/Center)
}

export interface TankGroup {
  id: string;
  name: string;
  displayName: string;
  tanks: Tank[];
}

export interface TankData {
  tanks: Tank[];
  lastSync: Date;
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

export type ViewMode = 'grid' | 'list' | 'compact' | 'single-row' | 'column' | 'side-by-side';