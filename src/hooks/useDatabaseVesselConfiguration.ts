import { useState, useEffect, useCallback } from 'react';
import { VesselConfiguration, TankGroup, VESSEL_TEMPLATES, VesselTemplate } from '../types/vessel';
import { Tank } from '../types/tank';
import { TankStorage } from '../storage/TankStorage';

const storage = TankStorage.getInstance();

interface UseDatabaseVesselConfigurationReturn {
  // Current vessel
  currentVessel: VesselConfiguration | null;
  
  // All vessels
  vessels: VesselConfiguration[];
  
  // Loading state
  isLoading: boolean;
  
  // Vessel management
  createVessel: (config: Omit<VesselConfiguration, 'id' | 'metadata'>) => string;
  updateVessel: (id: string, updates: Partial<VesselConfiguration>) => void;
  deleteVessel: (id: string) => void;
  setActiveVessel: (id: string) => void;
  
  // Tank group management
  addTankGroup: (vesselId: string, group: Omit<TankGroup, 'id'>) => void;
  updateTankGroup: (vesselId: string, groupId: string, updates: Partial<TankGroup>) => void;
  deleteTankGroup: (vesselId: string, groupId: string) => void;
  reorderTankGroups: (vesselId: string, groupIds: string[]) => void;
  
  // Tank assignment
  assignTankToGroup: (vesselId: string, tankId: string, groupId: string) => void;
  removeTankFromGroup: (vesselId: string, tankId: string) => void;
  reorderTanksInGroup: (vesselId: string, groupId: string, tankIds: string[]) => void;
  
  // Templates
  templates: VesselTemplate[];
  createVesselFromTemplate: (templateId: string, vesselName: string) => string;
  
  // Import/Export
  exportVesselConfig: (vesselId: string) => void;
  importVesselConfig: (file: File) => Promise<boolean>;
  
  // Utilities
  getTanksByGroup: (vesselId: string, tanks: Tank[]) => Record<string, Tank[]>;
  getGroupedTanks: (tanks: Tank[]) => Tank[];
  
  // Migration
  migrateFromLocalStorage: () => void;
}

