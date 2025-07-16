/**
 * DefaultTankConfigurationService - Provides default tank configuration
 * 
 * This service creates a default tank configuration when no tank tables are configured.
 * It provides proper tank names and ordering based on maritime standards.
 */

import { TankTable, TankTableEntry, TankMapping } from '../types/tankTable';
import { TankTableStorage } from '../storage/TankTableStorage';

export class DefaultTankConfigurationService {
  private storage = TankTableStorage.getInstance();

  /**
   * Create default tank configuration if none exists
   */
  createDefaultConfigurationIfNeeded(): boolean {
    const config = this.storage.getTankTableConfiguration();
    const existingTables = this.storage.getTankTables();

    // If we already have configuration, don't override
    if (config.active_tank_table_id && config.tank_mappings.length > 0) {
      return false;
    }

    // If we have tank tables but no active configuration, don't create default
    if (existingTables.length > 0) {
      return false;
    }

    console.log('🔧 Creating default tank configuration...');

    // Create default tank table
    const defaultTankTable = this.createDefaultTankTable();
    this.storage.saveTankTable(defaultTankTable);

    // Create default mappings
    const defaultMappings = this.createDefaultMappings(defaultTankTable.id);
    
    // Save configuration
    this.storage.saveTankTableConfiguration({
      id: 'default',
      active_tank_table_id: defaultTankTable.id,
      tank_mappings: defaultMappings,
      last_updated: new Date().toISOString(),
      version: '1.0.0'
    });

    console.log(`✅ Default tank configuration created with ${defaultTankTable.tanks.length} tanks`);
    return true;
  }

  /**
   * Create a default tank table with standard maritime tank names
   */
  private createDefaultTankTable(): TankTable {
    const tanks: TankTableEntry[] = [
      // Port side tanks (BB)
      this.createTankEntry('BB1', 'BB1 Tank', 'Port Side', 'fuel', 2000, 50000),
      this.createTankEntry('BB2', 'BB2 Tank', 'Port Side', 'fuel', 2000, 50000),
      this.createTankEntry('BB3', 'BB3 Tank', 'Port Side', 'fuel', 2000, 50000),
      
      // Starboard side tanks (SB)
      this.createTankEntry('SB1', 'SB1 Tank', 'Starboard Side', 'fuel', 2000, 50000),
      this.createTankEntry('SB2', 'SB2 Tank', 'Starboard Side', 'fuel', 2000, 50000),
      this.createTankEntry('SB3', 'SB3 Tank', 'Starboard Side', 'fuel', 2000, 50000),
    ];

    return {
      id: 'default-tank-table',
      name: 'Default Tank Configuration',
      description: 'Auto-generated default tank configuration for maritime vessel',
      created_date: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      version: '1.0.0',
      tanks: tanks
    };
  }

  /**
   * Create a tank entry with basic calibration data
   */
  private createTankEntry(
    tankId: string, 
    tankName: string, 
    location: string, 
    tankType: string, 
    maxHeight: number, 
    maxVolume: number
  ): TankTableEntry {
    // Create simple linear calibration data
    const calibrationData = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const heightPercent = i / steps;
      const volumePercent = heightPercent; // Linear relationship for simplicity
      
      calibrationData.push({
        height_mm: Math.round(maxHeight * heightPercent),
        volume_liters: Math.round(maxVolume * volumePercent)
      });
    }

    return {
      tank_id: tankId,
      tank_name: tankName,
      location: location,
      tank_type: tankType,
      max_height_mm: maxHeight,
      max_volume_liters: maxVolume,
      calibration_data: calibrationData
    };
  }

  /**
   * Create default tank mappings
   */
  private createDefaultMappings(tankTableId: string): TankMapping[] {
    const tankTable = this.storage.getTankTable(tankTableId);
    if (!tankTable) return [];

    return tankTable.tanks.map((tank, index) => ({
      data_source_index: index,
      tank_table_id: tank.tank_id,
      enabled: true,
      custom_name: undefined // Use tank table name
    }));
  }

  /**
   * Check if default configuration is active
   */
  isUsingDefaultConfiguration(): boolean {
    const config = this.storage.getTankTableConfiguration();
    return config.active_tank_table_id === 'default-tank-table';
  }

  /**
   * Remove default configuration (when user imports proper tank tables)
   */
  removeDefaultConfiguration(): void {
    const config = this.storage.getTankTableConfiguration();
    
    if (config.active_tank_table_id === 'default-tank-table') {
      // Clear configuration
      this.storage.saveTankTableConfiguration({
        id: 'default',
        tank_mappings: [],
        last_updated: new Date().toISOString(),
        version: '1.0.0'
      });

      // Remove default tank table
      this.storage.deleteTankTable('default-tank-table');
      
      console.log('🗑️ Default tank configuration removed');
    }
  }
}