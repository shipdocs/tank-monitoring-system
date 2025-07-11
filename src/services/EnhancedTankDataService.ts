import { Tank } from '../types/tank';
import { EnhancedTank, TankMapping } from '../types/tankTable';
import { TankTableStorage } from '../storage/TankTableStorage';

export class EnhancedTankDataService {
  private storage = TankTableStorage.getInstance();

  /**
   * Enhance tank data with calibration information from tank tables
   */
  enhanceTankData(rawTanks: Tank[]): EnhancedTank[] {
    const config = this.storage.getTankTableConfiguration();
    const activeTankTable = this.storage.getActiveTankTable();

    if (!activeTankTable || config.tank_mappings.length === 0) {
      // No tank table configured, return tanks as enhanced tanks with basic data
      return rawTanks.map(tank => this.convertToEnhancedTank(tank));
    }

    const enhancedTanks: EnhancedTank[] = [];

    // Process each mapping
    config.tank_mappings.forEach(mapping => {
      if (!mapping.enabled) return;

      // Find the raw tank data by index
      const rawTank = rawTanks[mapping.data_source_index];
      if (!rawTank) return;

      // Find the tank table entry
      const tankTableEntry = activeTankTable.tanks.find(t => t.tank_id === mapping.tank_table_id);
      if (!tankTableEntry) return;

      // Create enhanced tank
      const enhancedTank = this.createEnhancedTank(rawTank, tankTableEntry, mapping);
      enhancedTanks.push(enhancedTank);
    });

    return enhancedTanks;
  }

  private convertToEnhancedTank(tank: Tank): EnhancedTank {
    const percentage = tank.maxCapacity > 0 ? (tank.currentLevel / tank.maxCapacity) * 100 : 0;
    
    return {
      ...tank,
      height_percentage: percentage,
      fill_percentage: percentage, // Same as height percentage when no calibration
      current_volume_liters: undefined,
      max_volume_liters: undefined,
      tank_table_id: undefined,
      tank_type: undefined,
      calibration_data: undefined
    };
  }

  private createEnhancedTank(
    rawTank: Tank, 
    tankTableEntry: any, 
    mapping: TankMapping
  ): EnhancedTank {
    const currentHeight = rawTank.currentLevel;
    const maxHeight = tankTableEntry.max_height_mm;
    
    // Calculate height percentage
    const heightPercentage = maxHeight > 0 ? (currentHeight / maxHeight) * 100 : 0;
    
    // Calculate current volume using calibration data
    const currentVolume = this.calculateVolumeFromHeight(
      tankTableEntry.calibration_data, 
      currentHeight
    );
    
    // Calculate fill percentage based on volume
    const fillPercentage = tankTableEntry.max_volume_liters > 0 
      ? (currentVolume / tankTableEntry.max_volume_liters) * 100 
      : 0;

    // Determine status based on fill percentage
    const status = this.calculateStatus(fillPercentage, tankTableEntry.tank_type);

    return {
      id: rawTank.id,
      name: mapping.custom_name || tankTableEntry.tank_name,
      currentLevel: currentHeight,
      maxCapacity: maxHeight,
      minLevel: rawTank.minLevel,
      maxLevel: maxHeight * 0.95, // 95% of max height as safe level
      unit: 'mm',
      status: status,
      lastUpdated: rawTank.lastUpdated,
      location: tankTableEntry.location,
      trend: rawTank.trend,
      trendValue: rawTank.trendValue,
      previousLevel: rawTank.previousLevel,
      position: rawTank.position,
      temperature: rawTank.temperature,
      group: rawTank.group,
      
      // Enhanced properties
      tank_table_id: tankTableEntry.tank_id,
      tank_type: tankTableEntry.tank_type,
      max_volume_liters: tankTableEntry.max_volume_liters,
      current_volume_liters: currentVolume,
      fill_percentage: fillPercentage,
      height_percentage: heightPercentage,
      calibration_data: tankTableEntry.calibration_data
    };
  }

