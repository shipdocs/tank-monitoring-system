import { MassCalculationResult, VolumeCalculationResult, ProductType, TankGroup } from '../types/tankTable';

/**
 * Calculate mass from volume and density with optional temperature correction
 */
export async function calculateMassFromVolume(
  volumeResult: VolumeCalculationResult,
  baseDensity: number,
  temperature?: number,
  productType?: ProductType
): Promise<MassCalculationResult> {
  let actualDensity = baseDensity;
  let temperatureCorrected = false;
  let astmCorrectionApplied = false;

  // Apply temperature correction if temperature is available and product supports it
  if (temperature !== undefined && productType?.temperatureCorrection && productType.astmTable) {
    try {
      const { calculateCorrectedDensity } = await import('./astm54b');
      const correctionResult = calculateCorrectedDensity(baseDensity, temperature, productType.astmTable);

      if (correctionResult.applied) {
        actualDensity = correctionResult.correctedDensity;
        temperatureCorrected = true;
        astmCorrectionApplied = true;
      }
    } catch (error) {
      console.error('Failed to load ASTM correction functions:', error);
    }
  }

  // Calculate mass in metric tons (volume in m³ * density in kg/m³ / 1000)
  // volumeResult.volume is in m³, actualDensity is in kg/m³
  // Result: kg, then convert to metric tons by dividing by 1000
  const mass = (volumeResult.volume * actualDensity) / 1000;

  return {
    mass,
    density: actualDensity,
    temperatureCorrected,
    astmCorrectionApplied
  };
}

/**
 * Calculate mass for a tank using tank group density
 */
export async function calculateTankMass(
  volumeResult: VolumeCalculationResult,
  tankGroup: TankGroup,
  temperature?: number,
  productType?: ProductType
): Promise<MassCalculationResult> {
  return calculateMassFromVolume(volumeResult, tankGroup.density, temperature, productType);
}

/**
 * Calculate total mass for multiple tanks
 */
export function calculateTotalMass(
  tankMasses: MassCalculationResult[]
): {
  totalMass: number;
  averageDensity: number;
  temperatureCorrectedCount: number;
  astmCorrectedCount: number;
} {
  if (tankMasses.length === 0) {
    return {
      totalMass: 0,
      averageDensity: 0,
      temperatureCorrectedCount: 0,
      astmCorrectedCount: 0
    };
  }
  
  const totalMass = tankMasses.reduce((sum, result) => sum + result.mass, 0);
  const averageDensity = tankMasses.reduce((sum, result) => sum + result.density, 0) / tankMasses.length;
  const temperatureCorrectedCount = tankMasses.filter(result => result.temperatureCorrected).length;
  const astmCorrectedCount = tankMasses.filter(result => result.astmCorrectionApplied).length;
  
  return {
    totalMass,
    averageDensity,
    temperatureCorrectedCount,
    astmCorrectedCount
  };
}

/**
 * Calculate mass flow rate from volume flow rate
 */
export function calculateMassFlowRate(
  volumeFlowRate: number, // m³/hour
  density: number // kg/m³
): number {
  // Convert to tons/hour
  return (volumeFlowRate * density) / 1000;
}

/**
 * Calculate density from mass and volume
 */
export function calculateDensityFromMassVolume(
  mass: number, // metric tons
  volume: number // m³
): number {
  if (volume <= 0) {
    console.warn('Cannot calculate density: volume must be greater than 0');
    return 0;
  }

  // Convert mass from tons to kg and calculate density
  return (mass * 1000) / volume;
}

/**
 * Estimate completion mass based on current mass and flow rate
 */
export function estimateCompletionMass(
  currentMass: number,
  massFlowRate: number,
  targetMass: number,
  isLoading: boolean
): {
  estimatedFinalMass: number;
  remainingMass: number;
  estimatedTimeHours: number;
  estimatedCompletion: Date;
} {
  if (massFlowRate === 0) {
    return {
      estimatedFinalMass: currentMass,
      remainingMass: isLoading ? targetMass - currentMass : currentMass,
      estimatedTimeHours: Infinity,
      estimatedCompletion: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    };
  }
  
  const remainingMass = isLoading ? targetMass - currentMass : currentMass;
  const estimatedTimeHours = Math.abs(remainingMass / massFlowRate);
  const estimatedCompletion = new Date(Date.now() + estimatedTimeHours * 60 * 60 * 1000);
  
  return {
    estimatedFinalMass: isLoading ? targetMass : 0,
    remainingMass: Math.abs(remainingMass),
    estimatedTimeHours,
    estimatedCompletion
  };
}

