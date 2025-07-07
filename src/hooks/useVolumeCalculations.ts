import { useState, useEffect, useCallback, useMemo } from 'react';
import { Tank } from '../types/tank';
import { TankTable, VolumeCalculationResult } from '../types/tankTable';
import { calculateVolumeFromHeight, calculateTankUtilization, createVolumeLookupCache, getVolumeFromCache } from '../utils/volumeCalculator';
import { getTankTableForDataSourceTank } from '../utils/tankMappingUtils';
import { useTankTables } from './useTankTables';
import { useTankMapping } from './useTankMapping';

interface VolumeCalculationData {
  tankId: number;
  volumeResult: VolumeCalculationResult;
  utilization: {
    currentVolume: VolumeCalculationResult;
    fillPercentage: number;
    remainingCapacity: number;
    remainingCapacityLiters: number;
    maxCapacity: number;
    maxCapacityLiters: number;
  };
  tankTable?: TankTable;
  lastCalculated: Date;
}

interface UseVolumeCalculationsReturn {
  // Calculation data
  volumeCalculations: Map<number, VolumeCalculationData>;
  
  // Loading state
  isCalculating: boolean;
  
  // Operations
  calculateVolume: (tank: Tank) => VolumeCalculationResult | null;
  calculateUtilization: (tank: Tank) => VolumeCalculationData['utilization'] | null;
  getTankTable: (tank: Tank) => TankTable | null;
  
  // Batch operations
  calculateAllVolumes: (tanks: Tank[]) => void;
  
  // Cache management
  clearCache: () => void;
  preloadCache: (tankTable: TankTable) => void;
  
  // Statistics
  getTotalVolume: (tanks: Tank[]) => number;
  getAverageUtilization: (tanks: Tank[]) => number;
}

export function useVolumeCalculations(): UseVolumeCalculationsReturn {
  const { tankTables } = useTankTables();
  const { mappings } = useTankMapping();
  const [volumeCalculations, setVolumeCalculations] = useState<Map<number, VolumeCalculationData>>(new Map());
  const [isCalculating, setIsCalculating] = useState(false);
  const [volumeCaches, setVolumeCaches] = useState<Map<string, Map<number, VolumeCalculationResult>>>(new Map());

  // Create tank table lookup map
  const tankTableMap = useMemo(() => {
    const map = new Map<string, TankTable>();
    tankTables.forEach(table => {
      map.set(table.id, table);
    });
    return map;
  }, [tankTables]);

  // Preload volume caches for all tank tables
  useEffect(() => {
    const newCaches = new Map<string, Map<number, VolumeCalculationResult>>();
    
    tankTables.forEach(table => {
      const cache = createVolumeLookupCache(table, 1); // 1mm step size
      newCaches.set(table.id, cache);
    });
    
    setVolumeCaches(newCaches);
  }, [tankTables]);

  // Find tank table for a given tank using mapping configuration
  const getTankTable = useCallback((tank: Tank): TankTable | null => {
    // First, try to use the mapping configuration
    const tankTable = getTankTableForDataSourceTank(tank.id.toString(), mappings, tankTables);
    if (tankTable) {
      return tankTable;
    }

    // Fallback to direct tank table ID if available
    if (tank.tankTableId) {
      return tankTableMap.get(tank.tankTableId) || null;
    }

    // Last resort: try to find by tank name or ID (legacy behavior)
    const matchingTable = tankTables.find(table =>
      table.tankId === tank.id.toString() ||
      table.tankName === tank.name
    );

    return matchingTable || null;
  }, [mappings, tankTables, tankTableMap]);

  // Calculate volume for a single tank
  const calculateVolume = useCallback((tank: Tank): VolumeCalculationResult | null => {
    const tankTable = getTankTable(tank);
    if (!tankTable) {
      return null;
    }

    // Use cache if available
    const cache = volumeCaches.get(tankTable.id);
    if (cache) {
      return getVolumeFromCache(tank.currentLevel, cache, tankTable);
    }

    // Fallback to direct calculation
    return calculateVolumeFromHeight(tank.currentLevel, tankTable);
  }, [getTankTable, volumeCaches]);

  // Calculate utilization for a single tank
  const calculateUtilization = useCallback((tank: Tank): VolumeCalculationData['utilization'] | null => {
    const tankTable = getTankTable(tank);
    if (!tankTable) {
      return null;
    }

    return calculateTankUtilization(tank.currentLevel, tankTable);
  }, [getTankTable]);

  // Calculate volumes for all tanks
  const calculateAllVolumes = useCallback((tanks: Tank[]) => {
    setIsCalculating(true);
    
    try {
      const newCalculations = new Map<number, VolumeCalculationData>();
      
      tanks.forEach(tank => {
        const tankTable = getTankTable(tank);
        if (tankTable) {
          const volumeResult = calculateVolume(tank);
          const utilization = calculateUtilization(tank);
          
          if (volumeResult && utilization) {
            newCalculations.set(tank.id, {
              tankId: tank.id,
              volumeResult,
              utilization,
              tankTable,
              lastCalculated: new Date()
            });
          }
        }
      });
      
      setVolumeCalculations(newCalculations);
    } catch (error) {
      console.error('Failed to calculate volumes:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [getTankTable, calculateVolume, calculateUtilization]);

  // Clear calculation cache
  const clearCache = useCallback(() => {
    setVolumeCalculations(new Map());
    setVolumeCaches(new Map());
  }, []);

  // Preload cache for a specific tank table
  const preloadCache = useCallback((tankTable: TankTable) => {
    const cache = createVolumeLookupCache(tankTable, 1);
    setVolumeCaches(prev => new Map(prev).set(tankTable.id, cache));
  }, []);

  // Get total volume across tanks
  const getTotalVolume = useCallback((tanks: Tank[]): number => {
    let total = 0;
    
    tanks.forEach(tank => {
      const calculation = volumeCalculations.get(tank.id);
      if (calculation) {
        total += calculation.volumeResult.volume;
      }
    });
    
    return total;
  }, [volumeCalculations]);

  // Get average utilization across tanks
  const getAverageUtilization = useCallback((tanks: Tank[]): number => {
    const utilizationValues: number[] = [];
    
    tanks.forEach(tank => {
      const calculation = volumeCalculations.get(tank.id);
      if (calculation) {
        utilizationValues.push(calculation.utilization.fillPercentage);
      }
    });
    
    if (utilizationValues.length === 0) return 0;
    
    return utilizationValues.reduce((sum, value) => sum + value, 0) / utilizationValues.length;
  }, [volumeCalculations]);

  return {
    // Calculation data
    volumeCalculations,
    
    // Loading state
    isCalculating,
    
    // Operations
    calculateVolume,
    calculateUtilization,
    getTankTable,
    
    // Batch operations
    calculateAllVolumes,
    
    // Cache management
    clearCache,
    preloadCache,
    
    // Statistics
    getTotalVolume,
    getAverageUtilization
  };
}
