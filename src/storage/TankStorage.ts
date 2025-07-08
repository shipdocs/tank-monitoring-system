import { type VesselConfiguration } from '../types/vessel';

export interface TankReading {
  id: string;
  tankId: string;
  level: number;
  temperature?: number;
  status: string;
  timestamp: string;
}

export interface TankConfiguration {
  id: string;
  customName?: string;
  position: number;
}

export interface AppConfiguration {
  id: string;
  tanks: TankConfiguration[];
  lastUpdated: string;
}

export interface AppSettings {
  activeVesselId?: string;
  lastUpdated: string;
  version: string;
}

// Enhanced localStorage-based storage for Electron app
export class TankStorage {
  private static instance: TankStorage;

  // Storage keys with versioning
  private readonly VESSELS_KEY = 'tank-vessels-v2';
  private readonly APP_SETTINGS_KEY = 'tank-app-settings-v2';
  private readonly TANK_CONFIG_KEY = 'tank-configuration-v2';
  private readonly READINGS_KEY = 'tank-readings-v2';
  private readonly VERSION = '2.0.0';

  constructor() {
    this.initializeDefaults();
    this.migrateOldData();
  }

  static getInstance(): TankStorage {
    if (!TankStorage.instance) {
      TankStorage.instance = new TankStorage();
    }
    return TankStorage.instance;
  }

  private initializeDefaults(): void {
    // Initialize app settings if not exists
    if (!this.getItem(this.APP_SETTINGS_KEY)) {
      const defaultSettings: AppSettings = {
        lastUpdated: new Date().toISOString(),
        version: this.VERSION,
      };
      this.setItem(this.APP_SETTINGS_KEY, defaultSettings);
    }

    // Initialize empty arrays if not exist
    if (!this.getItem(this.VESSELS_KEY)) {
      this.setItem(this.VESSELS_KEY, []);
    }

    if (!this.getItem(this.READINGS_KEY)) {
      this.setItem(this.READINGS_KEY, []);
    }
  }

  private migrateOldData(): void {
    try {
      // Migrate old vessel data
      const oldVessels = localStorage.getItem('vessel-configuration');
      if (oldVessels && !this.getItem(this.VESSELS_KEY)?.length) {
        const parsed = JSON.parse(oldVessels);
        if (Array.isArray(parsed)) {
          this.setItem(this.VESSELS_KEY, parsed);
        } else if (parsed && typeof parsed === 'object') {
          this.setItem(this.VESSELS_KEY, [parsed]);
        }
        console.log('✅ Migrated vessel data from old storage');
      }

      // Migrate old tank configuration
      const oldTankConfig = localStorage.getItem('tank-configuration');
      if (oldTankConfig && !this.getItem(this.TANK_CONFIG_KEY)) {
        const parsed = JSON.parse(oldTankConfig);
        this.setItem(this.TANK_CONFIG_KEY, parsed);
        console.log('✅ Migrated tank configuration from old storage');
      }

      // Migrate active vessel setting
      const oldActiveVessel = localStorage.getItem('active-vessel-id');
      if (oldActiveVessel) {
        const settings = this.getAppSettings();
        settings.activeVesselId = oldActiveVessel;
        this.setItem(this.APP_SETTINGS_KEY, settings);
        localStorage.removeItem('active-vessel-id');
        console.log('✅ Migrated active vessel setting');
      }
    } catch (error) {
      console.error('❌ Error during data migration:', error);
    }
  }

