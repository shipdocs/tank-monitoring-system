import { ETACalculation, FlowRateData, VolumeCalculationResult } from '../types/tankTable';
import { format, addHours } from 'date-fns';

/**
 * Calculate ETA for tank loading/unloading operations
 */
export function calculateETA(
  currentVolume: VolumeCalculationResult,
  targetVolume: number, // m³
  flowRateData: FlowRateData,
  maxCapacity: number, // m³
  currentMass?: number, // metric tons
  targetMass?: number // metric tons
): ETACalculation {
  const assumptions: string[] = [];
  let confidence = flowRateData.confidence;
  
  // Determine if we're loading or unloading
  const isLoading = flowRateData.trend === 'loading';
  const isUnloading = flowRateData.trend === 'unloading';
  
  if (flowRateData.trend === 'stable' || Math.abs(flowRateData.volumeFlowRate) < 0.01) {
    // No significant flow detected
    return {
      estimatedCompletion: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      remainingVolume: isLoading ? targetVolume - currentVolume.volume : currentVolume.volume,
      remainingMass: currentMass && targetMass ? 
        (isLoading ? targetMass - currentMass : currentMass) : 0,
      currentRate: flowRateData.volumeFlowRate,
      confidence: 0.1,
      assumptions: ['No significant flow rate detected', 'Operation may not be in progress']
    };
  }
  
  // Calculate remaining volume
  let remainingVolume: number;
  let remainingMass = 0;
  
  if (isLoading) {
    remainingVolume = Math.max(0, targetVolume - currentVolume.volume);
    if (currentMass !== undefined && targetMass !== undefined) {
      remainingMass = Math.max(0, targetMass - currentMass);
    }
    assumptions.push('Assuming loading operation continues at current rate');
  } else if (isUnloading) {
    remainingVolume = Math.max(0, currentVolume.volume);
    if (currentMass !== undefined) {
      remainingMass = Math.max(0, currentMass);
    }
    assumptions.push('Assuming unloading operation continues at current rate');
  } else {
    remainingVolume = 0;
    assumptions.push('Stable operation - no completion time applicable');
  }
  
  // Check for capacity constraints
  if (isLoading && targetVolume > maxCapacity) {
    remainingVolume = Math.max(0, maxCapacity - currentVolume.volume);
    assumptions.push(`Target volume limited by tank capacity (${maxCapacity.toFixed(1)} m³)`);
    confidence *= 0.8;
  }
  
  // Calculate time to completion
  const absoluteFlowRate = Math.abs(flowRateData.volumeFlowRate);
  let hoursToCompletion: number;
  
  if (absoluteFlowRate < 0.001) {
    hoursToCompletion = Infinity;
    confidence = 0.1;
    assumptions.push('Flow rate too low for reliable ETA calculation');
  } else {
    hoursToCompletion = remainingVolume / absoluteFlowRate;
    
    // Apply confidence adjustments
    if (flowRateData.smoothed) {
      assumptions.push('Flow rate has been smoothed for stability');
      confidence *= 1.1; // Slightly increase confidence for smoothed data
    }
    
    if (hoursToCompletion > 48) {
      assumptions.push('ETA is more than 48 hours - accuracy may be reduced');
      confidence *= 0.7;
    }
    
    if (hoursToCompletion < 0.5) {
      assumptions.push('ETA is less than 30 minutes - completion imminent');
      confidence *= 0.9;
    }
  }
  
  // Calculate estimated completion time
  const estimatedCompletion = hoursToCompletion === Infinity ? 
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : // 1 year from now
    addHours(new Date(), hoursToCompletion);
  
  // Ensure confidence is within bounds
  confidence = Math.max(0.1, Math.min(1.0, confidence));
  
  return {
    estimatedCompletion,
    remainingVolume,
    remainingMass,
    currentRate: flowRateData.volumeFlowRate,
    confidence,
    assumptions
  };
}

/**
 * Calculate ETA for multiple tanks
 */
export function calculateMultiTankETA(
  tankETAs: Array<{ tankId: string; eta: ETACalculation; isActive: boolean }>
): {
  overallETA: Date;
  totalRemainingVolume: number;
  totalRemainingMass: number;
  activeTanks: number;
  confidence: number;
  assumptions: string[];
} {
  const activeTankETAs = tankETAs.filter(tank => tank.isActive);
  
  if (activeTankETAs.length === 0) {
    return {
      overallETA: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      totalRemainingVolume: 0,
      totalRemainingMass: 0,
      activeTanks: 0,
      confidence: 0,
      assumptions: ['No active tank operations detected']
    };
  }
  
  // Calculate totals
  const totalRemainingVolume = activeTankETAs.reduce((sum, tank) => sum + tank.eta.remainingVolume, 0);
  const totalRemainingMass = activeTankETAs.reduce((sum, tank) => sum + tank.eta.remainingMass, 0);
  
  // Find the latest completion time (bottleneck)
  const latestCompletion = new Date(Math.max(...activeTankETAs.map(tank => tank.eta.estimatedCompletion.getTime())));
  
  // Calculate weighted average confidence
  const totalVolume = activeTankETAs.reduce((sum, tank) => sum + tank.eta.remainingVolume, 0);
  const weightedConfidence = totalVolume > 0 ? 
    activeTankETAs.reduce((sum, tank) => sum + (tank.eta.confidence * tank.eta.remainingVolume), 0) / totalVolume :
    activeTankETAs.reduce((sum, tank) => sum + tank.eta.confidence, 0) / activeTankETAs.length;
  
  // Collect unique assumptions
  const allAssumptions = activeTankETAs.flatMap(tank => tank.eta.assumptions);
  const uniqueAssumptions = [...new Set(allAssumptions)];
  uniqueAssumptions.push(`Based on ${activeTankETAs.length} active tank(s)`);
  
  return {
    overallETA: latestCompletion,
    totalRemainingVolume,
    totalRemainingMass,
    activeTanks: activeTankETAs.length,
    confidence: weightedConfidence,
    assumptions: uniqueAssumptions
  };
}