/**
 * Calculate mass distribution across tank groups
 */
export function calculateMassDistribution(
  tankMasses: Array<{ tankId: string; groupId: string; mass: MassCalculationResult }>
): Array<{
  groupId: string;
  totalMass: number;
  tankCount: number;
  averageMassPerTank: number;
  percentage: number;
}> {
  const totalMass = tankMasses.reduce((sum, tank) => sum + tank.mass.mass, 0);
  
  // Group by groupId
  const groupMap = new Map<string, { masses: number[]; tankCount: number }>();
  
  tankMasses.forEach(tank => {
    if (!groupMap.has(tank.groupId)) {
      groupMap.set(tank.groupId, { masses: [], tankCount: 0 });
    }
    
    const group = groupMap.get(tank.groupId)!;
    group.masses.push(tank.mass.mass);
    group.tankCount++;
  });
  
  // Calculate distribution
  return Array.from(groupMap.entries()).map(([groupId, data]) => {
    const groupTotalMass = data.masses.reduce((sum, mass) => sum + mass, 0);
    const averageMassPerTank = groupTotalMass / data.tankCount;
    const percentage = totalMass > 0 ? (groupTotalMass / totalMass) * 100 : 0;
    
    return {
      groupId,
      totalMass: groupTotalMass,
      tankCount: data.tankCount,
      averageMassPerTank,
      percentage
    };
  });
}

/**
 * Validate mass calculation
 */
export function validateMassCalculation(
  massResult: MassCalculationResult,
  volumeResult: VolumeCalculationResult,
  expectedDensityRange?: { min: number; max: number }
): {
  valid: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Check for reasonable density values
  if (massResult.density < 500) {
    warnings.push('Density seems unusually low (<500 kg/m³)');
    recommendations.push('Verify product type and density settings');
  }
  
  if (massResult.density > 2000) {
    warnings.push('Density seems unusually high (>2000 kg/m³)');
    recommendations.push('Verify product type and density settings');
  }
  
  // Check expected density range if provided
  if (expectedDensityRange) {
    if (massResult.density < expectedDensityRange.min || massResult.density > expectedDensityRange.max) {
      warnings.push(`Density ${massResult.density.toFixed(1)} kg/m³ is outside expected range (${expectedDensityRange.min}-${expectedDensityRange.max} kg/m³)`);
      recommendations.push('Check temperature correction and product type settings');
    }
  }
  
  // Check if temperature correction should be applied but wasn't
  if (!massResult.temperatureCorrected && massResult.density > 600 && massResult.density < 1200) {
    recommendations.push('Consider enabling temperature correction for petroleum products');
  }
  
  // Check volume accuracy impact on mass
  if (volumeResult.accuracy === 'extrapolated') {
    warnings.push('Mass calculation based on extrapolated volume data');
    recommendations.push('Improve tank table data coverage for better mass accuracy');
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
    recommendations
  };
}

/**
 * Calculate mass uncertainty based on volume and density uncertainties
 */
export function calculateMassUncertainty(
  volumeResult: VolumeCalculationResult,
  densityUncertainty: number = 0.01 // 1% default uncertainty
): {
  massUncertainty: number;
  uncertaintyPercentage: number;
  confidenceLevel: 'high' | 'medium' | 'low';
} {
  let volumeUncertainty = 0.005; // 0.5% default for exact measurements
  
  switch (volumeResult.accuracy) {
    case 'exact':
      volumeUncertainty = 0.005;
      break;
    case 'interpolated':
      volumeUncertainty = 0.01;
      break;
    case 'extrapolated':
      volumeUncertainty = 0.05;
      break;
  }
  
  // Combined uncertainty (assuming independent uncertainties)
  const combinedUncertainty = Math.sqrt(volumeUncertainty ** 2 + densityUncertainty ** 2);
  const uncertaintyPercentage = combinedUncertainty * 100;
  
  let confidenceLevel: 'high' | 'medium' | 'low';
  if (uncertaintyPercentage < 2) {
    confidenceLevel = 'high';
  } else if (uncertaintyPercentage < 5) {
    confidenceLevel = 'medium';
  } else {
    confidenceLevel = 'low';
  }
  
  return {
    massUncertainty: combinedUncertainty,
    uncertaintyPercentage,
    confidenceLevel
  };
}
