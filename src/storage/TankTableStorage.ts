import { TankTable, TankGroup, ProductType, TankTableConfiguration, ASTM54BTable } from '../types/tankTable';

export class TankTableStorage {
  private static instance: TankTableStorage;
  private readonly TANK_TABLES_KEY = 'tank-tables';
  private readonly TANK_GROUPS_KEY = 'tank-groups';
  private readonly PRODUCT_TYPES_KEY = 'product-types';
  private readonly TANK_TABLE_CONFIG_KEY = 'tank-table-config';
  private readonly ASTM_TABLES_KEY = 'astm-tables';

  private constructor() {}

  static getInstance(): TankTableStorage {
    if (!TankTableStorage.instance) {
      TankTableStorage.instance = new TankTableStorage();
    }
    return TankTableStorage.instance;
  }

  // Generic storage methods
  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  }

  private getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Failed to load ${key}:`, error);
      return null;
    }
  }

  // Tank Table operations
  saveTankTable(tankTable: TankTable): void {
    const tables = this.getTankTables();
    const existingIndex = tables.findIndex(t => t.id === tankTable.id);
    
    if (existingIndex >= 0) {
      tables[existingIndex] = { ...tankTable, lastModified: new Date() };
    } else {
      tables.push(tankTable);
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
    const tables = this.getTankTables().filter(t => t.id !== id);
    this.setItem(this.TANK_TABLES_KEY, tables);
  }

  // Tank Group operations
  saveTankGroup(group: TankGroup): void {
    const groups = this.getTankGroups();
    const existingIndex = groups.findIndex(g => g.id === group.id);
    
    if (existingIndex >= 0) {
      groups[existingIndex] = group;
    } else {
      groups.push(group);
    }
    
    this.setItem(this.TANK_GROUPS_KEY, groups);
  }

  getTankGroups(): TankGroup[] {
    return this.getItem<TankGroup[]>(this.TANK_GROUPS_KEY) || [];
  }

  getTankGroup(id: string): TankGroup | null {
    const groups = this.getTankGroups();
    return groups.find(g => g.id === id) || null;
  }

  deleteTankGroup(id: string): void {
    const groups = this.getTankGroups().filter(g => g.id !== id);
    this.setItem(this.TANK_GROUPS_KEY, groups);
  }

  // Product Type operations
  saveProductType(productType: ProductType): void {
    const types = this.getProductTypes();
    const existingIndex = types.findIndex(p => p.id === productType.id);
    
    if (existingIndex >= 0) {
      types[existingIndex] = productType;
    } else {
      types.push(productType);
    }
    
    this.setItem(this.PRODUCT_TYPES_KEY, types);
  }

  getProductTypes(): ProductType[] {
    return this.getItem<ProductType[]>(this.PRODUCT_TYPES_KEY) || [];
  }

  getProductType(id: string): ProductType | null {
    const types = this.getProductTypes();
    return types.find(p => p.id === id) || null;
  }

  deleteProductType(id: string): void {
    const types = this.getProductTypes().filter(p => p.id !== id);
    this.setItem(this.PRODUCT_TYPES_KEY, types);
  }

  // Configuration operations
  saveTankTableConfiguration(config: TankTableConfiguration): void {
    this.setItem(this.TANK_TABLE_CONFIG_KEY, { ...config, lastUpdated: new Date() });
  }

  getTankTableConfiguration(): TankTableConfiguration | null {
    return this.getItem<TankTableConfiguration>(this.TANK_TABLE_CONFIG_KEY);
  }

  // ASTM Table operations
  saveASTMTable(table: ASTM54BTable): void {
    const tables = this.getASTMTables();
    const existingIndex = tables.findIndex(t => t.id === table.id);
    
    if (existingIndex >= 0) {
      tables[existingIndex] = table;
    } else {
      tables.push(table);
    }
    
    this.setItem(this.ASTM_TABLES_KEY, tables);
  }

  getASTMTables(): ASTM54BTable[] {
    return this.getItem<ASTM54BTable[]>(this.ASTM_TABLES_KEY) || [];
  }

  getASTMTable(id: string): ASTM54BTable | null {
    const tables = this.getASTMTables();
    return tables.find(t => t.id === id) || null;
  }

  // Utility methods
  clearAllTankTableData(): void {
    localStorage.removeItem(this.TANK_TABLES_KEY);
    localStorage.removeItem(this.TANK_GROUPS_KEY);
    localStorage.removeItem(this.PRODUCT_TYPES_KEY);
    localStorage.removeItem(this.TANK_TABLE_CONFIG_KEY);
  }

  exportTankTableData(): string {
    const data = {
      tankTables: this.getTankTables(),
      tankGroups: this.getTankGroups(),
      productTypes: this.getProductTypes(),
      configuration: this.getTankTableConfiguration(),
      astmTables: this.getASTMTables(),
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  importTankTableData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.tankTables) this.setItem(this.TANK_TABLES_KEY, data.tankTables);
      if (data.tankGroups) this.setItem(this.TANK_GROUPS_KEY, data.tankGroups);
      if (data.productTypes) this.setItem(this.PRODUCT_TYPES_KEY, data.productTypes);
      if (data.configuration) this.setItem(this.TANK_TABLE_CONFIG_KEY, data.configuration);
      if (data.astmTables) this.setItem(this.ASTM_TABLES_KEY, data.astmTables);
      
      return true;
    } catch (error) {
      console.error('Failed to import tank table data:', error);
      return false;
    }
  }

  // Initialize default data
  initializeDefaults(): void {
    // Initialize default product types if none exist
    if (this.getProductTypes().length === 0) {
      const defaultProductTypes: ProductType[] = [
        {
          id: 'crude-oil',
          name: 'Crude Oil',
          density: 850, // kg/m³
          astmTable: 'astm-54b-crude',
          temperatureCorrection: true
        },
        {
          id: 'diesel',
          name: 'Diesel',
          density: 832,
          astmTable: 'astm-54b-diesel',
          temperatureCorrection: true
        },
        {
          id: 'gasoline',
          name: 'Gasoline',
          density: 750,
          astmTable: 'astm-54b-gasoline',
          temperatureCorrection: true
        },
        {
          id: 'water',
          name: 'Water',
          density: 1000,
          temperatureCorrection: false
        }
      ];

      defaultProductTypes.forEach(type => this.saveProductType(type));
    }

    // Initialize ASTM tables if none exist
    if (this.getASTMTables().length === 0) {
      // Import and save standard ASTM tables
      import('../utils/astm54b').then(({ STANDARD_ASTM_TABLES }) => {
        STANDARD_ASTM_TABLES.forEach(table => this.saveASTMTable(table));
      });
    }

    // Initialize default tank groups if none exist
    if (this.getTankGroups().length === 0) {
      const defaultGroups: TankGroup[] = [
        {
          id: 'port-tanks',
          name: 'port-tanks',
          displayName: 'Port Side Tanks',
          density: 850,
          tanks: [],
          color: '#3B82F6',
          description: 'Port side tank group'
        },
        {
          id: 'starboard-tanks',
          name: 'starboard-tanks',
          displayName: 'Starboard Side Tanks',
          density: 850,
          tanks: [],
          color: '#10B981',
          description: 'Starboard side tank group'
        },
        {
          id: 'center-tanks',
          name: 'center-tanks',
          displayName: 'Center Tanks',
          density: 850,
          tanks: [],
          color: '#F59E0B',
          description: 'Center tank group'
        }
      ];

      defaultGroups.forEach(group => this.saveTankGroup(group));
    }
  }
}
