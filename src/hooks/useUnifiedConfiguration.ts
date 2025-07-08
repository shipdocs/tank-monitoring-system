import { useCallback, useEffect, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { type Tank } from '../types/tank';
import {
  type ConfigurationContextData,
  type TankConfiguration,
  type TankGroup,
  type VesselConfiguration,
} from '../types/configuration';
import { UnifiedConfigurationStorage } from '../storage/ConfigurationStorage';
import { VESSEL_TEMPLATES } from '../constants/vesselTemplates';

const storage = UnifiedConfigurationStorage.getInstance();

interface UseUnifiedConfigurationProps {
  tanks: Tank[];
}

export const useUnifiedConfiguration = ({ tanks }: UseUnifiedConfigurationProps): ConfigurationContextData => {
  const [tankConfigurations, setTankConfigurations] = useState<TankConfiguration[]>([]);
  const [vessels, setVessels] = useState<VesselConfiguration[]>([]);
  const [currentVessel, setCurrentVessel] = useState<VesselConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load all configuration data
  const loadConfiguration = useCallback(() => {
    try {
      setIsLoading(true);

      // Load tank configurations
      const loadedTankConfigs = storage.getTankConfigurations();

      // Ensure all current tanks have a configuration
      const configMap = new Map(loadedTankConfigs.map(tc => [tc.id, tc]));
      const updatedConfigs: TankConfiguration[] = tanks.map((tank, index) => {
        const existing = configMap.get(tank.id);
        if (existing) {
          return existing;
        }
        return {
          id: tank.id,
          position: index,
        };
      });

      setTankConfigurations(updatedConfigs);

      // Load vessels
      const loadedVessels = storage.getVessels();
      setVessels(loadedVessels);

      // Load active vessel
      const activeVesselId = storage.getActiveVesselId();
      if (activeVesselId) {
        const activeVessel = loadedVessels.find(v => v.id === activeVesselId);
        setCurrentVessel(activeVessel || null);
      } else if (loadedVessels.length > 0) {
        // Set first vessel as active if none is set
        setCurrentVessel(loadedVessels[0]);
        storage.setActiveVesselId(loadedVessels[0].id);
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tanks]);

  // Load configuration on mount and when tanks change
  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  // Save tank configurations whenever they change
  useEffect(() => {
    if (!isLoading && tankConfigurations.length > 0) {
      storage.saveTankConfigurations(tankConfigurations);
    }
  }, [tankConfigurations, isLoading]);

  // Tank configuration methods
  const updateTankConfiguration = useCallback((tankId: number, config: Partial<TankConfiguration>) => {
    setTankConfigurations(prev => prev.map(tc =>
      tc.id === tankId ? { ...tc, ...config } : tc,
    ));
  }, []);

  const reorderTanks = useCallback((oldIndex: number, newIndex: number) => {
    setTankConfigurations(prev => {
      const reordered = arrayMove(prev, oldIndex, newIndex);
      // Update positions based on new order
      return reordered.map((config, index) => ({
        ...config,
        position: index,
      }));
    });
  }, []);

  const resetTankConfiguration = useCallback(() => {
    const defaultConfigs = tanks.map((tank, index) => ({
      id: tank.id,
      position: index,
    }));
    setTankConfigurations(defaultConfigs);
  }, [tanks]);

  // Vessel management methods
  const createVessel = useCallback((vessel: Omit<VesselConfiguration, 'id' | 'metadata'>) => {
    const id = `vessel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newVessel: VesselConfiguration = {
      ...vessel,
      id,
      metadata: {
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    };

    storage.saveVessel(newVessel);
    setVessels(prev => [newVessel, ...prev]);
    setCurrentVessel(newVessel);
    storage.setActiveVesselId(id);
    return id;
  }, []);

  const updateVessel = useCallback((id: string, updates: Partial<VesselConfiguration>) => {
    const vessel = vessels.find(v => v.id === id);
    if (!vessel) return;

    const updatedVessel: VesselConfiguration = {
      ...vessel,
      ...updates,
      metadata: {
        ...vessel.metadata,
        lastModified: new Date().toISOString(),
      },
    };

    storage.saveVessel(updatedVessel);
    setVessels(prev => prev.map(v => v.id === id ? updatedVessel : v));

    if (currentVessel?.id === id) {
      setCurrentVessel(updatedVessel);
    }
  }, [vessels, currentVessel]);

  const deleteVessel = useCallback((id: string) => {
    storage.deleteVessel(id);
    setVessels(prev => prev.filter(v => v.id !== id));

    if (currentVessel?.id === id) {
      const remaining = vessels.filter(v => v.id !== id);
      if (remaining.length > 0) {
        setCurrentVessel(remaining[0]);
        storage.setActiveVesselId(remaining[0].id);
      } else {
        setCurrentVessel(null);
      }
    }
  }, [currentVessel, vessels]);

  const setActiveVessel = useCallback((id: string) => {
    const vessel = vessels.find(v => v.id === id);
    if (vessel) {
      setCurrentVessel(vessel);
      storage.setActiveVesselId(id);
    }
  }, [vessels]);

  // Tank group management
  const addTankGroup = useCallback((vesselId: string, group: Omit<TankGroup, 'id'>) => {
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newGroup: TankGroup = { ...group, id: groupId };

    const vessel = vessels.find(v => v.id === vesselId);
    if (vessel) {
      updateVessel(vesselId, {
        tankGroups: [...vessel.tankGroups, newGroup],
      });
    }
  }, [vessels, updateVessel]);

  const updateTankGroup = useCallback((vesselId: string, groupId: string, updates: Partial<TankGroup>) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (vessel) {
      const updatedGroups = vessel.tankGroups.map(group =>
        group.id === groupId ? { ...group, ...updates } : group,
      );
      updateVessel(vesselId, { tankGroups: updatedGroups });
    }
  }, [vessels, updateVessel]);

  const deleteTankGroup = useCallback((vesselId: string, groupId: string) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (vessel) {
      const updatedGroups = vessel.tankGroups.filter(group => group.id !== groupId);
      updateVessel(vesselId, { tankGroups: updatedGroups });
    }
  }, [vessels, updateVessel]);

  const reorderTankGroups = useCallback((vesselId: string, groupIds: string[]) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (vessel) {
      const reorderedGroups = groupIds
        .map(id => vessel.tankGroups.find(group => group.id === id))
        .filter(Boolean) as TankGroup[];
      updateVessel(vesselId, { tankGroups: reorderedGroups });
    }
  }, [vessels, updateVessel]);

  // Tank assignment methods
  const assignTankToGroup = useCallback((vesselId: string, tankId: string, groupId: string) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (vessel) {
      // Remove tank from any existing group
      const updatedGroups = vessel.tankGroups.map(group => ({
        ...group,
        tanks: group.tanks.filter(id => id !== tankId),
      }));

      // Add tank to new group
      const targetGroupIndex = updatedGroups.findIndex(group => group.id === groupId);
      if (targetGroupIndex !== -1) {
        updatedGroups[targetGroupIndex].tanks.push(tankId);
      }

      updateVessel(vesselId, { tankGroups: updatedGroups });
    }
  }, [vessels, updateVessel]);

  const removeTankFromGroup = useCallback((vesselId: string, tankId: string) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (vessel) {
      const updatedGroups = vessel.tankGroups.map(group => ({
        ...group,
        tanks: group.tanks.filter(id => id !== tankId),
      }));
      updateVessel(vesselId, { tankGroups: updatedGroups });
    }
  }, [vessels, updateVessel]);

  const reorderTanksInGroup = useCallback((vesselId: string, groupId: string, tankIds: string[]) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (vessel) {
      const updatedGroups = vessel.tankGroups.map(group =>
        group.id === groupId ? { ...group, tanks: tankIds } : group,
      );
      updateVessel(vesselId, { tankGroups: updatedGroups });
    }
  }, [vessels, updateVessel]);

  // Template methods
  const createVesselFromTemplate = useCallback((templateId: string, vesselName: string) => {
    const template = VESSEL_TEMPLATES.find(t => t.id === templateId);
    if (!template) throw new Error('Template not found');

    const tankGroups: TankGroup[] = template.defaultGroups.map((group, index) => ({
      ...group,
      id: `group-${Date.now()}-${index}`,
      tanks: [],
    }));

    return createVessel({
      name: vesselName,
      type: template.vesselType,
      layout: {
        type: template.layoutType,
        sections: {},
      },
      tankGroups,
    });
  }, [createVessel]);

  // Import/Export methods
  const exportConfiguration = useCallback(() => {
    const dataStr = storage.exportConfiguration();
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `tankmon-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const importConfiguration = useCallback(async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const success = storage.importConfiguration(text);
      if (success) {
        // Reload configuration after import
        loadConfiguration();
      }
      return success;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }, [loadConfiguration]);

  return {
    // Tank configuration
    tankConfigurations,
    updateTankConfiguration,
    reorderTanks,
    resetTankConfiguration,

    // Vessel configuration
    vessels,
    currentVessel,
    createVessel,
    updateVessel,
    deleteVessel,
    setActiveVessel,

    // Tank groups
    addTankGroup,
    updateTankGroup,
    deleteTankGroup,
    reorderTankGroups,

    // Tank assignment
    assignTankToGroup,
    removeTankFromGroup,
    reorderTanksInGroup,

    // Templates
    templates: VESSEL_TEMPLATES,
    createVesselFromTemplate,

    // Import/Export
    exportConfiguration,
    importConfiguration,

    // Loading state
    isLoading,
  };
};
