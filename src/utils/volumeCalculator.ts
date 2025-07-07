import { TankTable, VolumeCalculationResult, VolumeEntry } from '../types/tankTable';

/**
 * Calculate volume from height using tank table with interpolation
 */
export function calculateVolumeFromHeight(
  height: number,
  tankTable: TankTable
): VolumeCalculationResult {
  const { volumeEntries } = tankTable;
  
  if (!volumeEntries || volumeEntries.length === 0) {
    return {
      volume: 0,
      volumeLiters: 0,
      interpolated: false,
      accuracy: 'extrapolated'
    };
  }

  // Sort entries by height to ensure proper interpolation
  const sortedEntries = [...volumeEntries].sort((a, b) => a.height - b.height);
  
  // Check for exact match
  const exactMatch = sortedEntries.find(entry => Math.abs(entry.height - height) < 0.1);
  if (exactMatch) {
    return {
      volume: exactMatch.volume / 1000, // Convert liters to m³
      volumeLiters: exactMatch.volume,
      interpolated: false,
      accuracy: 'exact'
    };
  }

  // Handle edge cases
  if (height <= sortedEntries[0].height) {
    // Below minimum height - extrapolate or use minimum
    const minEntry = sortedEntries[0];
    if (height < 0) {
      return {
        volume: 0,
        volumeLiters: 0,
        interpolated: false,
        accuracy: 'extrapolated'
      };
    }
    
    // Linear extrapolation below minimum
    if (sortedEntries.length > 1) {
      const entry1 = sortedEntries[0];
      const entry2 = sortedEntries[1];
      const slope = (entry2.volume - entry1.volume) / (entry2.height - entry1.height);
      const extrapolatedVolume = Math.max(0, entry1.volume + slope * (height - entry1.height));
      
      return {
        volume: extrapolatedVolume / 1000,
        volumeLiters: extrapolatedVolume,
        interpolated: true,
        accuracy: 'extrapolated'
      };
    }
    
    return {
      volume: minEntry.volume / 1000,
      volumeLiters: minEntry.volume,
      interpolated: false,
      accuracy: 'extrapolated'
    };
  }

  if (height >= sortedEntries[sortedEntries.length - 1].height) {
    // Above maximum height - extrapolate or use maximum
    const maxEntry = sortedEntries[sortedEntries.length - 1];
    
    // Linear extrapolation above maximum
    if (sortedEntries.length > 1) {
      const entry1 = sortedEntries[sortedEntries.length - 2];
      const entry2 = sortedEntries[sortedEntries.length - 1];
      const slope = (entry2.volume - entry1.volume) / (entry2.height - entry1.height);
      const extrapolatedVolume = entry2.volume + slope * (height - entry2.height);
      
      return {
        volume: extrapolatedVolume / 1000,
        volumeLiters: extrapolatedVolume,
        interpolated: true,
        accuracy: 'extrapolated'
      };
    }
    
    return {
      volume: maxEntry.volume / 1000,
      volumeLiters: maxEntry.volume,
      interpolated: false,
      accuracy: 'extrapolated'
    };
  }

  // Find surrounding entries for interpolation
  for (let i = 0; i < sortedEntries.length - 1; i++) {
    const lowerEntry = sortedEntries[i];
    const upperEntry = sortedEntries[i + 1];
    
    if (height >= lowerEntry.height && height <= upperEntry.height) {
      // Linear interpolation
      const heightDiff = upperEntry.height - lowerEntry.height;
      const volumeDiff = upperEntry.volume - lowerEntry.volume;
      const ratio = (height - lowerEntry.height) / heightDiff;
      const interpolatedVolume = lowerEntry.volume + ratio * volumeDiff;
      
      return {
        volume: interpolatedVolume / 1000,
        volumeLiters: interpolatedVolume,
        interpolated: true,
        accuracy: 'interpolated'
      };
    }
  }

  // Fallback (should not reach here)
  return {
    volume: 0,
    volumeLiters: 0,
    interpolated: false,
    accuracy: 'extrapolated'
  };
}

/**
 * Calculate height from volume using tank table with interpolation
 */
