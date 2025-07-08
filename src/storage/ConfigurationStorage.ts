import {
  type AppConfiguration,
  type ConfigurationStorage,
  type TankConfiguration,
  type VesselConfiguration,
} from '../types/configuration';

// Storage keys
const STORAGE_KEYS = {
  VESSELS: 'tankmon-vessels-v3',
  APP_CONFIG: 'tankmon-app-config-v3',
  VERSION: '3.0.0',
} as const;

export class UnifiedConfigurationStorage implements ConfigurationStorage {
  private static instance: UnifiedConfigurationStorage;

  static getInstance(): UnifiedConfigurationStorage {
    if (!UnifiedConfigurationStorage.instance) {
      UnifiedConfigurationStorage.instance = new UnifiedConfigurationStorage();
    }
    return UnifiedConfigurationStorage.instance;
  }

  constructor() {
    this.initializeStorage();
    this.migrateFromLegacy();
  }

  private initializeStorage(): void {
    // Initialize app config if not exists
    if (!this.getItem<AppConfiguration>(STORAGE_KEYS.APP_CONFIG)) {
      const defaultConfig: AppConfiguration = {
        id: 'default',
        tanks: [],
        lastUpdated: new Date().toISOString(),
        version: STORAGE_KEYS.VERSION,
      };
      this.setItem(STORAGE_KEYS.APP_CONFIG, defaultConfig);
    }

    // Initialize vessels array if not exists
    if (!this.getItem<VesselConfiguration[]>(STORAGE_KEYS.VESSELS)) {
      this.setItem(STORAGE_KEYS.VESSELS, []);
    }
  }

