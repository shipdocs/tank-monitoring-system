import { type Tank } from '../../types/tank';
import { useConfiguration } from '../../contexts/ConfigurationContext';
import { useCallback, useMemo } from 'react';

/**
 * Migration hook that provides backward compatibility for components using the old useTankConfiguration hook
 * This should be used temporarily while migrating components to use the new unified configuration system
 */
export const useTankConfiguration = (originalTanks: Tank[]) => {
  const {
    tankConfigurations,
    updateTankConfiguration,
    reorderTanks,
    resetTankConfiguration,
    exportConfiguration,
    importConfiguration,
    isLoading,
  } = useConfiguration();

  // Apply tank configurations to get configured tanks with custom names and positions
  const configuredTanks = useMemo(() => {
    const configMap = new Map(tankConfigurations.map(tc => [tc.id, tc]));

    return originalTanks
      .map(tank => {
        const config = configMap.get(tank.id);
        return {
          ...tank,
          name: config?.customName || tank.name,
          position: config?.position ?? 999,
        };
      })
      .sort((a, b) => (a.position || 999) - (b.position || 999));
  }, [originalTanks, tankConfigurations]);

  // Convert to old configuration format for compatibility
  const configuration = useMemo(() => {
    if (!tankConfigurations.length) return null;

    return {
      tanks: tankConfigurations,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    };
  }, [tankConfigurations]);

  const renameTank = useCallback((tankId: string, newName: string) => {
    updateTankConfiguration(tankId, {
      customName: newName.trim() || undefined,
    });
  }, [updateTankConfiguration]);

  const exportConfig = useCallback(() => {
    exportConfiguration();
  }, [exportConfiguration]);

  const importConfig = useCallback(async (file: File) => importConfiguration(file), [importConfiguration]);

  return {
    configuredTanks,
    configuration,
    reorderTanks,
    renameTank,
    exportConfig,
    importConfig,
    resetConfiguration: resetTankConfiguration,
  };
};
