/**
 * UnifiedTankConfigurationService - Single source of truth for tank configuration
 * 
 * This service consolidates all tank configuration systems:
 * - Tank Table Storage (sidebar tank mappings) - PRIMARY AUTHORITY
 * - Legacy Tank Storage (old configuration system)
 * - Settings page tank configuration
 * - Setup Wizard vessel configuration
 * 
 * The Tank Table Storage system is the authoritative source.
 * All other systems should sync with this.
 */

import { TankTableStorage, TankTableConfiguration } from '../storage/TankTableStorage';
import { TankStorage, AppConfiguration } from '../storage/TankStorage';
import { Tank } from '../types/tank';
import { TankMapping, EnhancedTank } from '../types/tankTable';
import { EnhancedTankDataService } from './EnhancedTankDataService';

export interface UnifiedTankConfiguration {
  // Primary configuration from Tank Table Storage
  activeTankTableId: string | null;
  tankMappings: TankMapping[];
  
  // Derived configuration for compatibility
  legacyTankConfig: AppConfiguration;
  
  // Status information
  isConfigured: boolean;
  lastUpdated: string;
  configurationSource: 'tank-table' | 'legacy' | 'none';
}

export class UnifiedTankConfigurationService {
  private tankTableStorage: TankTableStorage;
  private legacyStorage: TankStorage;
  private enhancedDataService: EnhancedTankDataService;

  constructor() {
    this.tankTableStorage = TankTableStorage.getInstance();
    this.legacyStorage = TankStorage.getInstance();
    this.enhancedDataService = new EnhancedTankDataService();
  }

  /**
   * Get the current unified configuration
   * Tank Table Storage is the authoritative source
   */
  getUnifiedConfiguration(): UnifiedTankConfiguration {
    const tankTableConfig = this.tankTableStorage.getTankTableConfiguration();
    const legacyConfig = this.legacyStorage.getTankConfiguration();

    // Determine if we have a valid configuration
    const hasTankTableConfig = !!(tankTableConfig.active_tank_table_id && tankTableConfig.tank_mappings.length > 0);
    const hasLegacyConfig = !!(legacyConfig.tanks && legacyConfig.tanks.length > 0);

    let configurationSource: 'tank-table' | 'legacy' | 'none' = 'none';
    let isConfigured = false;

    if (hasTankTableConfig) {
      configurationSource = 'tank-table';
      isConfigured = true;
    } else if (hasLegacyConfig) {
      configurationSource = 'legacy';
      isConfigured = true;
    }

    return {
      activeTankTableId: tankTableConfig.active_tank_table_id || null,
      tankMappings: tankTableConfig.tank_mappings || [],
      legacyTankConfig: legacyConfig,
      isConfigured,
      lastUpdated: tankTableConfig.last_updated || new Date().toISOString(),
      configurationSource
    };
  }

  /**
   * Update the unified configuration
   * This updates the Tank Table Storage (authoritative) and syncs to other systems
   */
  updateUnifiedConfiguration(
    activeTankTableId: string,
    tankMappings: TankMapping[]
  ): void {
    // Update the authoritative Tank Table Storage
    const currentConfig = this.tankTableStorage.getTankTableConfiguration();
    const updatedConfig: TankTableConfiguration = {
      ...currentConfig,
      active_tank_table_id: activeTankTableId,
      tank_mappings: tankMappings,
      last_updated: new Date().toISOString()
    };

    this.tankTableStorage.saveTankTableConfiguration(updatedConfig);

    // Sync to legacy storage for backward compatibility
    this.syncToLegacyStorage(tankMappings);

    console.log('🔄 Unified tank configuration updated:', {
      activeTankTableId,
      mappingsCount: tankMappings.length,
      enabledMappings: tankMappings.filter(m => m.enabled).length
    });
  }

  /**
   * Sync tank mappings to legacy storage for backward compatibility
   */
  private syncToLegacyStorage(tankMappings: TankMapping[]): void {
    // Note: Legacy sync is disabled to avoid circular updates
    // Tank Table Storage is now the authoritative source
    // This method is kept for future compatibility if needed
    console.log(`🔄 Legacy sync called for ${tankMappings.length} tank mappings (no-op)`);
  }

