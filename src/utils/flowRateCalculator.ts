import { FlowRateData, VolumeCalculationResult } from '../types/tankTable';

interface FlowRateReading {
  timestamp: Date;
  volume: number; // m³
  mass?: number; // metric tons
}

/**
 * Calculate flow rate from volume readings over time
 */
export function calculateVolumeFlowRate(
  readings: FlowRateReading[],
  smoothingFactor: number = 0.3
): FlowRateData {
  if (readings.length < 2) {
    return {
      volumeFlowRate: 0,
      massFlowRate: 0,
      trend: 'stable',
      confidence: 0,
      smoothed: false
    };
  }

  // Sort readings by timestamp
  const sortedReadings = [...readings].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // Calculate instantaneous flow rates
  const flowRates: number[] = [];
  const timeDiffs: number[] = [];
  
  for (let i = 1; i < sortedReadings.length; i++) {
    const current = sortedReadings[i];
    const previous = sortedReadings[i - 1];
    
    const timeDiffHours = (current.timestamp.getTime() - previous.timestamp.getTime()) / (1000 * 60 * 60);
    const volumeDiff = current.volume - previous.volume;
    
    if (timeDiffHours > 0) {
      const instantaneousRate = volumeDiff / timeDiffHours;
      flowRates.push(instantaneousRate);
      timeDiffs.push(timeDiffHours);
    }
  }
  
  if (flowRates.length === 0) {
    return {
      volumeFlowRate: 0,
      massFlowRate: 0,
      trend: 'stable',
      confidence: 0,
      smoothed: false
    };
  }
  
  // Apply smoothing if requested
  let finalFlowRate: number;
  let smoothed = false;
  
  if (smoothingFactor > 0 && flowRates.length > 1) {
    finalFlowRate = applyExponentialSmoothing(flowRates, smoothingFactor);
    smoothed = true;
  } else {
    // Use most recent flow rate
    finalFlowRate = flowRates[flowRates.length - 1];
  }
  
  // Determine trend
  const trend = determineTrend(finalFlowRate);
  
  // Calculate confidence based on consistency of readings
  const confidence = calculateFlowRateConfidence(flowRates, timeDiffs);
  
  // Calculate mass flow rate if mass data is available
  let massFlowRate = 0;
  if (sortedReadings.some(r => r.mass !== undefined)) {
    const massReadings = sortedReadings.filter(r => r.mass !== undefined);
    if (massReadings.length >= 2) {
      const latestMass = massReadings[massReadings.length - 1];
      const previousMass = massReadings[massReadings.length - 2];
      const timeDiffHours = (latestMass.timestamp.getTime() - previousMass.timestamp.getTime()) / (1000 * 60 * 60);
      
      if (timeDiffHours > 0 && latestMass.mass !== undefined && previousMass.mass !== undefined) {
        massFlowRate = (latestMass.mass - previousMass.mass) / timeDiffHours;
      }
    }
  }
  
  return {
    volumeFlowRate: finalFlowRate,
    massFlowRate,
    trend,
    confidence,
    smoothed
  };
}

/**
 * Apply exponential smoothing to flow rate data
 */
function applyExponentialSmoothing(values: number[], alpha: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  
  let smoothedValue = values[0];
  
  for (let i = 1; i < values.length; i++) {
    smoothedValue = alpha * values[i] + (1 - alpha) * smoothedValue;
  }
  
  return smoothedValue;
}

/**
 * Determine trend from flow rate
 */
function determineTrend(flowRate: number): 'loading' | 'unloading' | 'stable' {
  const threshold = 0.1; // m³/hour threshold for stability
  
  if (flowRate > threshold) {
    return 'loading';
  } else if (flowRate < -threshold) {
    return 'unloading';
  } else {
    return 'stable';
  }
}

/**
 * Calculate confidence in flow rate calculation
 */
