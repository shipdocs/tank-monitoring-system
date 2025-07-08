import { useCallback, useEffect, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { type Tank } from '../types/tank';
import { type AppConfiguration, TankStorage } from '../storage/TankStorage';
import {
  applyTankConfiguration,
  exportConfiguration,
  importConfiguration,
} from '../utils/tankConfig';

const storage = TankStorage.getInstance();

interface UseDatabaseTankConfigurationReturn {
  configuredTanks: Tank[];
  configuration: AppConfiguration | null;
  isLoading: boolean;
  reorderTanks: (oldIndex: number, newIndex: number) => void;
  renameTank: (tankId: string, newName: string) => void;
  exportConfig: () => void;
  importConfig: (file: File) => Promise<boolean>;
  resetConfiguration: () => void;
  migrateFromLocalStorage: () => void;
}

export const useDatabaseTankConfiguration = (tanks: Tank[]): UseDatabaseTankConfigurationReturn => {
  const [configuration, setConfiguration] = useState<AppConfiguration | null>(null);
  const [configuredTanks, setConfiguredTanks] = useState<Tank[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfiguration = useCallback(async () => {
    try {
      setIsLoading(true);
      const config = storage.getTankConfiguration();
      setConfiguration(config);
    } catch (error) {
      console.error('Failed to load tank configuration from storage:', error);
      // Create default configuration
      const defaultConfig: AppConfiguration = {
        id: 'default',
        tanks: [],
        lastUpdated: new Date().toISOString(),
      };
      setConfiguration(defaultConfig);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load configuration from database on mount
  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  // Apply configuration when tanks or configuration changes
  useEffect(() => {
    if (configuration && tanks.length > 0) {
      const applied = applyTankConfiguration(tanks, configuration);
      setConfiguredTanks(applied);
    } else {
      setConfiguredTanks(tanks);
    }
  }, [tanks, configuration]);

  const saveConfiguration = useCallback((config: AppConfiguration) => {
    try {
      storage.saveTankConfiguration(config);
      setConfiguration(config);
    } catch (error) {
      console.error('Failed to save tank configuration to storage:', error);
      throw error;
    }
  }, []);

  const reorderTanks = useCallback((oldIndex: number, newIndex: number) => {
    if (!configuration) return;

    console.log('Reorder called:', { oldIndex, newIndex });
    console.log('Current tanks before reorder:', configuredTanks.map(t => ({ id: t.id, name: t.name, position: t.position })));
    console.log('Dragged tank:', configuredTanks[oldIndex]?.name);
    console.log('Target position tank:', configuredTanks[newIndex]?.name);

    // Use arrayMove for proper reordering (dnd-kit recommended approach)
    const reorderedTanks = arrayMove(configuredTanks, oldIndex, newIndex);

    console.log('Expected new order:', reorderedTanks.map(t => t.name));

    // Create a map of existing tank configs to preserve custom names
    const configMap = new Map(configuration.tanks.map(tc => [tc.id, tc]));

    // Update positions based on the new order
    const updatedTankConfigs = reorderedTanks.map((tank, index) => {
      const existingConfig = configMap.get(tank.id);
      return {
        id: tank.id,
        customName: existingConfig?.customName,
        position: index,
      };
    });

    console.log('Updated tank configs:', updatedTankConfigs);

    const updatedConfig: AppConfiguration = {
      ...configuration,
      tanks: updatedTankConfigs,
      lastUpdated: new Date().toISOString(),
    };

    saveConfiguration(updatedConfig);
  }, [configuration, configuredTanks, saveConfiguration]);

  const renameTank = useCallback((tankId: string, newName: string) => {
    if (!configuration) return;

    const updatedTanks = configuration.tanks.map(tank =>
      tank.id === tankId
        ? { ...tank, customName: newName.trim() || undefined }
        : tank,
    );

    // Add tank if it doesn't exist
    if (!configuration.tanks.find(t => t.id === tankId)) {
      const maxPosition = Math.max(...configuration.tanks.map(t => t.position), -1);
      updatedTanks.push({
        id: tankId,
        customName: newName.trim() || undefined,
        position: maxPosition + 1,
      });
    }

    const updatedConfig: AppConfiguration = {
      ...configuration,
      tanks: updatedTanks,
      lastUpdated: new Date().toISOString(),
    };

    saveConfiguration(updatedConfig);
  }, [configuration, saveConfiguration]);

  const exportConfig = useCallback(() => {
    if (!configuration) return;

    try {
      exportConfiguration(configuration);
    } catch (error) {
      console.error('Failed to export configuration:', error);
      alert('Failed to export configuration. Please try again.');
    }
  }, [configuration]);

  const importConfig = useCallback(async (file: File): Promise<boolean> => {
    try {
      const imported = await importConfiguration(file);
      if (imported) {
        const updatedConfig: AppConfiguration = {
          ...imported,
          lastUpdated: new Date().toISOString(),
        };
        saveConfiguration(updatedConfig);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }, [saveConfiguration]);

  const resetConfiguration = useCallback(() => {
    const defaultConfig: AppConfiguration = {
      id: 'default',
      tanks: tanks.map((tank, index) => ({
        id: tank.id,
        position: index,
      })),
      lastUpdated: new Date().toISOString(),
    };

    saveConfiguration(defaultConfig);
  }, [tanks, saveConfiguration]);

  const migrateFromLocalStorage = useCallback(() => {
    try {
      const tankConfigData = localStorage.getItem('tank-configuration');

      if (tankConfigData) {
        const parsedData = JSON.parse(tankConfigData);

        // Convert old format to new format if needed
        const migratedConfig: AppConfiguration = {
          id: 'default',
          tanks: parsedData.tanks || [],
          lastUpdated: parsedData.lastUpdated || new Date().toISOString(),
        };

        saveConfiguration(migratedConfig);

        // Remove from localStorage after successful migration
        localStorage.removeItem('tank-configuration');

        console.log('Successfully migrated tank configuration from localStorage to SQLite');
      }
    } catch (error) {
      console.error('Failed to migrate tank configuration from localStorage:', error);
    }
  }, [saveConfiguration]);

  return {
    configuredTanks,
    configuration,
    isLoading,
    reorderTanks,
    renameTank,
    exportConfig,
    importConfig,
    resetConfiguration,
    migrateFromLocalStorage,
  };
};
