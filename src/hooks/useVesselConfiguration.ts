import { useState, useEffect, useCallback } from 'react';
import { VesselConfiguration, TankGroup, VESSEL_TEMPLATES, VesselTemplate } from '../types/vessel';
import { Tank } from '../types/tank';

const VESSEL_CONFIG_KEY = 'vessel-configuration';
const ACTIVE_VESSEL_KEY = 'active-vessel-id';

interface UseVesselConfigurationReturn {
  // Current vessel
  currentVessel: VesselConfiguration | null;
  
  // All vessels
  vessels: VesselConfiguration[];
  
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
}

export const useVesselConfiguration = (): UseVesselConfigurationReturn => {
  const [vessels, setVessels] = useState<VesselConfiguration[]>([]);
  const [activeVesselId, setActiveVesselId] = useState<string | null>(null);

  // Load vessels from localStorage on mount
  useEffect(() => {
    try {
      const savedVessels = localStorage.getItem(VESSEL_CONFIG_KEY);
      const savedActiveId = localStorage.getItem(ACTIVE_VESSEL_KEY);
      
      if (savedVessels) {
        const parsedVessels = JSON.parse(savedVessels);
        setVessels(parsedVessels);
      }
      
      if (savedActiveId) {
        setActiveVesselId(savedActiveId);
      }
    } catch (error) {
      console.error('Failed to load vessel configuration:', error);
    }
  }, []);

  // Save vessels to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(VESSEL_CONFIG_KEY, JSON.stringify(vessels));
    } catch (error) {
      console.error('Failed to save vessel configuration:', error);
    }
  }, [vessels]);

  // Save active vessel ID
  useEffect(() => {
    if (activeVesselId) {
      localStorage.setItem(ACTIVE_VESSEL_KEY, activeVesselId);
    }
  }, [activeVesselId]);

  const currentVessel = vessels.find(v => v.id === activeVesselId) || null;

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

    setVessels(prev => [...prev, newVessel]);
    setActiveVesselId(id);
    return id;
  }, []);

  const updateVessel = useCallback((id: string, updates: Partial<VesselConfiguration>) => {
    setVessels(prev => prev.map(vessel => 
      vessel.id === id 
        ? { 
            ...vessel, 
            ...updates, 
            metadata: { 
              ...vessel.metadata, 
              lastModified: new Date().toISOString() 
            } 
          }
        : vessel
    ));
  }, []);

  const deleteVessel = useCallback((id: string) => {
    setVessels(prev => prev.filter(v => v.id !== id));
    if (activeVesselId === id) {
      const remaining = vessels.filter(v => v.id !== id);
      setActiveVesselId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [activeVesselId, vessels]);

  const setActiveVessel = useCallback((id: string) => {
    setActiveVesselId(id);
  }, []);

  const addTankGroup = useCallback((vesselId: string, group: Omit<TankGroup, 'id'>) => {
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newGroup: TankGroup = { ...group, id: groupId };

    updateVessel(vesselId, {
      tankGroups: [...(currentVessel?.tankGroups || []), newGroup]
    });
  }, [currentVessel, updateVessel]);

  const updateTankGroup = useCallback((vesselId: string, groupId: string, updates: Partial<TankGroup>) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (!vessel) return;

    const updatedGroups = vessel.tankGroups.map(group =>
      group.id === groupId ? { ...group, ...updates } : group
    );

    updateVessel(vesselId, { tankGroups: updatedGroups });
  }, [vessels, updateVessel]);

  const deleteTankGroup = useCallback((vesselId: string, groupId: string) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (!vessel) return;

    const updatedGroups = vessel.tankGroups.filter(group => group.id !== groupId);
    updateVessel(vesselId, { tankGroups: updatedGroups });
  }, [vessels, updateVessel]);

  const reorderTankGroups = useCallback((vesselId: string, groupIds: string[]) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (!vessel) return;

    const reorderedGroups = groupIds.map(id => 
      vessel.tankGroups.find(group => group.id === id)!
    ).filter(Boolean);

    updateVessel(vesselId, { tankGroups: reorderedGroups });
  }, [vessels, updateVessel]);

  const assignTankToGroup = useCallback((vesselId: string, tankId: string, groupId: string) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (!vessel) return;

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
  }, [vessels, updateVessel]);

  const removeTankFromGroup = useCallback((vesselId: string, tankId: string) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (!vessel) return;

    const updatedGroups = vessel.tankGroups.map(group => ({
      ...group,
      tanks: group.tanks.filter(id => id !== tankId)
    }));

    updateVessel(vesselId, { tankGroups: updatedGroups });
  }, [vessels, updateVessel]);

  const reorderTanksInGroup = useCallback((vesselId: string, groupId: string, tankIds: string[]) => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (!vessel) return;

    const updatedGroups = vessel.tankGroups.map(group =>
      group.id === groupId ? { ...group, tanks: tankIds } : group
    );

    updateVessel(vesselId, { tankGroups: updatedGroups });
  }, [vessels, updateVessel]);

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
    const vessel = vessels.find(v => v.id === vesselId);
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
  }, [vessels]);

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

      setVessels(prev => [...prev, importedVessel]);
      setActiveVesselId(newId);
      return true;
    } catch (error) {
      console.error('Failed to import vessel configuration:', error);
      return false;
    }
  }, []);

  const getTanksByGroup = useCallback((vesselId: string, tanks: Tank[]): Record<string, Tank[]> => {
    const vessel = vessels.find(v => v.id === vesselId);
    if (!vessel) return {};

    const result: Record<string, Tank[]> = {};
    
    vessel.tankGroups.forEach(group => {
      result[group.id] = group.tanks
        .map(tankId => tanks.find(tank => tank.id.toString() === tankId))
        .filter(Boolean) as Tank[];
    });

    return result;
  }, [vessels]);

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

  return {
    currentVessel,
    vessels,
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
    getGroupedTanks
  };
};
