import { useVesselConfiguration } from './useVesselConfigurationMigration';
import { useCallback } from 'react';
import { useConfiguration } from '../../contexts/ConfigurationContext';

/**
 * Migration hook that provides backward compatibility for components using the old useDatabaseVesselConfiguration hook
 * This wraps the vessel configuration migration to maintain the same interface
 */
export const useDatabaseVesselConfiguration = () => {
  const vesselConfig = useVesselConfiguration();
  const { isLoading } = useConfiguration();

  // Add a no-op migration function for compatibility
  const migrateFromLocalStorage = useCallback(() => {
    console.log('Migration from localStorage is handled automatically by the unified configuration system');
  }, []);

  return {
    ...vesselConfig,
    isLoading,
    migrateFromLocalStorage,
  };
};