function calculateFlowRateConfidence(flowRates: number[], timeDiffs: number[]): number {
  if (flowRates.length < 2) return 0.5;
  
  // Calculate coefficient of variation (CV)
  const mean = flowRates.reduce((sum, rate) => sum + rate, 0) / flowRates.length;
  const variance = flowRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / flowRates.length;
  const standardDeviation = Math.sqrt(variance);
  
  const cv = Math.abs(mean) > 0.01 ? standardDeviation / Math.abs(mean) : 1;
  
  // Lower CV means higher confidence
  let confidence = Math.max(0, 1 - cv);
  
  // Adjust confidence based on time intervals
  const avgTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
  
  // Prefer readings that are not too close together (< 1 minute) or too far apart (> 1 hour)
  if (avgTimeDiff < 1/60) { // Less than 1 minute
    confidence *= 0.7;
  } else if (avgTimeDiff > 1) { // More than 1 hour
    confidence *= 0.8;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Filter out outlier readings that might be due to vessel movement
 */
export function filterOutlierReadings(
  readings: FlowRateReading[],
  outlierThreshold: number = 3 // Standard deviations
): FlowRateReading[] {
  if (readings.length < 3) return readings;
  
  // Calculate flow rates between consecutive readings
  const flowRates: number[] = [];
  for (let i = 1; i < readings.length; i++) {
    const timeDiffHours = (readings[i].timestamp.getTime() - readings[i-1].timestamp.getTime()) / (1000 * 60 * 60);
    if (timeDiffHours > 0) {
      const rate = (readings[i].volume - readings[i-1].volume) / timeDiffHours;
      flowRates.push(rate);
    }
  }
  
  if (flowRates.length < 2) return readings;
  
  // Calculate mean and standard deviation
  const mean = flowRates.reduce((sum, rate) => sum + rate, 0) / flowRates.length;
  const variance = flowRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / flowRates.length;
  const stdDev = Math.sqrt(variance);
  
  // Filter readings based on outlier threshold
  const filteredReadings = [readings[0]]; // Always keep first reading
  
  for (let i = 1; i < readings.length; i++) {
    const timeDiffHours = (readings[i].timestamp.getTime() - readings[i-1].timestamp.getTime()) / (1000 * 60 * 60);
    if (timeDiffHours > 0) {
      const rate = (readings[i].volume - readings[i-1].volume) / timeDiffHours;
      const zScore = Math.abs(rate - mean) / stdDev;
      
      if (zScore <= outlierThreshold) {
        filteredReadings.push(readings[i]);
      }
    } else {
      filteredReadings.push(readings[i]); // Keep readings with same timestamp
    }
  }
  
  return filteredReadings;
}

/**
 * Create flow rate history for trend analysis
 */
export function createFlowRateHistory(
  volumeResults: Array<{ timestamp: Date; result: VolumeCalculationResult }>,
  maxHistoryLength: number = 50
): FlowRateReading[] {
  const readings: FlowRateReading[] = volumeResults.map(item => ({
    timestamp: item.timestamp,
    volume: item.result.volume
  }));
  
  // Sort by timestamp and limit history length
  const sortedReadings = readings
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .slice(-maxHistoryLength);
  
  return sortedReadings;
}

/**
 * Calculate average flow rate over a specific time period
 */
export function calculateAverageFlowRate(
  readings: FlowRateReading[],
  periodHours: number
): { averageRate: number; dataPoints: number; timeSpan: number } {
  if (readings.length < 2) {
    return { averageRate: 0, dataPoints: 0, timeSpan: 0 };
  }
  
  const sortedReadings = [...readings].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const cutoffTime = new Date(Date.now() - periodHours * 60 * 60 * 1000);
  
  // Filter readings within the specified period
  const recentReadings = sortedReadings.filter(reading => reading.timestamp >= cutoffTime);
  
  if (recentReadings.length < 2) {
    return { averageRate: 0, dataPoints: recentReadings.length, timeSpan: 0 };
  }
  
  // Calculate total volume change and time span
  const firstReading = recentReadings[0];
  const lastReading = recentReadings[recentReadings.length - 1];
  
  const volumeChange = lastReading.volume - firstReading.volume;
  const timeSpanHours = (lastReading.timestamp.getTime() - firstReading.timestamp.getTime()) / (1000 * 60 * 60);
  
  const averageRate = timeSpanHours > 0 ? volumeChange / timeSpanHours : 0;
  
  return {
    averageRate,
    dataPoints: recentReadings.length,
    timeSpan: timeSpanHours
  };
}

/**
 * Predict future volume based on current flow rate
 */
export function predictFutureVolume(
  currentVolume: number,
  flowRate: number,
  hoursAhead: number
): { predictedVolume: number; confidence: number } {
  const predictedVolume = currentVolume + (flowRate * hoursAhead);
  
  // Confidence decreases with time and increases with stable flow rate
  let confidence = Math.max(0, 1 - (hoursAhead / 24)); // Decrease over 24 hours
  
  // Adjust confidence based on flow rate magnitude (more stable = higher confidence)
  if (Math.abs(flowRate) < 0.1) {
    confidence *= 0.5; // Low confidence for very small flow rates
  }
  
  return {
    predictedVolume: Math.max(0, predictedVolume),
    confidence: Math.max(0, Math.min(1, confidence))
  };
}
