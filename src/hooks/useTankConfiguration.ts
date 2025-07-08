import { useCallback, useEffect, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { type Tank } from '../types/tank';
import {
  type TankConfiguration,
  applyTankConfiguration,
  exportConfiguration,
  importConfiguration,
  loadTankConfiguration,
  saveTankConfiguration,
  updateTankName,
} from '../utils/tankConfig';

export const useTankConfiguration = (originalTanks: Tank[]) => {
  const [configuration, setConfiguration] = useState<TankConfiguration | null>(null);
  const [configuredTanks, setConfiguredTanks] = useState<Tank[]>(originalTanks);

  // Load configuration on mount
  useEffect(() => {
    if (originalTanks.length > 0) {
      const config = loadTankConfiguration(originalTanks);
      setConfiguration(config);
    }
  }, [originalTanks]);

  // Apply configuration when it changes
  useEffect(() => {
    if (configuration && originalTanks.length > 0) {
      const configured = applyTankConfiguration(originalTanks, configuration);
      setConfiguredTanks(configured);
    }
  }, [configuration, originalTanks]);

  // Save configuration whenever it changes
  useEffect(() => {
    if (configuration) {
      saveTankConfiguration(configuration);
    }
  }, [configuration]);

  const reorderTanks = useCallback((oldIndex: number, newIndex: number) => {
    if (!configuration) return;

    console.log('Reorder called:', { oldIndex, newIndex });
    console.log('Current tanks before reorder:', configuredTanks.map(t => ({ id: t.id, name: t.name, position: t.position })));
    console.log('Dragged tank:', configuredTanks[oldIndex]?.name);
    console.log('Target position tank:', configuredTanks[newIndex]?.name);

    // Debug: Check if indices are what we expect
    console.log('=== DRAG AND DROP DEBUG ===');
    console.log('oldIndex:', oldIndex, 'newIndex:', newIndex);
    console.log('Total tanks:', configuredTanks.length);
    console.log('Moving from position', oldIndex, 'to position', newIndex);

    // Validate indices
    if (oldIndex < 0 || oldIndex >= configuredTanks.length ||
        newIndex < 0 || newIndex >= configuredTanks.length) {
      console.error('Invalid indices!', { oldIndex, newIndex, totalTanks: configuredTanks.length });
      return;
    }

    // Special case debugging for first position
    if (newIndex === 0) {
      console.log('🚨 SPECIAL CASE: Moving to FIRST position');
      console.log('Tank being moved:', configuredTanks[oldIndex]);
      console.log('Current first tank:', configuredTanks[0]);
    }

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

    const updatedConfig = {
      ...configuration,
      tanks: updatedTankConfigs,
      lastUpdated: new Date().toISOString(),
    };

    setConfiguration(updatedConfig);
  }, [configuration, configuredTanks]);

  const renameTank = useCallback((tankId: string, newName: string) => {
    console.log('=== AFTER CONFIGURATION UPDATE ===');
    console.log('New configuration will trigger applyTankConfiguration effect');
    console.log('This will re-sort tanks based on position property');
    console.log('If ordering looks wrong, check applyTankConfiguration sorting logic');

    if (!configuration) return;

    const updatedConfig = updateTankName(configuration, tankId, newName);
    setConfiguration(updatedConfig);
  }, [configuration]);

  const exportConfig = useCallback(() => {
    if (configuration) {
      exportConfiguration(configuration);
    }
  }, [configuration]);

  const importConfig = useCallback(async (file: File) => {
    try {
      const importedConfig = await importConfiguration(file);
      setConfiguration(importedConfig);
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }, []);

  const resetConfiguration = useCallback(() => {
    if (originalTanks.length > 0) {
      // Clear localStorage
      localStorage.removeItem('tank-monitoring-config');
      // Reset to default
      const freshConfig = loadTankConfiguration(originalTanks);
      setConfiguration(freshConfig);
    }
  }, [originalTanks]);

  return {
    configuredTanks,
    configuration,
    reorderTanks,
    renameTank,
    exportConfig,
    importConfig,
    resetConfiguration,
  };
};