  /**
   * Migrate from legacy configuration to Tank Table Storage
   * This should be called when Tank Table Storage is empty but legacy config exists
   */
  migrateLegacyConfiguration(): boolean {
    const unifiedConfig = this.getUnifiedConfiguration();
    
    // Only migrate if we have legacy config but no tank table config
    if (unifiedConfig.configurationSource !== 'legacy') {
      return false;
    }

    console.log('🔄 Migrating legacy tank configuration to Tank Table Storage...');

    // For now, we can't automatically migrate because we need a tank table
    // This would require user intervention to select a tank table first
    console.warn('⚠️ Legacy configuration found, but migration requires tank table selection');
    
    return false;
  }

  /**
   * Get enhanced tank data using the unified configuration
   * This is the main method that should be used by the dashboard
   */
  getEnhancedTankData(rawTanks: Tank[]): EnhancedTank[] {
    const config = this.getUnifiedConfiguration();

    if (!config.isConfigured) {
      console.warn('⚠️ No tank configuration found, returning basic tank data');
      return this.enhancedDataService.enhanceTankData(rawTanks);
    }

    if (config.configurationSource === 'tank-table') {
      // Use Tank Table Storage (preferred)
      return this.enhancedDataService.enhanceTankData(rawTanks);
    } else {
      // Fallback to legacy system
      console.warn('⚠️ Using legacy tank configuration, consider migrating to Tank Table Storage');
      return this.enhancedDataService.enhanceTankData(rawTanks);
    }
  }

  /**
   * Check if tank heights are properly configured
   * Tank heights should come from tank table calibration data
   */
  validateTankHeights(): { isValid: boolean; issues: string[] } {
    const config = this.getUnifiedConfiguration();
    const issues: string[] = [];

    if (!config.isConfigured) {
      issues.push('No tank configuration found');
      return { isValid: false, issues };
    }

    if (config.configurationSource === 'legacy') {
      issues.push('Using legacy configuration - tank heights may not be accurate');
    }

    if (!config.activeTankTableId) {
      issues.push('No active tank table selected');
    } else {
      const tankTable = this.tankTableStorage.getTankTable(config.activeTankTableId);
      if (!tankTable) {
        issues.push('Active tank table not found');
      } else {
        // Check if tanks have calibration data
        const tanksWithoutCalibration = tankTable.tanks.filter(
          tank => !tank.calibration_data || tank.calibration_data.length === 0
        );
        
        if (tanksWithoutCalibration.length > 0) {
          issues.push(`${tanksWithoutCalibration.length} tanks missing calibration data`);
        }
      }
    }

    const enabledMappings = config.tankMappings.filter(m => m.enabled);
    if (enabledMappings.length === 0) {
      issues.push('No tank mappings enabled');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Get configuration status for debugging
   */
  getConfigurationStatus(): {
    tankTableStorage: object;
    legacyStorage: object;
    unifiedConfig: UnifiedTankConfiguration;
    validation: { isValid: boolean; issues: string[] };
  } {
    return {
      tankTableStorage: {
        config: this.tankTableStorage.getTankTableConfiguration(),
        activeTankTable: this.tankTableStorage.getActiveTankTable(),
        tankTablesCount: this.tankTableStorage.getTankTables().length
      },
      legacyStorage: {
        config: this.legacyStorage.getTankConfiguration(),
        vessels: this.legacyStorage.getVessels().length
      },
      unifiedConfig: this.getUnifiedConfiguration(),
      validation: this.validateTankHeights()
    };
  }

  /**
   * Reset all tank configuration
   * This clears both Tank Table Storage and legacy storage
   */
  resetAllConfiguration(): void {
    // Clear Tank Table Storage
    this.tankTableStorage.saveTankTableConfiguration({
      id: 'default',
      tank_mappings: [],
      last_updated: new Date().toISOString(),
      version: '1.0.0'
    });

    // Clear legacy storage
    this.legacyStorage.clearAllData();

    console.log('🔄 All tank configuration reset');
  }
}
