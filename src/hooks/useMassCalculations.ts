import { useState, useCallback, useMemo } from 'react';
import { Tank } from '../types/tank';
import { MassCalculationResult, TankGroup, ProductType, VolumeCalculationResult } from '../types/tankTable';
import { calculateMassFromVolume, calculateTotalMass, calculateMassDistribution, validateMassCalculation } from '../utils/massCalculator';
import { useTankTables } from './useTankTables';

interface MassCalculationData {
  tankId: number;
  massResult: MassCalculationResult;
  volumeResult: VolumeCalculationResult;
  tankGroup?: TankGroup;
  productType?: ProductType;
  lastCalculated: Date;
  validation: {
    valid: boolean;
    warnings: string[];
    recommendations: string[];
  };
}

interface UseMassCalculationsReturn {
  // Calculation data
  massCalculations: Map<number, MassCalculationData>;
  
  // Loading state
  isCalculating: boolean;
  
  // Operations
  calculateMass: (tank: Tank, volumeResult: VolumeCalculationResult) => MassCalculationResult | null;
  getTankGroup: (tank: Tank) => TankGroup | null;
  getProductType: (tank: Tank) => ProductType | null;
  
  // Batch operations
  calculateAllMasses: (tanks: Tank[], volumeCalculations: Map<number, VolumeCalculationResult>) => void;
  
  // Statistics
  getTotalMass: (tanks: Tank[]) => {
    totalMass: number;
    averageDensity: number;
    temperatureCorrectedCount: number;
    astmCorrectedCount: number;
  };
  getMassDistribution: (tanks: Tank[]) => Array<{
    groupId: string;
    totalMass: number;
    tankCount: number;
    averageMassPerTank: number;
    percentage: number;
  }>;
  
  // Validation
  validateAllCalculations: () => { valid: boolean; totalWarnings: number; totalRecommendations: number };
}

export function useMassCalculations(): UseMassCalculationsReturn {
  const { tankGroups, productTypes } = useTankTables();
  const [massCalculations, setMassCalculations] = useState<Map<number, MassCalculationData>>(new Map());
  const [isCalculating, setIsCalculating] = useState(false);

  // Create lookup maps for performance
  const tankGroupMap = useMemo(() => {
    const map = new Map<string, TankGroup>();
    tankGroups.forEach(group => {
      map.set(group.id, group);
    });
    return map;
  }, [tankGroups]);

  const productTypeMap = useMemo(() => {
    const map = new Map<string, ProductType>();
    productTypes.forEach(type => {
      map.set(type.id, type);
    });
    return map;
  }, [productTypes]);

  // Get tank group for a tank
  const getTankGroup = useCallback((tank: Tank): TankGroup | null => {
    if (tank.groupId) {
      return tankGroupMap.get(tank.groupId) || null;
    }
    
    // Try to find group that contains this tank
    const matchingGroup = tankGroups.find(group => 
      group.tanks.includes(tank.id.toString())
    );
    
    return matchingGroup || null;
  }, [tankGroupMap, tankGroups]);

  // Get product type for a tank
  const getProductType = useCallback((tank: Tank): ProductType | null => {
    if (tank.productTypeId) {
      return productTypeMap.get(tank.productTypeId) || null;
    }
    
    // Default to first product type if none specified
    return productTypes.length > 0 ? productTypes[0] : null;
  }, [productTypeMap, productTypes]);

  // Calculate mass for a single tank
  const calculateMass = useCallback((tank: Tank, volumeResult: VolumeCalculationResult): MassCalculationResult | null => {
    const tankGroup = getTankGroup(tank);
    if (!tankGroup) {
      console.warn(`No tank group found for tank ${tank.id}`);
      return null;
    }

    const productType = getProductType(tank);
    const temperature = tank.temperature;

    return calculateMassFromVolume(volumeResult, tankGroup.density, temperature, productType);
  }, [getTankGroup, getProductType]);

  // Calculate masses for all tanks
  const calculateAllMasses = useCallback((
    tanks: Tank[], 
    volumeCalculations: Map<number, VolumeCalculationResult>
  ) => {
    setIsCalculating(true);
    
    try {
      const newCalculations = new Map<number, MassCalculationData>();
      
      tanks.forEach(tank => {
        const volumeResult = volumeCalculations.get(tank.id);
        if (volumeResult) {
          const massResult = calculateMass(tank, volumeResult);
          if (massResult) {
            const tankGroup = getTankGroup(tank);
            const productType = getProductType(tank);
            
            // Validate the calculation
            const validation = validateMassCalculation(massResult, volumeResult);
            
            newCalculations.set(tank.id, {
              tankId: tank.id,
              massResult,
              volumeResult,
              tankGroup: tankGroup || undefined,
              productType: productType || undefined,
              lastCalculated: new Date(),
              validation
            });
          }
        }
      });
      
      setMassCalculations(newCalculations);
    } catch (error) {
      console.error('Failed to calculate masses:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [calculateMass, getTankGroup, getProductType]);

  // Get total mass statistics
  const getTotalMass = useCallback((tanks: Tank[]) => {
    const tankMasses: MassCalculationResult[] = [];
    
    tanks.forEach(tank => {
      const calculation = massCalculations.get(tank.id);
      if (calculation) {
        tankMasses.push(calculation.massResult);
      }
    });
    
    return calculateTotalMass(tankMasses);
  }, [massCalculations]);

  // Get mass distribution by tank groups
  const getMassDistribution = useCallback((tanks: Tank[]) => {
    const tankMassData: Array<{ tankId: string; groupId: string; mass: MassCalculationResult }> = [];
    
    tanks.forEach(tank => {
      const calculation = massCalculations.get(tank.id);
      const tankGroup = getTankGroup(tank);
      
      if (calculation && tankGroup) {
        tankMassData.push({
          tankId: tank.id.toString(),
          groupId: tankGroup.id,
          mass: calculation.massResult
        });
      }
    });
    
    return calculateMassDistribution(tankMassData);
  }, [massCalculations, getTankGroup]);

  // Validate all calculations
  const validateAllCalculations = useCallback(() => {
    let totalWarnings = 0;
    let totalRecommendations = 0;
    let allValid = true;
    
    massCalculations.forEach(calculation => {
      if (!calculation.validation.valid) {
        allValid = false;
      }
      totalWarnings += calculation.validation.warnings.length;
      totalRecommendations += calculation.validation.recommendations.length;
    });
    
    return {
      valid: allValid,
      totalWarnings,
      totalRecommendations
    };
  }, [massCalculations]);

  return {
    // Calculation data
    massCalculations,
    
    // Loading state
    isCalculating,
    
    // Operations
    calculateMass,
    getTankGroup,
    getProductType,
    
    // Batch operations
    calculateAllMasses,
    
    // Statistics
    getTotalMass,
    getMassDistribution,
    
    // Validation
    validateAllCalculations
  };
}