  // Safe localStorage operations with error handling
  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`❌ Failed to save to localStorage (${key}):`, error);

      // Handle specific quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded, attempting cleanup...');
        this.clearOldData();
        // Retry once after cleanup
        try {
          localStorage.setItem(key, JSON.stringify(value));
          console.log('✅ Successfully saved after cleanup');
          return;
        } catch (retryError) {
          console.error('❌ Failed to save even after cleanup:', retryError);
        }
      }

      throw new Error(`Storage operation failed: ${error}`);
    }
  }

  // Clear old data to free up localStorage space
  private clearOldData(): void {
    try {
      // Remove old tank data (keep only recent)
      const keys = Object.keys(localStorage);
      const tankDataKeys = keys.filter(key => key.startsWith('tankData_'));

      // Sort by timestamp and remove oldest entries
      tankDataKeys.sort().slice(0, -5).forEach(key => {
        localStorage.removeItem(key);
      });

      console.log(`🧹 Cleaned up ${tankDataKeys.length - 5} old tank data entries`);
    } catch (error) {
      console.error('❌ Error during localStorage cleanup:', error);
    }
  }

  private getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`❌ Failed to read from localStorage (${key}):`, error);
      return null;
    }
  }

  // Vessel operations
  saveVessel(vessel: VesselConfiguration): void {
    const vessels = this.getVessels();
    const existingIndex = vessels.findIndex(v => v.id === vessel.id);

    const updatedVessel = {
      ...vessel,
      metadata: {
        ...vessel.metadata,
        lastModified: new Date().toISOString(),
      },
    };

    if (existingIndex >= 0) {
      vessels[existingIndex] = updatedVessel;
    } else {
      vessels.unshift(updatedVessel);
    }

    this.setItem(this.VESSELS_KEY, vessels);
  }

  getVessels(): VesselConfiguration[] {
    return this.getItem<VesselConfiguration[]>(this.VESSELS_KEY) || [];
  }

  getVessel(id: string): VesselConfiguration | null {
    const vessels = this.getVessels();
    return vessels.find(v => v.id === id) || null;
  }

  deleteVessel(id: string): void {
    const vessels = this.getVessels();
    const filtered = vessels.filter(v => v.id !== id);
    this.setItem(this.VESSELS_KEY, filtered);
  }

  // App settings operations
  getAppSettings(): AppSettings {
    return this.getItem<AppSettings>(this.APP_SETTINGS_KEY) || {
      lastUpdated: new Date().toISOString(),
      version: this.VERSION,
    };
  }

  setActiveVessel(vesselId: string): void {
    const settings = this.getAppSettings();
    settings.activeVesselId = vesselId;
    settings.lastUpdated = new Date().toISOString();
    this.setItem(this.APP_SETTINGS_KEY, settings);
  }

  getAppConfiguration(): { activeVesselId?: string; lastUpdated: string } {
    const settings = this.getAppSettings();
    return {
      activeVesselId: settings.activeVesselId,
      lastUpdated: settings.lastUpdated,
    };
  }

  // Tank configuration operations
  saveTankConfiguration(config: AppConfiguration): void {
    const updatedConfig = {
      ...config,
      lastUpdated: new Date().toISOString(),
    };
    this.setItem(this.TANK_CONFIG_KEY, updatedConfig);
  }

  getTankConfiguration(): AppConfiguration {
    const config = this.getItem<AppConfiguration>(this.TANK_CONFIG_KEY);
    return config || {
      id: 'default',
      tanks: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  // Historical data operations
  saveTankReading(reading: Omit<TankReading, 'id'>): void {
    const readings = this.getTankReadings();
    const newReading: TankReading = {
      ...reading,
      id: `reading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    readings.unshift(newReading);

    // Keep only last 10000 readings to prevent storage bloat
    if (readings.length > 10000) {
      readings.splice(10000);
    }

    this.setItem(this.READINGS_KEY, readings);
  }

  getTankHistory(tankId: string, hours: number = 24): TankReading[] {
    const readings = this.getTankReadings();
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    return readings
      .filter(reading =>
        reading.tankId === tankId &&
        new Date(reading.timestamp) > cutoffTime,
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 1000); // Limit to 1000 readings
  }

  private getTankReadings(): TankReading[] {
    return this.getItem<TankReading[]>(this.READINGS_KEY) || [];
  }

  // Migration helpers
  migrateFromLocalStorage(vesselData: unknown, tankConfigData: unknown): void {
    try {
      // Migrate vessel configurations
      if (vesselData) {
        const vessels = Array.isArray(vesselData) ? vesselData : [vesselData];
        vessels.forEach(vessel => {
          if (vessel?.id) {
            this.saveVessel(vessel);
          }
        });
      }

      // Migrate tank configurations
      if (tankConfigData) {
        this.saveTankConfiguration(tankConfigData);
      }

      console.log('✅ Migration completed successfully');
    } catch (error) {
      console.error('❌ Error during migration:', error);
    }
  }

  // Backup and restore
  exportBackup(): string {
    const data = {
      vessels: this.getVessels(),
      appSettings: this.getAppSettings(),
      tankConfiguration: this.getTankConfiguration(),
      readings: this.getTankReadings(),
      exportDate: new Date().toISOString(),
      version: this.VERSION,
    };

    return JSON.stringify(data, null, 2);
  }

  importBackup(backupData: string): boolean {
    try {
      const data = JSON.parse(backupData);

      if (data.vessels) {
        this.setItem(this.VESSELS_KEY, data.vessels);
      }

      if (data.appSettings) {
        this.setItem(this.APP_SETTINGS_KEY, data.appSettings);
      }

      if (data.tankConfiguration) {
        this.setItem(this.TANK_CONFIG_KEY, data.tankConfiguration);
      }

      if (data.readings) {
        this.setItem(this.READINGS_KEY, data.readings);
      }

      console.log('✅ Successfully restored data from backup');
      return true;
    } catch (error) {
      console.error('❌ Failed to restore backup:', error);
      return false;
    }
  }

  // Clear all data (for testing/reset)
  clearAll(): void {
    localStorage.removeItem(this.VESSELS_KEY);
    localStorage.removeItem(this.APP_SETTINGS_KEY);
    localStorage.removeItem(this.TANK_CONFIG_KEY);
    localStorage.removeItem(this.READINGS_KEY);
    this.initializeDefaults();
    console.log('🗑️ All storage data cleared');
  }
}
