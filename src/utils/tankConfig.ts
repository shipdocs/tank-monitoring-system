import { type Tank } from '../types/tank';

export interface TankConfig {
  id: string;
  customName?: string;
  position: number;
}

export interface TankConfiguration {
  tanks: TankConfig[];
  lastUpdated: string;
  version: string;
}

const STORAGE_KEY = 'tank-monitoring-config';
const CONFIG_VERSION = '1.0.0';

// Default configuration
const createDefaultConfig = (tanks: Tank[]): TankConfiguration => ({
  tanks: tanks.map((tank, index) => ({
    id: tank.id,
    position: index,
  })),
  lastUpdated: new Date().toISOString(),
  version: CONFIG_VERSION,
});

// Save configuration to localStorage
export const saveTankConfiguration = (config: TankConfiguration): void => {
  try {
    const configToSave = {
      ...config,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
    console.log('Tank configuration saved to localStorage');
  } catch (error) {
    console.error('Failed to save tank configuration:', error);
  }
};

// Load configuration from localStorage
export const loadTankConfiguration = (tanks: Tank[]): TankConfiguration => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createDefaultConfig(tanks);
    }

    const config: TankConfiguration = JSON.parse(stored);

    // Validate configuration version
    if (config.version !== CONFIG_VERSION) {
      console.warn('Configuration version mismatch, creating new config');
      return createDefaultConfig(tanks);
    }

    // Ensure all current tanks are in the configuration
    const existingTankIds = new Set(config.tanks.map(t => t.id));
    const missingTanks = tanks.filter(tank => !existingTankIds.has(tank.id));

    if (missingTanks.length > 0) {
      const maxPosition = Math.max(...config.tanks.map(t => t.position), -1);
      const newTankConfigs = missingTanks.map((tank, index) => ({
        id: tank.id,
        position: maxPosition + index + 1,
      }));

      config.tanks.push(...newTankConfigs);
    }

    // Remove tanks that no longer exist
    config.tanks = config.tanks.filter(tankConfig =>
      tanks.some(tank => tank.id === tankConfig.id),
    );

    return config;
  } catch (error) {
    console.error('Failed to load tank configuration:', error);
    return createDefaultConfig(tanks);
  }
};

// Apply configuration to tanks (sort and rename)
export const applyTankConfiguration = (tanks: Tank[], config: TankConfiguration): Tank[] => {
  const configMap = new Map(config.tanks.map(tc => [tc.id, tc]));

  const result = tanks
    .map(tank => {
      const tankConfig = configMap.get(tank.id);
      return {
        ...tank,
        name: tankConfig?.customName || tank.name,
        position: tankConfig?.position ?? 999,
      };
    })
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  return result;
};

// Update tank position
export const updateTankPosition = (
  config: TankConfiguration,
  tankId: string,
  newPosition: number,
): TankConfiguration => {
  const updatedTanks = config.tanks.map(tank =>
    tank.id === tankId ? { ...tank, position: newPosition } : tank,
  );

  return {
    ...config,
    tanks: updatedTanks,
    lastUpdated: new Date().toISOString(),
  };
};

// Update tank name
export const updateTankName = (
  config: TankConfiguration,
  tankId: string,
  customName: string,
): TankConfiguration => {
  const updatedTanks = config.tanks.map(tank =>
    tank.id === tankId ? { ...tank, customName: customName.trim() || undefined } : tank,
  );

  return {
    ...config,
    tanks: updatedTanks,
    lastUpdated: new Date().toISOString(),
  };
};

// Export configuration to file
export const exportConfiguration = (config: TankConfiguration): void => {
  try {
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `tank-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    console.log('Configuration exported successfully');
  } catch (error) {
    console.error('Failed to export configuration:', error);
  }
};

// Import configuration from file
export const importConfiguration = (file: File): Promise<TankConfiguration> => new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const config: TankConfiguration = JSON.parse(event.target?.result as string);

      // Basic validation
      if (!config.tanks || !Array.isArray(config.tanks)) {
        throw new Error('Invalid configuration format');
      }

      resolve({
        ...config,
        version: CONFIG_VERSION,
        lastUpdated: new Date().toISOString(),
      });
    } catch {
      reject(new Error('Failed to parse configuration file'));
    }
  };

  reader.onerror = () => reject(new Error('Failed to read file'));
  reader.readAsText(file);
});