/**
 * Format ETA for display
 */
export function formatETA(eta: ETACalculation): {
  timeRemaining: string;
  completionTime: string;
  confidence: string;
  status: 'immediate' | 'soon' | 'normal' | 'extended' | 'unknown';
} {
  const now = new Date();
  const timeDiffMs = eta.estimatedCompletion.getTime() - now.getTime();
  const hoursRemaining = timeDiffMs / (1000 * 60 * 60);
  
  let timeRemaining: string;
  let status: 'immediate' | 'soon' | 'normal' | 'extended' | 'unknown';
  
  if (hoursRemaining < 0) {
    timeRemaining = 'Overdue';
    status = 'immediate';
  } else if (hoursRemaining < 0.5) {
    const minutesRemaining = Math.round(timeDiffMs / (1000 * 60));
    timeRemaining = `${minutesRemaining} minutes`;
    status = 'immediate';
  } else if (hoursRemaining < 1) {
    const minutesRemaining = Math.round(timeDiffMs / (1000 * 60));
    timeRemaining = `${minutesRemaining} minutes`;
    status = 'soon';
  } else if (hoursRemaining < 24) {
    const hours = Math.floor(hoursRemaining);
    const minutes = Math.round((hoursRemaining - hours) * 60);
    timeRemaining = `${hours}h ${minutes}m`;
    status = 'normal';
  } else if (hoursRemaining < 168) { // 1 week
    const days = Math.floor(hoursRemaining / 24);
    const hours = Math.round(hoursRemaining % 24);
    timeRemaining = `${days}d ${hours}h`;
    status = 'extended';
  } else {
    timeRemaining = 'Unknown';
    status = 'unknown';
  }
  
  const completionTime = format(eta.estimatedCompletion, 'MMM dd, yyyy HH:mm');
  
  let confidence: string;
  if (eta.confidence >= 0.8) {
    confidence = 'High';
  } else if (eta.confidence >= 0.6) {
    confidence = 'Medium';
  } else if (eta.confidence >= 0.3) {
    confidence = 'Low';
  } else {
    confidence = 'Very Low';
  }
  
  return {
    timeRemaining,
    completionTime,
    confidence,
    status
  };
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(
  currentVolume: number,
  targetVolume: number,
  isLoading: boolean,
  startVolume?: number
): { percentage: number; description: string } {
  if (isLoading) {
    const progress = targetVolume > 0 ? (currentVolume / targetVolume) * 100 : 0;
    return {
      percentage: Math.min(100, Math.max(0, progress)),
      description: `Loading: ${currentVolume.toFixed(1)} / ${targetVolume.toFixed(1)} m³`
    };
  } else {
    // Unloading
    const initialVolume = startVolume || targetVolume;
    const progress = initialVolume > 0 ? ((initialVolume - currentVolume) / initialVolume) * 100 : 0;
    return {
      percentage: Math.min(100, Math.max(0, progress)),
      description: `Unloading: ${(initialVolume - currentVolume).toFixed(1)} / ${initialVolume.toFixed(1)} m³ discharged`
    };
  }
}

/**
 * Validate ETA calculation
 */
export function validateETA(eta: ETACalculation): {
  valid: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Check confidence level
  if (eta.confidence < 0.3) {
    warnings.push('ETA calculation has low confidence');
    recommendations.push('Verify flow rate stability and sensor accuracy');
  }
  
  // Check for unrealistic completion times
  const hoursToCompletion = (eta.estimatedCompletion.getTime() - Date.now()) / (1000 * 60 * 60);
  
  if (hoursToCompletion > 168) { // More than 1 week
    warnings.push('ETA is more than 1 week away');
    recommendations.push('Consider reviewing operation parameters and flow rates');
  }
  
  if (hoursToCompletion < 0) {
    warnings.push('ETA is in the past');
    recommendations.push('Check if operation is complete or flow rate has changed');
  }
  
  // Check flow rate reasonableness
  if (Math.abs(eta.currentRate) > 1000) { // More than 1000 m³/hour
    warnings.push('Flow rate seems unusually high');
    recommendations.push('Verify sensor readings and calculation parameters');
  }
  
  if (Math.abs(eta.currentRate) < 0.01 && eta.remainingVolume > 0) {
    warnings.push('Flow rate is very low despite remaining volume');
    recommendations.push('Check if operation is active or paused');
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
    recommendations
  };
}