export const useDatabaseVesselConfiguration = (): UseDatabaseVesselConfigurationReturn => {
  const [vessels, setVessels] = useState<VesselConfiguration[]>([]);
  const [currentVessel, setCurrentVessel] = useState<VesselConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from database on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load all vessels
      const allVessels = storage.getVessels();
      setVessels(allVessels);

      // Load active vessel
      const appConfig = storage.getAppConfiguration();
      if (appConfig.activeVesselId) {
        const activeVessel = storage.getVessel(appConfig.activeVesselId);
        setCurrentVessel(activeVessel);
      } else if (allVessels.length > 0) {
        // Set first vessel as active if none is set
        setCurrentVessel(allVessels[0]);
        storage.setActiveVessel(allVessels[0].id);
      }
    } catch (error) {
      console.error('Failed to load vessel data from database:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createVessel = useCallback((config: Omit<VesselConfiguration, 'id' | 'metadata'>) => {
    const id = `vessel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newVessel: VesselConfiguration = {
      ...config,
      id,
      metadata: {
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      }
    };

    try {
      storage.saveVessel(newVessel);
      setVessels(prev => [newVessel, ...prev]);
      setCurrentVessel(newVessel);
      storage.setActiveVessel(id);
      return id;
    } catch (error) {
      console.error('Failed to create vessel:', error);
      throw error;
    }
  }, []);

  const updateVessel = useCallback((id: string, updates: Partial<VesselConfiguration>) => {
    try {
      const existingVessel = storage.getVessel(id);
      if (!existingVessel) {
        throw new Error('Vessel not found');
      }

      const updatedVessel: VesselConfiguration = {
        ...existingVessel,
        ...updates,
        metadata: {
          ...existingVessel.metadata,
          lastModified: new Date().toISOString()
        }
      };

      storage.saveVessel(updatedVessel);
      
      setVessels(prev => prev.map(vessel => 
        vessel.id === id ? updatedVessel : vessel
      ));
      
      if (currentVessel?.id === id) {
        setCurrentVessel(updatedVessel);
      }
    } catch (error) {
      console.error('Failed to update vessel:', error);
      throw error;
    }
  }, [currentVessel]);

  const deleteVessel = useCallback((id: string) => {
    try {
      storage.deleteVessel(id);
      setVessels(prev => prev.filter(v => v.id !== id));

      if (currentVessel?.id === id) {
        const remaining = vessels.filter(v => v.id !== id);
        if (remaining.length > 0) {
          setCurrentVessel(remaining[0]);
          storage.setActiveVessel(remaining[0].id);
        } else {
          setCurrentVessel(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete vessel:', error);
      throw error;
    }
  }, [currentVessel, vessels]);

  const setActiveVessel = useCallback((id: string) => {
    try {
      const vessel = storage.getVessel(id);
      if (vessel) {
        setCurrentVessel(vessel);
        storage.setActiveVessel(id);
      }
    } catch (error) {
      console.error('Failed to set active vessel:', error);
      throw error;
    }
  }, []);

  const addTankGroup = useCallback((vesselId: string, group: Omit<TankGroup, 'id'>) => {
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newGroup: TankGroup = { ...group, id: groupId };

    const vessel = storage.getVessel(vesselId);
    if (vessel) {
      const updatedVessel = {
        ...vessel,
        tankGroups: [...vessel.tankGroups, newGroup]
      };
      updateVessel(vesselId, updatedVessel);
    }
  }, [updateVessel]);

  const updateTankGroup = useCallback((vesselId: string, groupId: string, updates: Partial<TankGroup>) => {
    const vessel = storage.getVessel(vesselId);
    if (vessel) {
      const updatedGroups = vessel.tankGroups.map(group =>
        group.id === groupId ? { ...group, ...updates } : group
      );
      updateVessel(vesselId, { tankGroups: updatedGroups });
    }
  }, [updateVessel]);

  const deleteTankGroup = useCallback((vesselId: string, groupId: string) => {
    const vessel = storage.getVessel(vesselId);
    if (vessel) {
      const updatedGroups = vessel.tankGroups.filter(group => group.id !== groupId);
      updateVessel(vesselId, { tankGroups: updatedGroups });
    }
  }, [updateVessel]);

  const reorderTankGroups = useCallback((vesselId: string, groupIds: string[]) => {
    const vessel = storage.getVessel(vesselId);
    if (vessel) {
      const reorderedGroups = groupIds.map(id =>
        vessel.tankGroups.find(group => group.id === id)!
      ).filter(Boolean);
      updateVessel(vesselId, { tankGroups: reorderedGroups });
    }
  }, [updateVessel]);

  const assignTankToGroup = useCallback((vesselId: string, tankId: string, groupId: string) => {
    const vessel = storage.getVessel(vesselId);
    if (vessel) {
      // Remove tank from any existing group
      const updatedGroups = vessel.tankGroups.map(group => ({
        ...group,
        tanks: group.tanks.filter(id => id !== tankId)
      }));

      // Add tank to new group
      const targetGroupIndex = updatedGroups.findIndex(group => group.id === groupId);
      if (targetGroupIndex !== -1) {
        updatedGroups[targetGroupIndex].tanks.push(tankId);
      }

      updateVessel(vesselId, { tankGroups: updatedGroups });
    }
  }, [updateVessel]);

  const removeTankFromGroup = useCallback((vesselId: string, tankId: string) => {
    const vessel = storage.getVessel(vesselId);
    if (vessel) {
      const updatedGroups = vessel.tankGroups.map(group => ({
        ...group,
        tanks: group.tanks.filter(id => id !== tankId)
      }));
      updateVessel(vesselId, { tankGroups: updatedGroups });
    }
  }, [updateVessel]);

  const reorderTanksInGroup = useCallback((vesselId: string, groupId: string, tankIds: string[]) => {
    const vessel = storage.getVessel(vesselId);
    if (vessel) {
      const updatedGroups = vessel.tankGroups.map(group =>
        group.id === groupId ? { ...group, tanks: tankIds } : group
      );
      updateVessel(vesselId, { tankGroups: updatedGroups });
    }
  }, [updateVessel]);

  const createVesselFromTemplate = useCallback((templateId: string, vesselName: string) => {
    const template = VESSEL_TEMPLATES.find(t => t.id === templateId);
    if (!template) throw new Error('Template not found');

    const tankGroups: TankGroup[] = template.defaultGroups.map((group, index) => ({
      ...group,
      id: `group-${Date.now()}-${index}`,
      tanks: []
    }));

    return createVessel({
      name: vesselName,
      type: template.vesselType,
      layout: {
        type: template.layoutType,
        sections: {}
      },
      tankGroups
    });
  }, [createVessel]);

  const exportVesselConfig = useCallback((vesselId: string) => {
    const vessel = storage.getVessel(vesselId);
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
  }, []);

  const importVesselConfig = useCallback(async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const config = JSON.parse(text) as VesselConfiguration;

      // Validate basic structure
      if (!config.id || !config.name || !config.type) {
        throw new Error('Invalid vessel configuration format');
      }

      // Generate new ID to avoid conflicts
      const newId = `vessel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const importedVessel = { ...config, id: newId };

      storage.saveVessel(importedVessel);
      setVessels(prev => [importedVessel, ...prev]);
      setCurrentVessel(importedVessel);
      storage.setActiveVessel(newId);
      return true;
    } catch (error) {
      console.error('Failed to import vessel configuration:', error);
      return false;
    }
  }, []);

  const getTanksByGroup = useCallback((vesselId: string, tanks: Tank[]): Record<string, Tank[]> => {
    const vessel = storage.getVessel(vesselId);
    if (!vessel) return {};

    const result: Record<string, Tank[]> = {};

    vessel.tankGroups.forEach(group => {
      result[group.id] = group.tanks
        .map(tankId => tanks.find(tank => tank.id.toString() === tankId))
        .filter(Boolean) as Tank[];
    });

    return result;
  }, []);

  const getGroupedTanks = useCallback((tanks: Tank[]): Tank[] => {
    if (!currentVessel) return tanks;

    const groupedTankIds = new Set(
      currentVessel.tankGroups.flatMap(group => group.tanks)
    );

    const groupedTanks: Tank[] = [];
    const ungroupedTanks: Tank[] = [];

    tanks.forEach(tank => {
      if (groupedTankIds.has(tank.id.toString())) {
        groupedTanks.push(tank);
      } else {
        ungroupedTanks.push(tank);
      }
    });

    // Return grouped tanks in group order, then ungrouped tanks
    const orderedGroupedTanks: Tank[] = [];
    currentVessel.tankGroups.forEach(group => {
      group.tanks.forEach(tankId => {
        const tank = tanks.find(t => t.id.toString() === tankId);
        if (tank) orderedGroupedTanks.push(tank);
      });
    });

    return [...orderedGroupedTanks, ...ungroupedTanks];
  }, [currentVessel]);

  const migrateFromLocalStorage = useCallback(() => {
    try {
      // Migrate vessel configurations
      const vesselData = localStorage.getItem('vessel-configuration');
      const tankConfigData = localStorage.getItem('tank-configuration');
      
      if (vesselData || tankConfigData) {
        const parsedVesselData = vesselData ? JSON.parse(vesselData) : null;
        const parsedTankConfigData = tankConfigData ? JSON.parse(tankConfigData) : null;
        
        storage.migrateFromLocalStorage(parsedVesselData, parsedTankConfigData);

        // Reload data after migration
        loadData();

        console.log('Successfully migrated data from localStorage to enhanced storage');
      }
    } catch (error) {
      console.error('Failed to migrate from localStorage:', error);
    }
  }, [loadData]);

  return {
    currentVessel,
    vessels,
    isLoading,
    createVessel,
    updateVessel,
    deleteVessel,
    setActiveVessel,
    addTankGroup,
    updateTankGroup,
    deleteTankGroup,
    reorderTankGroups,
    assignTankToGroup,
    removeTankFromGroup,
    reorderTanksInGroup,
    templates: VESSEL_TEMPLATES,
    createVesselFromTemplate,
    exportVesselConfig,
    importVesselConfig,
    getTanksByGroup,
    getGroupedTanks,
    migrateFromLocalStorage
  };
};
