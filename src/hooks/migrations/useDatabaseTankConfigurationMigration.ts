import { type Tank } from '../../types/tank';
import { useTankConfiguration } from './useTankConfigurationMigration';
import { useCallback } from 'react';

/**
 * Migration hook that provides backward compatibility for components using the old useDatabaseTankConfiguration hook
 * This wraps the tank configuration migration to maintain the same interface
 */
export const useDatabaseTankConfiguration = (tanks: Tank[]) => {
  const {
    configuredTanks,
    configuration,
    reorderTanks,
    renameTank,
    exportConfig,
    importConfig,
    resetConfiguration,
  } = useTankConfiguration(tanks);

  // Add a no-op migration function for compatibility
  const migrateFromLocalStorage = useCallback(() => {
    console.log('Migration from localStorage is handled automatically by the unified configuration system');
  }, []);

  return {
    configuredTanks,
    configuration,
    isLoading: false, // The unified system handles loading state internally
    reorderTanks,
    renameTank,
    exportConfig,
    importConfig,
    resetConfiguration,
    migrateFromLocalStorage,
  };
};
