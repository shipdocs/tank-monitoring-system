import { 
  TankTable, 
  TankTableConfiguration
} from '../types/tankTable';

export class TankTableStorage {
  private static instance: TankTableStorage;
  
  // Storage keys
  private readonly TANK_TABLES_KEY = 'tank-tables-v1';
  private readonly TANK_TABLE_CONFIG_KEY = 'tank-table-config-v1';
  private readonly VERSION = '1.0.0';

  static getInstance(): TankTableStorage {
    if (!TankTableStorage.instance) {
      TankTableStorage.instance = new TankTableStorage();
    }
    return TankTableStorage.instance;
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

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to write to localStorage (${key}):`, error);
      throw error;
    }
  }

  // Tank Table operations
  saveTankTable(tankTable: TankTable): void {
    const tables = this.getTankTables();
    const existingIndex = tables.findIndex(t => t.id === tankTable.id);
    
    const updatedTable = {
      ...tankTable,
      last_modified: new Date().toISOString(),
      version: this.VERSION
    };

    if (existingIndex >= 0) {
      tables[existingIndex] = updatedTable;
    } else {
      tables.unshift(updatedTable);
    }

    this.setItem(this.TANK_TABLES_KEY, tables);
  }

  getTankTables(): TankTable[] {
    return this.getItem<TankTable[]>(this.TANK_TABLES_KEY) || [];
  }

  getTankTable(id: string): TankTable | null {
    const tables = this.getTankTables();
    return tables.find(t => t.id === id) || null;
  }

  deleteTankTable(id: string): void {
    const tables = this.getTankTables();
    const filtered = tables.filter(t => t.id !== id);
    this.setItem(this.TANK_TABLES_KEY, filtered);
    
    // Also clear configuration if this was the active table
    const config = this.getTankTableConfiguration();
    if (config.active_tank_table_id === id) {
      this.saveTankTableConfiguration({
        ...config,
        active_tank_table_id: undefined,
        tank_mappings: []
      });
    }
  }

  // Tank Table Configuration operations
  getTankTableConfiguration(): TankTableConfiguration {
    const config = this.getItem<TankTableConfiguration>(this.TANK_TABLE_CONFIG_KEY);
    return config || {
      id: 'default',
      tank_mappings: [],
      last_updated: new Date().toISOString(),
      version: this.VERSION
    };
  }

  saveTankTableConfiguration(config: TankTableConfiguration): void {
    const updatedConfig = {
      ...config,
      last_updated: new Date().toISOString(),
      version: this.VERSION
    };
    this.setItem(this.TANK_TABLE_CONFIG_KEY, updatedConfig);
  }

  // Utility functions
  getActiveTankTable(): TankTable | null {
    const config = this.getTankTableConfiguration();
    if (!config.active_tank_table_id) return null;
    return this.getTankTable(config.active_tank_table_id);
  }

  setActiveTankTable(tankTableId: string): void {
    const config = this.getTankTableConfiguration();
    this.saveTankTableConfiguration({
      ...config,
      active_tank_table_id: tankTableId
    });
  }

  // Volume calculation using calibration data
  calculateVolumeFromHeight(tankTableId: string, height_mm: number): number {
    const tankTable = this.getTankTable(tankTableId);
    if (!tankTable) return 0;

    const tank = tankTable.tanks.find(t => t.tank_id === tankTableId);
    if (!tank || !tank.calibration_data || tank.calibration_data.length === 0) {
      return 0;
    }

    const calibrationData = tank.calibration_data.sort((a, b) => a.height_mm - b.height_mm);
    
    // If height is below minimum, return 0
    if (height_mm <= calibrationData[0].height_mm) {
      return calibrationData[0].volume_liters;
    }
    
    // If height is above maximum, return max volume
    if (height_mm >= calibrationData[calibrationData.length - 1].height_mm) {
      return calibrationData[calibrationData.length - 1].volume_liters;
    }
    
    // Linear interpolation between two points
    for (let i = 0; i < calibrationData.length - 1; i++) {
      const lower = calibrationData[i];
      const upper = calibrationData[i + 1];
      
      if (height_mm >= lower.height_mm && height_mm <= upper.height_mm) {
        const ratio = (height_mm - lower.height_mm) / (upper.height_mm - lower.height_mm);
        return lower.volume_liters + ratio * (upper.volume_liters - lower.volume_liters);
      }
    }
    
    return 0;
  }

  // Export/Import functionality
  exportTankTable(id: string): string {
    const tankTable = this.getTankTable(id);
    if (!tankTable) throw new Error('Tank table not found');
    
    return JSON.stringify(tankTable, null, 2);
  }

  exportAllData(): string {
    const data = {
      tank_tables: this.getTankTables(),
      configuration: this.getTankTableConfiguration(),
      export_date: new Date().toISOString(),
      version: this.VERSION
    };
    
    return JSON.stringify(data, null, 2);
  }

  importBackup(backupData: string): boolean {
    try {
      const data = JSON.parse(backupData);

      if (data.tank_tables) {
        this.setItem(this.TANK_TABLES_KEY, data.tank_tables);
      }

      if (data.configuration) {
        this.setItem(this.TANK_TABLE_CONFIG_KEY, data.configuration);
      }

      console.log('✅ Successfully restored tank table data from backup');
      return true;
    } catch (error) {
      console.error('❌ Failed to restore tank table backup:', error);
      return false;
    }
  }
}
