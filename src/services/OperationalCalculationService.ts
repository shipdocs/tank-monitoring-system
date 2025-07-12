/**
 * OperationalCalculationService - Combines ASTM 54B calculations with tank operational data
 * 
 * This service provides critical calculations for maritime tank operations including:
 * - Volume Correction Factor (VCF) calculations using ASTM 54B standard
 * - Mass calculations in metric tons
 * - Time-based operational predictions (time to setpoint, empty, full)
 * - Group aggregations for tank clusters
 * - Time table generation for operational planning
 * 
 * CRITICAL: This is PRODUCTION CODE for maritime operations. Accuracy and reliability are paramount.
 */

import { EnhancedTank } from '../types/tankTable';
import { Product, TankOperationalData, CalculationResult, TimeTableEntry } from '../types/product';
import { ASTM54BService } from './ASTM54BService';

/**
 * Aggregated data for a group of tanks
 */
export interface GroupAggregation {
  /** Group identifier */
  groupId: 'BB' | 'SB' | 'CENTER';
  
  /** Display name for the group */
  groupName: string;
  
  /** Total volume across all tanks in the group (liters) */
  totalVolume: number;
  
  /** Total mass across all tanks in the group (metric tons) */
  totalMetricTons: number;
  
  /** Average temperature across all tanks with temperature data (°C) */
  averageTemperature: number | null;
  
  /** Number of tanks in this group */
  tankCount: number;
  
  /** Number of tanks with products assigned */
  activeTankCount: number;
  
  /** Percentage of tanks that are active */
  activePercentage: number;
}

/**
 * Service for operational calculations combining tank data with ASTM 54B standards
 */
export class OperationalCalculationService {
  /**
   * Calculate comprehensive metrics for a tank including VCF, mass, and time predictions
   * 
   * @param tank - Enhanced tank data with calibration information
   * @param product - Product data (null if no product selected)
   * @param operationalData - Current operational parameters
   * @returns Calculation results with all metrics
   */
  public calculateTankMetrics(
    tank: EnhancedTank,
    product: Product | null,
    operationalData: TankOperationalData
  ): CalculationResult {
    // Handle case when no product is selected
    if (!product) {
      return {
        vcf: 1.0,
        alpha: 0,
        densityInAir: 0,
        metricTons: 0,
        remainingTime: null,
        timeToEmpty: null,
        timeToFull: null
      };
    }

    try {
      // Get current volume in liters
      const currentVolume = tank.current_volume_liters || 0;
      const maxVolume = tank.max_volume_liters || 0;

      // Calculate VCF using ASTM 54B
      const vcf = ASTM54BService.calculateVCF(
        product.density_15c_vacuum,
        operationalData.temperature
      );

      // Calculate alpha (thermal expansion coefficient)
      const alpha = ASTM54BService.calculateAlpha(product.density_15c_vacuum);

      // Convert vacuum density to air density
      const densityInAir = ASTM54BService.convertVacuumToAir(product.density_15c_vacuum);

      // Calculate metric tons from current volume
      const metricTons = ASTM54BService.calculateMetricTons(
        currentVolume,
        product.density_15c_vacuum,
        operationalData.temperature
      );

      // Calculate remaining time to setpoint
      const remainingTime = this.calculateRemainingTime(
        currentVolume,
        operationalData.setpoint,
        operationalData.flowRate
      );

      // Calculate time to empty (only if emptying)
      const timeToEmpty = operationalData.flowRate < 0
        ? this.calculateTimeToLimit(currentVolume, 0, operationalData.flowRate)
        : null;

      // Calculate time to full (only if filling)
      const timeToFull = operationalData.flowRate > 0
        ? this.calculateTimeToLimit(currentVolume, maxVolume, operationalData.flowRate)
        : null;

      return {
        vcf,
        alpha,
        densityInAir,
        metricTons,
        remainingTime,
        timeToEmpty,
        timeToFull
      };
    } catch (error) {
      // Log error for monitoring but return safe defaults
      console.error(`Error calculating tank metrics for ${tank.name}:`, error);
      
      return {
        vcf: 1.0,
        alpha: 0,
        densityInAir: 0,
        metricTons: 0,
        remainingTime: null,
        timeToEmpty: null,
        timeToFull: null
      };
    }
  }