  // Safe localStorage operations
  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save to localStorage (${key}):`, error);
      throw new Error(`Storage operation failed: ${error}`);
    }
  }

  private getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Failed to read from localStorage (${key}):`, error);
      return null;
    }
  }

  // Tank configuration methods
  getTankConfigurations(): TankConfiguration[] {
    const appConfig = this.getItem<AppConfiguration>(STORAGE_KEYS.APP_CONFIG);
    return appConfig?.tanks || [];
  }

  saveTankConfigurations(configs: TankConfiguration[]): void {
    const appConfig = this.getItem<AppConfiguration>(STORAGE_KEYS.APP_CONFIG) || {
      id: 'default',
      tanks: [],
      lastUpdated: new Date().toISOString(),
      version: STORAGE_KEYS.VERSION,
    };

    appConfig.tanks = configs;
    appConfig.lastUpdated = new Date().toISOString();

    this.setItem(STORAGE_KEYS.APP_CONFIG, appConfig);
  }

  // Vessel configuration methods
  getVessels(): VesselConfiguration[] {
    return this.getItem<VesselConfiguration[]>(STORAGE_KEYS.VESSELS) || [];
  }

  getVessel(id: string): VesselConfiguration | null {
    const vessels = this.getVessels();
    return vessels.find(v => v.id === id) || null;
  }

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

    this.setItem(STORAGE_KEYS.VESSELS, vessels);
  }

  deleteVessel(id: string): void {
    const vessels = this.getVessels();
    const filtered = vessels.filter(v => v.id !== id);
    this.setItem(STORAGE_KEYS.VESSELS, filtered);

    // If deleted vessel was active, clear active vessel
    const appConfig = this.getItem<AppConfiguration>(STORAGE_KEYS.APP_CONFIG);
    if (appConfig?.activeVesselId === id) {
      appConfig.activeVesselId = filtered.length > 0 ? filtered[0].id : undefined;
      this.setItem(STORAGE_KEYS.APP_CONFIG, appConfig);
    }
  }

  // App configuration methods
  getActiveVesselId(): string | undefined {
    const appConfig = this.getItem<AppConfiguration>(STORAGE_KEYS.APP_CONFIG);
    return appConfig?.activeVesselId;
  }

  setActiveVesselId(id: string): void {
    const appConfig = this.getItem<AppConfiguration>(STORAGE_KEYS.APP_CONFIG) || {
      id: 'default',
      tanks: [],
      lastUpdated: new Date().toISOString(),
      version: STORAGE_KEYS.VERSION,
    };

    appConfig.activeVesselId = id;
    appConfig.lastUpdated = new Date().toISOString();

    this.setItem(STORAGE_KEYS.APP_CONFIG, appConfig);
  }

  // Import/Export methods
  exportConfiguration(): string {
    const data = {
      vessels: this.getVessels(),
      appConfig: this.getItem<AppConfiguration>(STORAGE_KEYS.APP_CONFIG),
      exportDate: new Date().toISOString(),
      version: STORAGE_KEYS.VERSION,
    };

    return JSON.stringify(data, null, 2);
  }

  importConfiguration(data: string): boolean {
    try {
      const parsed = JSON.parse(data);

      if (parsed.vessels) {
        this.setItem(STORAGE_KEYS.VESSELS, parsed.vessels);
      }

      if (parsed.appConfig) {
        this.setItem(STORAGE_KEYS.APP_CONFIG, parsed.appConfig);
      }

      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }

  // Migration from legacy storage
  migrateFromLegacy(): void {
    try {
      // Migrate from old vessel configuration
      const oldVesselConfig = localStorage.getItem('vessel-configuration');
      const oldDatabaseVesselConfig = localStorage.getItem('tank-vessels-v2');

      if ((oldVesselConfig || oldDatabaseVesselConfig) && !this.getVessels().length) {
        let vessels: VesselConfiguration[] = [];

        // Try database config first (newer)
        if (oldDatabaseVesselConfig) {
          try {
            vessels = JSON.parse(oldDatabaseVesselConfig);
          } catch (e) {
            console.error('Failed to parse database vessel config:', e);
          }
        }

        // Fall back to old config
        if (!vessels.length && oldVesselConfig) {
          try {
            const parsed = JSON.parse(oldVesselConfig);
            vessels = Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            console.error('Failed to parse old vessel config:', e);
          }
        }

        if (vessels.length > 0) {
          this.setItem(STORAGE_KEYS.VESSELS, vessels);
          console.log('✅ Migrated vessel configurations');
        }
      }

      // Migrate tank configuration
      const oldTankConfig = localStorage.getItem('tank-monitoring-config');
      const oldDatabaseTankConfig = localStorage.getItem('tank-configuration-v2');
      const currentAppConfig = this.getItem<AppConfiguration>(STORAGE_KEYS.APP_CONFIG);

      if ((oldTankConfig || oldDatabaseTankConfig) && (!currentAppConfig?.tanks || currentAppConfig.tanks.length === 0)) {
        let tankConfigs: TankConfiguration[] = [];

        // Try database config first (newer)
        if (oldDatabaseTankConfig) {
          try {
            const parsed = JSON.parse(oldDatabaseTankConfig);
            tankConfigs = parsed.tanks || [];
          } catch (e) {
            console.error('Failed to parse database tank config:', e);
          }
        }

        // Fall back to old config
        if (!tankConfigs.length && oldTankConfig) {
          try {
            const parsed = JSON.parse(oldTankConfig);
            tankConfigs = parsed.tanks || [];
          } catch (e) {
            console.error('Failed to parse old tank config:', e);
          }
        }

        if (tankConfigs.length > 0) {
          this.saveTankConfigurations(tankConfigs);
          console.log('✅ Migrated tank configurations');
        }
      }

      // Migrate active vessel
      const oldActiveVessel = localStorage.getItem('active-vessel-id');
      const oldDatabaseActiveVessel = localStorage.getItem('tank-app-settings-v2');

      if ((oldActiveVessel || oldDatabaseActiveVessel) && !currentAppConfig?.activeVesselId) {
        let activeVesselId: string | undefined;

        // Try database config first (newer)
        if (oldDatabaseActiveVessel) {
          try {
            const parsed = JSON.parse(oldDatabaseActiveVessel);
            activeVesselId = parsed.activeVesselId;
          } catch (e) {
            console.error('Failed to parse database app settings:', e);
          }
        }

        // Fall back to old config
        if (!activeVesselId && oldActiveVessel) {
          activeVesselId = oldActiveVessel;
        }

        if (activeVesselId) {
          this.setActiveVesselId(activeVesselId);
          console.log('✅ Migrated active vessel');
        }
      }

      // Clean up old keys after successful migration
      const oldKeys = [
        'vessel-configuration',
        'tank-vessels-v2',
        'tank-monitoring-config',
        'tank-configuration-v2',
        'active-vessel-id',
        'tank-app-settings-v2',
        'tank-configuration',
        'tank-readings-v2',
      ];

      oldKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed old storage key: ${key}`);
        }
      });

    } catch (error) {
      console.error('Error during migration:', error);
    }
  }

  // Clear all data (for testing/reset)
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEYS.VESSELS);
    localStorage.removeItem(STORAGE_KEYS.APP_CONFIG);
    this.initializeStorage();
    console.log('🗑️ All configuration data cleared');
  }
}