  private calculateVolumeFromHeight(calibrationData: any[], height: number): number {
    if (!calibrationData || calibrationData.length === 0) return 0;

    const sortedData = calibrationData.sort((a, b) => a.height_mm - b.height_mm);
    
    // If height is below minimum, return minimum volume
    if (height <= sortedData[0].height_mm) {
      return sortedData[0].volume_liters;
    }
    
    // If height is above maximum, return maximum volume
    if (height >= sortedData[sortedData.length - 1].height_mm) {
      return sortedData[sortedData.length - 1].volume_liters;
    }
    
    // Linear interpolation between two points
    for (let i = 0; i < sortedData.length - 1; i++) {
      const lower = sortedData[i];
      const upper = sortedData[i + 1];
      
      if (height >= lower.height_mm && height <= upper.height_mm) {
        const ratio = (height - lower.height_mm) / (upper.height_mm - lower.height_mm);
        return lower.volume_liters + ratio * (upper.volume_liters - lower.volume_liters);
      }
    }
    
    return 0;
  }

  private calculateStatus(fillPercentage: number, tankType: string): Tank['status'] {
    // Different thresholds based on tank type
    const thresholds = this.getStatusThresholds(tankType);
    
    if (fillPercentage < thresholds.critical) return 'critical';
    if (fillPercentage < thresholds.low) return 'low';
    if (fillPercentage > thresholds.high) return 'high';
    return 'normal';
  }

  private getStatusThresholds(tankType: string) {
    switch (tankType) {
      case 'fuel':
        return { critical: 10, low: 25, high: 95 };
      case 'fresh_water':
        return { critical: 15, low: 30, high: 95 };
      case 'ballast':
        return { critical: 0, low: 5, high: 98 };
      case 'cargo':
        return { critical: 0, low: 5, high: 98 };
      case 'slop':
        return { critical: 0, low: 10, high: 90 };
      default:
        return { critical: 5, low: 20, high: 95 };
    }
  }

  /**
   * Get available tank mappings for configuration
   */
  getAvailableMappings(dataSourceCount: number): { index: number; name: string }[] {
    const mappings = [];
    for (let i = 0; i < dataSourceCount; i++) {
      mappings.push({
        index: i,
        name: `Data Source ${i + 1}`
      });
    }
    return mappings;
  }

  /**
   * Create default mappings when a tank table is first activated
   */
  createDefaultMappings(tankTableId: string): TankMapping[] {
    const tankTable = this.storage.getTankTable(tankTableId);
    if (!tankTable) return [];

    return tankTable.tanks.map((tank, index) => ({
      data_source_index: index,
      tank_table_id: tank.tank_id,
      enabled: true,
      custom_name: undefined
    }));
  }

  /**
   * Save tank mappings
   */
  saveTankMappings(mappings: TankMapping[], activeTankTableId?: string): void {
    const config = this.storage.getTankTableConfiguration();
    this.storage.saveTankTableConfiguration({
      ...config,
      active_tank_table_id: activeTankTableId || config.active_tank_table_id,
      tank_mappings: mappings
    });
  }

  /**
   * Get current tank mappings
   */
  getCurrentMappings(): TankMapping[] {
    const config = this.storage.getTankTableConfiguration();
    return config.tank_mappings;
  }

  /**
   * Get active tank table info
   */
  getActiveTankTableInfo() {
    const config = this.storage.getTankTableConfiguration();
    const activeTankTable = this.storage.getActiveTankTable();
    
    return {
      hasActiveTankTable: !!activeTankTable,
      activeTankTableId: config.active_tank_table_id,
      activeTankTableName: activeTankTable?.name,
      mappingCount: config.tank_mappings.length,
      enabledMappingCount: config.tank_mappings.filter(m => m.enabled).length
    };
  }
}