  /**
   * Calculate remaining time to reach setpoint volume
   * 
   * @param currentVolume - Current volume in liters
   * @param setpoint - Target volume in liters
   * @param flowRate - Flow rate in L/min (positive for filling, negative for emptying)
   * @returns Minutes to reach setpoint, or null if not applicable
   */
  public calculateRemainingTime(
    currentVolume: number,
    setpoint: number,
    flowRate: number
  ): number | null {
    // Return null if flow rate is zero
    if (flowRate === 0) {
      return null;
    }

    // Calculate volume difference
    const volumeDifference = setpoint - currentVolume;

    // Check logical flow direction
    if (flowRate > 0 && volumeDifference <= 0) {
      // Filling but already at or above setpoint
      return null;
    }

    if (flowRate < 0 && volumeDifference >= 0) {
      // Emptying but already at or below setpoint
      return null;
    }

    // Calculate time in minutes
    const timeMinutes = Math.abs(volumeDifference / flowRate);

    // Validate result
    if (!isFinite(timeMinutes) || timeMinutes < 0) {
      return null;
    }

    // Round to nearest minute for practical use
    return Math.round(timeMinutes);
  }

  /**
   * Calculate time to reach a limit (empty or full)
   * 
   * @param currentVolume - Current volume in liters
   * @param limitVolume - Target limit volume in liters
   * @param flowRate - Flow rate in L/min
   * @returns Minutes to reach limit, or null if not applicable
   */
  private calculateTimeToLimit(
    currentVolume: number,
    limitVolume: number,
    flowRate: number
  ): number | null {
    if (flowRate === 0) {
      return null;
    }

    const volumeDifference = limitVolume - currentVolume;
    
    // Check if we're already at the limit or moving away from it
    if ((flowRate > 0 && volumeDifference <= 0) || (flowRate < 0 && volumeDifference >= 0)) {
      return null;
    }

    const timeMinutes = Math.abs(volumeDifference / flowRate);

    if (!isFinite(timeMinutes) || timeMinutes < 0) {
      return null;
    }

    return Math.round(timeMinutes);
  }

  /**
   * Calculate aggregated metrics for a group of tanks
   * 
   * @param tanks - Array of enhanced tanks
   * @param groupId - Group identifier to aggregate
   * @param products - Array of available products
   * @returns Aggregated group data
   */
  public calculateGroupAggregations(
    tanks: EnhancedTank[],
    groupId: 'BB' | 'SB' | 'CENTER',
    products: Product[]
  ): GroupAggregation {
    // Filter tanks for this group
    const groupTanks = tanks.filter(tank => tank.group === groupId);

    // Initialize aggregation values
    let totalVolume = 0;
    let totalMetricTons = 0;
    let temperatureSum = 0;
    let temperatureCount = 0;
    let activeTankCount = 0;

    // Process each tank in the group
    for (const tank of groupTanks) {
      // Add volume
      totalVolume += tank.current_volume_liters || 0;

      // Add temperature for averaging
      if (tank.temperature !== undefined && tank.temperature !== null) {
        temperatureSum += tank.temperature;
        temperatureCount++;
      }

      // Check if tank has a product assigned (simplified check based on volume and status)
      // In a real implementation, this would check against actual product assignments
      if ((tank.current_volume_liters || 0) > 0 && tank.status !== 'critical') {
        activeTankCount++;

        // Calculate metric tons if we have temperature and can estimate product
        // In production, this would use actual product assignments
        if (tank.temperature !== undefined && products.length > 0) {
          try {
            // Use first product as default for demonstration
            // In production, use actual product assignment
            const defaultProduct = products[0];
            const metricTons = ASTM54BService.calculateMetricTons(
              tank.current_volume_liters || 0,
              defaultProduct.density_15c_vacuum,
              tank.temperature
            );
            totalMetricTons += metricTons;
          } catch (error) {
            console.error(`Error calculating metric tons for tank ${tank.name}:`, error);
          }
        }
      }
    }

    // Calculate averages
    const averageTemperature = temperatureCount > 0 
      ? temperatureSum / temperatureCount 
      : null;

    const tankCount = groupTanks.length;
    const activePercentage = tankCount > 0 
      ? (activeTankCount / tankCount) * 100 
      : 0;

    // Determine group display name
    const groupName = this.getGroupDisplayName(groupId);

    return {
      groupId,
      groupName,
      totalVolume: Math.round(totalVolume),
      totalMetricTons: Math.round(totalMetricTons * 1000) / 1000, // 3 decimal places
      averageTemperature: averageTemperature !== null 
        ? Math.round(averageTemperature * 10) / 10 // 1 decimal place
        : null,
      tankCount,
      activeTankCount,
      activePercentage: Math.round(activePercentage)
    };
  }

