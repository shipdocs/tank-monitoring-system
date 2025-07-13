/**
 * FlowRateCalculationService - Accurate flow rate calculation
 * 
 * This service calculates flow rates based on:
 * - Actual volume differences between imports
 * - Configured import intervals from DataSourceConfiguration
 * - Tank calibration data for accurate volume calculations
 * - Historical data for trend analysis
 */

import { Tank } from '../types/tank';
import { DataSourceConfigurationService } from './DataSourceConfigurationService';

export interface FlowRateData {
  tankId: number;
  currentVolume: number;      // Current volume in liters
  previousVolume: number;     // Previous volume in liters
  volumeChange: number;       // Volume change in liters
  timeInterval: number;       // Time interval in milliseconds
  flowRateL_per_min: number;  // Flow rate in L/min
  flowRateL_per_hour: number; // Flow rate in L/h
  flowRateM3_per_hour: number; // Flow rate in m³/h
  trend: 'loading' | 'unloading' | 'stable';
  confidence: number;         // Confidence level (0-1)
  lastCalculated: Date;
}

export interface VolumeHistory {
  timestamp: Date;
  volume: number;             // Volume in liters
  height: number;             // Height in mm
}

export class FlowRateCalculationService {
  private static instance: FlowRateCalculationService;
  private dataSourceService: DataSourceConfigurationService;
  
  // Store volume history for each tank (last 10 readings)
  private volumeHistory: Map<number, VolumeHistory[]> = new Map();
  
  // Store current flow rate data
  private currentFlowRates: Map<number, FlowRateData> = new Map();

  // Track tanks that have been warned about missing calibration data
  private warnedTanks: Set<number> = new Set();

  private constructor() {
    this.dataSourceService = DataSourceConfigurationService.getInstance();
  }

  static getInstance(): FlowRateCalculationService {
    if (!FlowRateCalculationService.instance) {
      FlowRateCalculationService.instance = new FlowRateCalculationService();
    }
    return FlowRateCalculationService.instance;
  }

  /**
   * Calculate flow rate for a tank using volume-based calculation
   */
  calculateTankFlowRate(tank: Tank): FlowRateData {
    const tankId = tank.id;
    const currentVolume = this.getTankVolumeInLiters(tank);
    const currentTime = new Date();
    
    // Get or initialize volume history for this tank
    let history = this.volumeHistory.get(tankId) || [];
    
    // Add current reading to history
    const currentReading: VolumeHistory = {
      timestamp: currentTime,
      volume: currentVolume,
      height: tank.currentLevel
    };
    
    history.push(currentReading);
    
    // Keep only last 10 readings (for trend analysis)
    if (history.length > 10) {
      history = history.slice(-10);
    }
    
    this.volumeHistory.set(tankId, history);
    
    // Need at least 2 readings to calculate flow rate
    if (history.length < 2) {
      const defaultFlowRate: FlowRateData = {
        tankId,
        currentVolume,
        previousVolume: currentVolume,
        volumeChange: 0,
        timeInterval: 0,
        flowRateL_per_min: 0,
        flowRateL_per_hour: 0,
        flowRateM3_per_hour: 0,
        trend: 'stable',
        confidence: 0,
        lastCalculated: currentTime
      };
      
      this.currentFlowRates.set(tankId, defaultFlowRate);
      return defaultFlowRate;
    }
    
    // Get previous reading
    const previousReading = history[history.length - 2];
    const previousVolume = previousReading.volume;
    
    // Calculate time interval using configured import interval
    const config = this.dataSourceService.getConfiguration();
    const configuredInterval = config.importInterval; // milliseconds
    
    // Use actual time difference as fallback
    const actualInterval = currentTime.getTime() - previousReading.timestamp.getTime();
    
    // Use configured interval if actual interval is close (within 50% tolerance)
    const timeInterval = configuredInterval > 0 && Math.abs(actualInterval - configuredInterval) < (configuredInterval * 0.5)
      ? configuredInterval
      : actualInterval;
    
    // Calculate volume change and flow rates
    const volumeChange = currentVolume - previousVolume;
    const timeIntervalMinutes = timeInterval / (1000 * 60); // Convert ms to minutes
    
    const flowRateL_per_min = timeIntervalMinutes > 0 ? volumeChange / timeIntervalMinutes : 0;
    const flowRateL_per_hour = flowRateL_per_min * 60;
    const flowRateM3_per_hour = flowRateL_per_hour / 1000;
    
    // Determine trend with stability threshold
    const stabilityThreshold = 0.5; // L/min threshold for considering stable
    let trend: 'loading' | 'unloading' | 'stable';
    
    if (Math.abs(flowRateL_per_min) < stabilityThreshold) {
      trend = 'stable';
    } else {
      trend = flowRateL_per_min > 0 ? 'loading' : 'unloading';
    }
    
    // Calculate confidence based on consistency of recent readings
    const confidence = this.calculateConfidence(history, timeInterval);
    
    const flowRateData: FlowRateData = {
      tankId,
      currentVolume,
      previousVolume,
      volumeChange,
      timeInterval,
      flowRateL_per_min,
      flowRateL_per_hour,
      flowRateM3_per_hour,
      trend,
      confidence,
      lastCalculated: currentTime
    };
    
    this.currentFlowRates.set(tankId, flowRateData);
    return flowRateData;
  }

