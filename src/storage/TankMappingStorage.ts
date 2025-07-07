import { TankMapping, TankMappingConfiguration, MappingValidationResult } from '../types/tankTable';

export class TankMappingStorage {
  private static instance: TankMappingStorage;
  private readonly TANK_MAPPING_KEY = 'tank-mappings';
  private readonly MAPPING_CONFIG_KEY = 'tank-mapping-config';

  private constructor() {}

  static getInstance(): TankMappingStorage {
    if (!TankMappingStorage.instance) {
      TankMappingStorage.instance = new TankMappingStorage();
    }
    return TankMappingStorage.instance;
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

  // Tank Mapping operations
  saveTankMapping(mapping: TankMapping): void {
    const mappings = this.getTankMappings();
    const existingIndex = mappings.findIndex(m => m.id === mapping.id);
    
    if (existingIndex >= 0) {
      mappings[existingIndex] = { ...mapping, lastVerified: new Date() };
    } else {
      mappings.push(mapping);
    }
    
    this.setItem(this.TANK_MAPPING_KEY, mappings);
  }

  getTankMappings(): TankMapping[] {
    return this.getItem<TankMapping[]>(this.TANK_MAPPING_KEY) || [];
  }

  getTankMapping(id: string): TankMapping | null {
    const mappings = this.getTankMappings();
    return mappings.find(m => m.id === id) || null;
  }

  getTankMappingByDataSourceId(dataSourceTankId: string): TankMapping | null {
    const mappings = this.getTankMappings();
    return mappings.find(m => m.dataSourceTankId === dataSourceTankId) || null;
  }

  deleteTankMapping(id: string): void {
    const mappings = this.getTankMappings().filter(m => m.id !== id);
    this.setItem(this.TANK_MAPPING_KEY, mappings);
  }

  // Bulk operations
  saveTankMappings(mappings: TankMapping[]): void {
    this.setItem(this.TANK_MAPPING_KEY, mappings);
  }

  clearAllMappings(): void {
    localStorage.removeItem(this.TANK_MAPPING_KEY);
  }

  // Configuration operations
  saveMappingConfiguration(config: TankMappingConfiguration): void {
    this.setItem(this.MAPPING_CONFIG_KEY, { ...config, lastUpdated: new Date() });
  }

  getMappingConfiguration(): TankMappingConfiguration | null {
    return this.getItem<TankMappingConfiguration>(this.MAPPING_CONFIG_KEY);
  }

  // Validation operations
  validateMappings(
    mappings: TankMapping[],
    availableTankTableIds: string[],
    dataSourceTankIds: string[]
  ): MappingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for unmapped data source tanks
    const mappedDataSourceIds = new Set(mappings.map(m => m.dataSourceTankId));
    const unmappedTanks = dataSourceTankIds.filter(id => !mappedDataSourceIds.has(id));
    
    if (unmappedTanks.length > 0) {
      errors.push(`${unmappedTanks.length} tanks are not mapped to tank tables: ${unmappedTanks.join(', ')}`);
    }

    // Check for invalid tank table references
    const invalidMappings = mappings.filter(m => !availableTankTableIds.includes(m.tankTableId));
    if (invalidMappings.length > 0) {
      errors.push(`${invalidMappings.length} mappings reference non-existent tank tables`);
    }

    // Check for duplicate mappings
    const tankTableUsage = new Map<string, string[]>();
    mappings.forEach(m => {
      if (!tankTableUsage.has(m.tankTableId)) {
        tankTableUsage.set(m.tankTableId, []);
      }
      tankTableUsage.get(m.tankTableId)!.push(m.dataSourceTankId);
    });

    tankTableUsage.forEach((dataSourceIds, tankTableId) => {
      if (dataSourceIds.length > 1) {
        warnings.push(`Tank table ${tankTableId} is mapped to multiple data source tanks: ${dataSourceIds.join(', ')}`);
      }
    });

    // Check for low confidence auto-mappings
    const lowConfidenceMappings = mappings.filter(m => m.isAutoMapped && m.confidence < 0.7);
    if (lowConfidenceMappings.length > 0) {
      warnings.push(`${lowConfidenceMappings.length} auto-mappings have low confidence and should be reviewed`);
    }

    // Suggestions
    if (unmappedTanks.length > 0) {
      suggestions.push('Use auto-mapping to generate suggestions for unmapped tanks');
    }

    if (lowConfidenceMappings.length > 0) {
      suggestions.push('Review and manually verify low-confidence auto-mappings');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  // Export/Import operations
  exportMappingData(): string {
    const data = {
      mappings: this.getTankMappings(),
      configuration: this.getMappingConfiguration(),
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  importMappingData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.mappings) {
        this.setItem(this.TANK_MAPPING_KEY, data.mappings);
      }
      
      if (data.configuration) {
        this.setItem(this.MAPPING_CONFIG_KEY, data.configuration);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import mapping data:', error);
      return false;
    }
  }

  // Utility methods
  getMappingStats(): {
    totalMappings: number;
    autoMappings: number;
    manualMappings: number;
    averageConfidence: number;
    lastUpdated: Date | null;
  } {
    const mappings = this.getTankMappings();
    const config = this.getMappingConfiguration();
    
    const autoMappings = mappings.filter(m => m.isAutoMapped).length;
    const manualMappings = mappings.length - autoMappings;
    const averageConfidence = mappings.length > 0 
      ? mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length 
      : 0;

    return {
      totalMappings: mappings.length,
      autoMappings,
      manualMappings,
      averageConfidence,
      lastUpdated: config?.lastUpdated ? new Date(config.lastUpdated) : null
    };
  }
}
