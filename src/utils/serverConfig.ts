import { DataSourceConfig } from '../types/vessel';

// Server configuration interface (matches server expectations)
interface ServerConfig {
  selectedPort?: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: string;
  dataFormat: string;
  tankCount: number;
  autoConnect: boolean;
  csvFile: {
    enabled: boolean;
    filePath: string;
    importInterval: number;
    hasHeaders: boolean;
    delimiter: string;
    autoDiscoverColumns: boolean;
    columnMapping: {
      id: string;
      name: string;
      level: string;
      maxCapacity: string;
      minLevel: string;
      maxLevel: string;
      unit: string;
      location: string;
    };
    // Extended for vertical format
    isVerticalFormat?: boolean;
    linesPerRecord?: number;
    lineMapping?: Record<number, string>;
  };
}

// Convert wizard DataSourceConfig to server config format
export const convertToServerConfig = (dataSource: DataSourceConfig, tankCount: number = 12): ServerConfig => {
  const baseConfig: ServerConfig = {
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    dataFormat: 'csv',
    tankCount,
    autoConnect: true,
    csvFile: {
      enabled: false,
      filePath: '',
      importInterval: 30000,
      hasHeaders: true,
      delimiter: ',',
      autoDiscoverColumns: true,
      columnMapping: {
        id: 'tank_id',
        name: 'tank_name',
        level: 'level',
        maxCapacity: 'max_capacity',
        minLevel: 'min_level',
        maxLevel: 'max_level',
        unit: 'unit',
        location: 'location'
      }
    }
  };

  switch (dataSource.type) {
    case 'serial-port':
      return {
        ...baseConfig,
        dataFormat: 'csv',
        csvFile: {
          ...baseConfig.csvFile,
          enabled: false
        }
      };

    case 'csv-file':
    case 'txt-file':
      return {
        ...baseConfig,
        dataFormat: 'csvfile',
        csvFile: {
          ...baseConfig.csvFile,
          enabled: true,
          filePath: dataSource.filePath || '',
          importInterval: dataSource.importInterval || 30000,
          hasHeaders: dataSource.hasHeaders ?? true,
          delimiter: dataSource.delimiter || ',',
          isVerticalFormat: dataSource.isVerticalFormat || false,
          linesPerRecord: dataSource.linesPerRecord || 4,
          lineMapping: dataSource.lineMapping || {},
          // Convert line mapping to column mapping for server
          columnMapping: convertLineMappingToColumnMapping(dataSource)
        }
      };

    case 'json-file':
      return {
        ...baseConfig,
        dataFormat: 'json',
        csvFile: {
          ...baseConfig.csvFile,
          enabled: true,
          filePath: dataSource.filePath || '',
          importInterval: dataSource.importInterval || 30000,
          hasHeaders: false,
          delimiter: ','
        }
      };

    default:
      throw new Error(`Unsupported data source type: ${dataSource.type}`);
  }
};

// Convert line mapping to column mapping for server compatibility
const convertLineMappingToColumnMapping = (dataSource: DataSourceConfig) => {
  const defaultMapping = {
    id: 'tank_id',
    name: 'tank_name',
    level: 'level',
    maxCapacity: 'max_capacity',
    minLevel: 'min_level',
    maxLevel: 'max_level',
    unit: 'unit',
    location: 'location'
  };

  if (!dataSource.lineMapping || !dataSource.isVerticalFormat) {
    return defaultMapping;
  }

  // For vertical format, we'll use line positions as column names
  const mapping = { ...defaultMapping };
  Object.entries(dataSource.lineMapping).forEach(([lineIndex, fieldName]) => {
    if (fieldName && fieldName !== 'ignore') {
      const columnName = `line_${lineIndex}`;
      switch (fieldName) {
        case 'id':
          mapping.id = columnName;
          break;
        case 'name':
          mapping.name = columnName;
          break;
        case 'level':
          mapping.level = columnName;
          break;
        case 'maxCapacity':
          mapping.maxCapacity = columnName;
          break;
        case 'minLevel':
          mapping.minLevel = columnName;
          break;
        case 'maxLevel':
          mapping.maxLevel = columnName;
          break;
        case 'unit':
          mapping.unit = columnName;
          break;
        case 'location':
          mapping.location = columnName;
          break;
      }
    }
  });

  return mapping;
};

// API functions for server communication
export const saveServerConfig = async (config: ServerConfig): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3001/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to save server config:', error);
    return false;
  }
};

export const connectToDataSource = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3001/api/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const result = await response.json();
    return result.success && result.connected;
  } catch (error) {
    console.error('Failed to connect to data source:', error);
    return false;
  }
};

export const disconnectFromDataSource = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3001/api/disconnect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to disconnect from data source:', error);
    return false;
  }
};

export const getServerConfig = async (): Promise<ServerConfig | null> => {
  try {
    const response = await fetch('http://localhost:3001/api/config');

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get server config:', error);
    return null;
  }
};

export const getServerStatus = async (): Promise<any> => {
  try {
    const response = await fetch('http://localhost:3001/api/status');

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get server status:', error);
    return null;
  }
};

// Helper function to apply wizard configuration to server
export const applyWizardConfigToServer = async (
  dataSource: DataSourceConfig, 
  tankCount: number = 12
): Promise<{ success: boolean; connected: boolean }> => {
  try {
    console.log('🔧 Applying wizard config to server:', dataSource);
    
    // Convert wizard config to server format
    const serverConfig = convertToServerConfig(dataSource, tankCount);
    console.log('📤 Server config:', serverConfig);
    
    // Save configuration to server
    const saveSuccess = await saveServerConfig(serverConfig);
    if (!saveSuccess) {
      throw new Error('Failed to save configuration to server');
    }
    
    console.log('✅ Configuration saved to server');
    
    // Connect to data source
    const connected = await connectToDataSource();
    console.log(`🔌 Connection ${connected ? 'successful' : 'failed'}`);
    
    return { success: true, connected };
  } catch (error) {
    console.error('❌ Failed to apply wizard config to server:', error);
    return { success: false, connected: false };
  }
};