  /**
   * Get current flow rate data for a tank
   */
  getTankFlowRate(tankId: number): FlowRateData | null {
    return this.currentFlowRates.get(tankId) || null;
  }

  /**
   * Get all current flow rates
   */
  getAllFlowRates(): Map<number, FlowRateData> {
    return new Map(this.currentFlowRates);
  }

  /**
   * Calculate aggregate flow rate for multiple tanks
   */
  calculateAggregateFlowRate(tankIds: number[]): {
    totalFlowRateM3_per_hour: number;
    trend: 'loading' | 'unloading' | 'stable';
    activeTankCount: number;
    averageConfidence: number;
  } {
    let totalFlowRate = 0;
    let activeTankCount = 0;
    let confidenceSum = 0;
    
    for (const tankId of tankIds) {
      const flowData = this.currentFlowRates.get(tankId);
      if (flowData && flowData.trend !== 'stable') {
        totalFlowRate += flowData.flowRateM3_per_hour;
        activeTankCount++;
        confidenceSum += flowData.confidence;
      }
    }
    
    const averageConfidence = activeTankCount > 0 ? confidenceSum / activeTankCount : 0;
    
    // Determine overall trend
    let trend: 'loading' | 'unloading' | 'stable';
    const stabilityThreshold = 0.1; // m³/h threshold
    
    if (Math.abs(totalFlowRate) < stabilityThreshold) {
      trend = 'stable';
    } else {
      trend = totalFlowRate > 0 ? 'loading' : 'unloading';
    }
    
    return {
      totalFlowRateM3_per_hour: totalFlowRate,
      trend,
      activeTankCount,
      averageConfidence
    };
  }

  /**
   * Clear history for a tank (useful for reset operations)
   */
  clearTankHistory(tankId: number): void {
    this.volumeHistory.delete(tankId);
    this.currentFlowRates.delete(tankId);
  }

  /**
   * Clear all history (useful for system reset)
   */
  clearAllHistory(): void {
    this.volumeHistory.clear();
    this.currentFlowRates.clear();
  }

  /**
   * Get volume history for a tank
   */
  getTankVolumeHistory(tankId: number): VolumeHistory[] {
    return [...(this.volumeHistory.get(tankId) || [])];
  }

  // Private helper methods

  /**
   * Get tank volume in liters using calibration data or fallback
   */
  private getTankVolumeInLiters(tank: Tank): number {
    // If tank has enhanced volume data, use it
    if ('current_volume_liters' in tank && tank.current_volume_liters !== undefined) {
      return tank.current_volume_liters;
    }
    
    // Fallback: estimate from height (this is less accurate)
    // This assumes a simple linear relationship - not ideal but better than nothing
    const heightPercentage = tank.maxCapacity > 0 ? (tank.currentLevel / tank.maxCapacity) * 100 : 0;
    
    // Use max_volume_liters if available, otherwise estimate
    if ('max_volume_liters' in tank && tank.max_volume_liters !== undefined) {
      return (heightPercentage / 100) * tank.max_volume_liters;
    }
    
    // Final fallback: assume 10L per mm (this should be avoided)
    // Rate-limited warning to prevent log flooding
    if (!this.warnedTanks.has(tank.id)) {
      console.warn(`Tank ${tank.id} has no calibration data, using fallback calculation`);
      this.warnedTanks.add(tank.id);
    }
    return tank.currentLevel * 10;
  }

  /**
   * Calculate confidence level based on reading consistency
   */
  private calculateConfidence(history: VolumeHistory[], expectedInterval: number): number {
    if (history.length < 3) return 0.5; // Low confidence with few readings
    
    let consistencyScore = 0;
    let timeConsistencyScore = 0;
    
    // Check volume change consistency (last 3 readings)
    const recentReadings = history.slice(-3);
    const changes = [];
    
    for (let i = 1; i < recentReadings.length; i++) {
      const change = recentReadings[i].volume - recentReadings[i-1].volume;
      changes.push(change);
    }
    
    // Calculate variance in volume changes
    if (changes.length >= 2) {
      const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
      const variance = changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length;
      
      // Lower variance = higher consistency
      consistencyScore = Math.max(0, 1 - (variance / 100)); // Normalize variance
    }
    
    // Check timing consistency
    const timeIntervals = [];
    for (let i = 1; i < recentReadings.length; i++) {
      const interval = recentReadings[i].timestamp.getTime() - recentReadings[i-1].timestamp.getTime();
      timeIntervals.push(interval);
    }
    
    if (timeIntervals.length > 0) {
      const avgInterval = timeIntervals.reduce((sum, interval) => sum + interval, 0) / timeIntervals.length;
      const timeDifference = Math.abs(avgInterval - expectedInterval);
      const timeToleranceRatio = timeDifference / expectedInterval;
      
      // Good timing consistency if within 20% of expected interval
      timeConsistencyScore = Math.max(0, 1 - (timeToleranceRatio / 0.2));
    }
    
    // Combine scores (weighted average)
    const confidence = (consistencyScore * 0.7) + (timeConsistencyScore * 0.3);
    
    return Math.max(0.1, Math.min(1.0, confidence)); // Clamp between 0.1 and 1.0
  }
}