  /**
   * Generate time table for tanks with active operations
   * 
   * @param tanks - Array of enhanced tanks
   * @param operationalData - Map of tank ID to operational data
   * @returns Sorted array of time table entries
   */
  public generateTimeTable(
    tanks: EnhancedTank[],
    operationalData: Map<string, TankOperationalData>
  ): TimeTableEntry[] {
    const entries: TimeTableEntry[] = [];
    const now = new Date();

    for (const tank of tanks) {
      // Get operational data for this tank
      const tankOpData = operationalData.get(tank.id.toString());
      
      // Skip if no operational data or no active flow
      if (!tankOpData || tankOpData.flowRate === 0) {
        continue;
      }

      // Calculate remaining time
      const minutesRemaining = this.calculateRemainingTime(
        tank.current_volume_liters || 0,
        tankOpData.setpoint,
        tankOpData.flowRate
      );

      // Skip if no valid remaining time
      if (minutesRemaining === null) {
        continue;
      }

      // Calculate estimated completion time
      const estimatedCompletionTime = new Date(now.getTime() + minutesRemaining * 60000);

      entries.push({
        tankId: tank.id.toString(),
        tankName: tank.name,
        currentVolume: tank.current_volume_liters || 0,
        setpoint: tankOpData.setpoint,
        flowRate: tankOpData.flowRate,
        estimatedCompletionTime,
        minutesRemaining
      });
    }

    // Sort by completion time (earliest first)
    entries.sort((a, b) => {
      if (!a.estimatedCompletionTime || !b.estimatedCompletionTime) {
        return 0;
      }
      return a.estimatedCompletionTime.getTime() - b.estimatedCompletionTime.getTime();
    });

    return entries;
  }

  /**
   * Get display name for a tank group
   * 
   * @param groupId - Group identifier
   * @returns Human-readable group name
   */
  private getGroupDisplayName(groupId: 'BB' | 'SB' | 'CENTER'): string {
    switch (groupId) {
      case 'BB':
        return 'Port Side (BB)';
      case 'SB':
        return 'Starboard Side (SB)';
      case 'CENTER':
        return 'Center Tanks';
      default:
        return 'Unknown Group';
    }
  }

  /**
   * Validate operational data
   * 
   * @param data - Operational data to validate
   * @returns true if valid, false otherwise
   */
  public validateOperationalData(data: TankOperationalData): boolean {
    // Temperature validation
    if (!isFinite(data.temperature) || data.temperature < -50 || data.temperature > 150) {
      return false;
    }

    // Setpoint validation
    if (!isFinite(data.setpoint) || data.setpoint < 0) {
      return false;
    }

    // Flow rate validation
    if (!isFinite(data.flowRate)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate safety margins for tank operations
   * 
   * @param tank - Enhanced tank data
   * @param flowRate - Current flow rate in L/min
   * @returns Safety assessment
   */
  public calculateSafetyMargins(
    tank: EnhancedTank,
    flowRate: number
  ): {
    percentageToHigh: number;
    percentageToLow: number;
    minutesToHigh: number | null;
    minutesToLow: number | null;
    warningLevel: 'safe' | 'caution' | 'warning' | 'critical';
  } {
    const currentVolume = tank.current_volume_liters || 0;
    const maxVolume = tank.max_volume_liters || 0;
    
    // Define safety thresholds (95% for high, 5% for low)
    const highThreshold = maxVolume * 0.95;
    const lowThreshold = maxVolume * 0.05;
    
    // Calculate percentages to thresholds
    const percentageToHigh = maxVolume > 0 
      ? ((highThreshold - currentVolume) / maxVolume) * 100 
      : 0;
    const percentageToLow = maxVolume > 0 
      ? ((currentVolume - lowThreshold) / maxVolume) * 100 
      : 0;
    
    // Calculate time to thresholds
    const minutesToHigh = flowRate > 0 
      ? this.calculateTimeToLimit(currentVolume, highThreshold, flowRate) 
      : null;
    const minutesToLow = flowRate < 0 
      ? this.calculateTimeToLimit(currentVolume, lowThreshold, flowRate) 
      : null;
    
    // Determine warning level
    let warningLevel: 'safe' | 'caution' | 'warning' | 'critical' = 'safe';
    
    if (tank.status === 'critical') {
      warningLevel = 'critical';
    } else if (tank.status === 'high' || tank.status === 'low') {
      warningLevel = 'warning';
    } else if (
      (minutesToHigh !== null && minutesToHigh < 30) ||
      (minutesToLow !== null && minutesToLow < 30)
    ) {
      warningLevel = 'caution';
    }
    
    return {
      percentageToHigh: Math.round(percentageToHigh * 10) / 10,
      percentageToLow: Math.round(percentageToLow * 10) / 10,
      minutesToHigh,
      minutesToLow,
      warningLevel
    };
  }
}

// Export singleton instance for convenience
export const operationalCalculationService = new OperationalCalculationService();