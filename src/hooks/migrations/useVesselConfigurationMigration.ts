import { type Tank } from '../../types/tank';
import { useConfiguration } from '../../contexts/ConfigurationContext';
import { useCallback, useMemo } from 'react';

/**
 * Migration hook that provides backward compatibility for components using the old useVesselConfiguration hook
 * This should be used temporarily while migrating components to use the new unified configuration system
 */
export const useVesselConfiguration = () => {
  const configuration = useConfiguration();

  const getTanksByGroup = useCallback((vesselId: string, tanks: Tank[]): Record<string, Tank[]> => {
    const vessel = configuration.vessels.find(v => v.id === vesselId);
    if (!vessel) return {};

    const result: Record<string, Tank[]> = {};

    vessel.tankGroups.forEach(group => {
      result[group.id] = group.tanks
        .map(tankId => tanks.find(tank => tank.id === tankId))
        .filter(Boolean) as Tank[];
    });

    return result;
  }, [configuration.vessels]);

  const getGroupedTanks = useCallback((tanks: Tank[]): Tank[] => {
    if (!configuration.currentVessel) return tanks;

    const groupedTankIds = new Set(
      configuration.currentVessel.tankGroups.flatMap(group => group.tanks),
    );

    const groupedTanks: Tank[] = [];
    const ungroupedTanks: Tank[] = [];

    tanks.forEach(tank => {
      if (groupedTankIds.has(tank.id)) {
        groupedTanks.push(tank);
      } else {
        ungroupedTanks.push(tank);
      }
    });

    // Return grouped tanks in group order, then ungrouped tanks
    const orderedGroupedTanks: Tank[] = [];
    configuration.currentVessel.tankGroups.forEach(group => {
      group.tanks.forEach(tankId => {
        const tank = tanks.find(t => t.id === tankId);
        if (tank) orderedGroupedTanks.push(tank);
      });
    });

    return [...orderedGroupedTanks, ...ungroupedTanks];
  }, [configuration.currentVessel]);

  const exportVesselConfig = useCallback((vesselId: string) => {
    const vessel = configuration.vessels.find(v => v.id === vesselId);
    if (!vessel) return;

    const dataStr = JSON.stringify(vessel, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${vessel.name.replace(/\s+/g, '-').toLowerCase()}-config.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [configuration.vessels]);

  const importVesselConfig = useCallback(async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const config = JSON.parse(text);

      // Validate basic structure
      if (!config.id || !config.name || !config.type) {
        throw new Error('Invalid vessel configuration format');
      }

      // Generate new ID to avoid conflicts
      const newId = `vessel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const importedVessel = { ...config, id: newId };

      configuration.createVessel(importedVessel);
      return true;
    } catch (error) {
      console.error('Failed to import vessel configuration:', error);
      return false;
    }
  }, [configuration]);

  return {
    currentVessel: configuration.currentVessel,
    vessels: configuration.vessels,
    createVessel: configuration.createVessel,
    updateVessel: configuration.updateVessel,
    deleteVessel: configuration.deleteVessel,
    setActiveVessel: configuration.setActiveVessel,
    addTankGroup: configuration.addTankGroup,
    updateTankGroup: configuration.updateTankGroup,
    deleteTankGroup: configuration.deleteTankGroup,
    reorderTankGroups: configuration.reorderTankGroups,
    assignTankToGroup: configuration.assignTankToGroup,
    removeTankFromGroup: configuration.removeTankFromGroup,
    reorderTanksInGroup: configuration.reorderTanksInGroup,
    templates: configuration.templates,
    createVesselFromTemplate: configuration.createVesselFromTemplate,
    exportVesselConfig,
    importVesselConfig,
    getTanksByGroup,
    getGroupedTanks,
  };
};