export function calculateHeightFromVolume(
  volumeLiters: number,
  tankTable: TankTable
): { height: number; interpolated: boolean; accuracy: 'exact' | 'interpolated' | 'extrapolated' } {
  const { volumeEntries } = tankTable;
  
  if (!volumeEntries || volumeEntries.length === 0) {
    return { height: 0, interpolated: false, accuracy: 'extrapolated' };
  }

  // Sort entries by volume
  const sortedEntries = [...volumeEntries].sort((a, b) => a.volume - b.volume);
  
  // Check for exact match
  const exactMatch = sortedEntries.find(entry => Math.abs(entry.volume - volumeLiters) < 0.1);
  if (exactMatch) {
    return { height: exactMatch.height, interpolated: false, accuracy: 'exact' };
  }

  // Handle edge cases
  if (volumeLiters <= sortedEntries[0].volume) {
    return { height: sortedEntries[0].height, interpolated: false, accuracy: 'extrapolated' };
  }

  if (volumeLiters >= sortedEntries[sortedEntries.length - 1].volume) {
    return { height: sortedEntries[sortedEntries.length - 1].height, interpolated: false, accuracy: 'extrapolated' };
  }

  // Find surrounding entries for interpolation
  for (let i = 0; i < sortedEntries.length - 1; i++) {
    const lowerEntry = sortedEntries[i];
    const upperEntry = sortedEntries[i + 1];
    
    if (volumeLiters >= lowerEntry.volume && volumeLiters <= upperEntry.volume) {
      // Linear interpolation
      const volumeDiff = upperEntry.volume - lowerEntry.volume;
      const heightDiff = upperEntry.height - lowerEntry.height;
      const ratio = (volumeLiters - lowerEntry.volume) / volumeDiff;
      const interpolatedHeight = lowerEntry.height + ratio * heightDiff;
      
      return { height: interpolatedHeight, interpolated: true, accuracy: 'interpolated' };
    }
  }

  return { height: 0, interpolated: false, accuracy: 'extrapolated' };
}

/**
 * Get volume capacity at different fill percentages
 */
export function getVolumeCapacities(
  tankTable: TankTable,
  percentages: number[] = [25, 50, 75, 85, 95, 100]
): Array<{ percentage: number; height: number; volume: number; volumeLiters: number }> {
  const maxHeight = tankTable.maxLevel;
  
  return percentages.map(percentage => {
    const height = (percentage / 100) * maxHeight;
    const volumeResult = calculateVolumeFromHeight(height, tankTable);
    
    return {
      percentage,
      height,
      volume: volumeResult.volume,
      volumeLiters: volumeResult.volumeLiters
    };
  });
}

/**
 * Calculate tank utilization statistics
 */
export function calculateTankUtilization(
  currentHeight: number,
  tankTable: TankTable
): {
  currentVolume: VolumeCalculationResult;
  fillPercentage: number;
  remainingCapacity: number; // m³
  remainingCapacityLiters: number;
  maxCapacity: number; // m³
  maxCapacityLiters: number;
} {
  const currentVolume = calculateVolumeFromHeight(currentHeight, tankTable);
  const maxVolume = calculateVolumeFromHeight(tankTable.maxLevel, tankTable);
  
  const fillPercentage = maxVolume.volume > 0 ? (currentVolume.volume / maxVolume.volume) * 100 : 0;
  const remainingCapacity = Math.max(0, maxVolume.volume - currentVolume.volume);
  const remainingCapacityLiters = Math.max(0, maxVolume.volumeLiters - currentVolume.volumeLiters);
  
  return {
    currentVolume,
    fillPercentage,
    remainingCapacity,
    remainingCapacityLiters,
    maxCapacity: maxVolume.volume,
    maxCapacityLiters: maxVolume.volumeLiters
  };
}

/**
 * Validate volume calculation accuracy
 */
export function validateVolumeCalculation(
  height: number,
  tankTable: TankTable
): { valid: boolean; warnings: string[]; recommendations: string[] } {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  const result = calculateVolumeFromHeight(height, tankTable);
  
  if (result.accuracy === 'extrapolated') {
    warnings.push('Volume calculation is extrapolated beyond tank table range');
    recommendations.push('Consider extending tank table data for better accuracy');
  }
  
  if (height > tankTable.maxLevel * 1.1) {
    warnings.push('Height significantly exceeds tank maximum level');
    recommendations.push('Verify sensor readings and tank table data');
  }
  
  if (height < 0) {
    warnings.push('Negative height detected');
    recommendations.push('Check sensor calibration');
  }
  
  // Check interpolation quality
  const { volumeEntries } = tankTable;
  if (volumeEntries.length < 10) {
    warnings.push('Tank table has limited data points, interpolation may be less accurate');
    recommendations.push('Consider adding more data points to tank table');
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
    recommendations
  };
}

/**
 * Create volume lookup cache for performance
 */
export function createVolumeLookupCache(
  tankTable: TankTable,
  stepSize: number = 1 // mm
): Map<number, VolumeCalculationResult> {
  const cache = new Map<number, VolumeCalculationResult>();
  
  for (let height = 0; height <= tankTable.maxLevel; height += stepSize) {
    const result = calculateVolumeFromHeight(height, tankTable);
    cache.set(height, result);
  }
  
  return cache;
}

/**
 * Get volume from cache with fallback to calculation
 */
export function getVolumeFromCache(
  height: number,
  cache: Map<number, VolumeCalculationResult>,
  tankTable: TankTable,
  stepSize: number = 1
): VolumeCalculationResult {
  // Round to nearest step
  const roundedHeight = Math.round(height / stepSize) * stepSize;
  
  const cachedResult = cache.get(roundedHeight);
  if (cachedResult) {
    return cachedResult;
  }
  
  // Fallback to direct calculation
  return calculateVolumeFromHeight(height, tankTable);
}
