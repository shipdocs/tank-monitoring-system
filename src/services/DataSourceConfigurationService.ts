/**
 * DataSourceConfigurationService - Manages data source configuration
 * 
 * This service handles configuration of where tank data comes from:
 * - File path configuration
 * - Format settings (vertical, CSV)
 * - Connection testing
 * - Server configuration updates
 */

export interface DataSourceConfiguration {
  id: string;
  enabled: boolean;
  filePath: string;
  format: 'vertical' | 'csv';
  maxRecords: number;
  encoding: string;
  importInterval: number;
  
  // Vertical format specific
  linesPerRecord: number;
  lineMapping: Record<string, string>;
  
  // CSV format specific
  delimiter: string;
  hasHeaders: boolean;
  
  lastUpdated: string;
}

export class DataSourceConfigurationService {
  private static instance: DataSourceConfigurationService;
  private storageKey = 'tank-data-source-config-v1';

  private constructor() {}

  static getInstance(): DataSourceConfigurationService {
    if (!DataSourceConfigurationService.instance) {
      DataSourceConfigurationService.instance = new DataSourceConfigurationService();
    }
    return DataSourceConfigurationService.instance;
  }

  /**
   * Get current data source configuration
   */
  getConfiguration(): DataSourceConfiguration {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load data source configuration:', error);
    }

    // Return default configuration
    return this.getDefaultConfiguration();
  }

  /**
   * Save data source configuration
   */
  saveConfiguration(config: DataSourceConfiguration): void {
    try {
      config.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(config));
      console.log('✅ Data source configuration saved:', config);
    } catch (error) {
      console.error('❌ Failed to save data source configuration:', error);
      throw error;
    }
  }

  /**
   * Get default configuration for vertical format (ExportReady.txt style)
   */
  getDefaultConfiguration(): DataSourceConfiguration {
    return {
      id: 'default-data-source',
      enabled: true,
      filePath: './ExportReady.txt',
      format: 'vertical',
      maxRecords: 12,
      encoding: 'utf8',
      importInterval: 3000,
      linesPerRecord: 4,
      lineMapping: {
        '0': 'level',
        '1': 'temperature', 
        '2': 'ignore',
        '3': 'ignore'
      },
      delimiter: ',',
      hasHeaders: false,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Test connection to data source
   */
  async testConnection(config: DataSourceConfiguration): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await fetch('/api/test-data-source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        message: `Connection successful! Found ${result.recordCount || 0} records.`,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Apply configuration to server
   */
  async applyConfiguration(config: DataSourceConfiguration): Promise<{ success: boolean; message: string }> {
    try {
      // Save locally first
      this.saveConfiguration(config);

      // Send to server
      const response = await fetch('/api/configure-data-source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        message: 'Configuration applied successfully! Data source is now active.'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to apply configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get configuration status from server
   */
  async getServerStatus(): Promise<{ connected: boolean; filePath?: string; recordCount?: number; lastUpdate?: string }> {
    try {
      const response = await fetch('/api/data-source-status');
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to get server status:', error);
      return { connected: false };
    }
  }

  /**
   * Validate configuration
   */
  validateConfiguration(config: Partial<DataSourceConfiguration>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.filePath || config.filePath.trim() === '') {
      errors.push('File path is required');
    }

    if (!config.format || !['vertical', 'csv'].includes(config.format)) {
      errors.push('Format must be either "vertical" or "csv"');
    }

    if (!config.maxRecords || config.maxRecords < 1 || config.maxRecords > 24) {
      errors.push('Max records must be between 1 and 24');
    }

    if (config.format === 'vertical') {
      if (!config.linesPerRecord || config.linesPerRecord < 1) {
        errors.push('Lines per record must be at least 1 for vertical format');
      }
      if (!config.lineMapping || Object.keys(config.lineMapping).length === 0) {
        errors.push('Line mapping is required for vertical format');
      }
    }

    if (config.format === 'csv') {
      if (!config.delimiter || config.delimiter.trim() === '') {
        errors.push('Delimiter is required for CSV format');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create configuration for common file types
   */
  createConfigurationTemplate(type: 'exportready' | 'csv-horizontal' | 'custom'): DataSourceConfiguration {
    const base = this.getDefaultConfiguration();

    switch (type) {
      case 'exportready':
        return {
          ...base,
          filePath: './ExportReady.txt',
          format: 'vertical',
          linesPerRecord: 4,
          lineMapping: {
            '0': 'level',
            '1': 'temperature',
            '2': 'ignore', 
            '3': 'ignore'
          }
        };

      case 'csv-horizontal':
        return {
          ...base,
          filePath: './tank-data.csv',
          format: 'csv',
          delimiter: ',',
          hasHeaders: true,
          linesPerRecord: 1
        };

      case 'custom':
      default:
        return base;
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): DataSourceConfiguration {
    const defaultConfig = this.getDefaultConfiguration();
    this.saveConfiguration(defaultConfig);
    return defaultConfig;
  }
}
