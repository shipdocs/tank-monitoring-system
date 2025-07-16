import { Tank } from '../types/tank';
import { Product } from '../types/product';
import { ASTM54BService } from './ASTM54BService';
import { FlowRateCalculationService } from './FlowRateCalculationService';
import { FlowRateConfigurationService } from './FlowRateConfigurationService';

export interface GroupTotals {
  groupId: string;
  groupName: string;
  tankCount: number;
  totalVolume: number; // m³
  totalMetricTons: number;
  averageFillPercentage: number;
  averageTemperature: number | null;
  flowRate: number; // m³/h (positive = loading, negative = unloading)
  trend: 'loading' | 'unloading' | 'stable';
}

export interface GrandTotals {
  totalVolume: number; // m³
  totalMetricTons: number;
  overallFillPercentage: number;
  activeTankCount: number;
  flowRate: number; // m³/h
  trend: 'loading' | 'unloading' | 'stable';
  lastUpdated: Date;
}

export interface SetpointCalculation {
  currentVolume: number; // m³
  targetVolume: number; // m³
  remainingVolume: number; // m³
  progressPercentage: number;
  timeRemainingMinutes: number | null;
  estimatedCompletionTime: Date | null;
  isLoading: boolean; // true = loading, false = unloading
}

export class TankTotalsService {
  private defaultProduct: Product = {
    id: 'default-ballast',
    name: 'Ballast Water',
    density_15c_vacuum: 1.025, // Typical seawater density
    description: 'Default ballast water for calculations'
  };

  private flowRateService: FlowRateCalculationService;
  private flowRateConfigService: FlowRateConfigurationService;

  constructor() {
    this.flowRateService = FlowRateCalculationService.getInstance();
    this.flowRateConfigService = FlowRateConfigurationService.getInstance();
  }

  /**
   * Calculate totals for a specific group of tanks
   */
  calculateGroupTotals(
    tanks: Tank[], 
    groupId: string, 
    products: Product[] = []
  ): GroupTotals {
    const groupTanks = tanks.filter(tank => tank.group === groupId);
    
    if (groupTanks.length === 0) {
      return {
        groupId,
        groupName: this.getGroupDisplayName(groupId),
        tankCount: 0,
        totalVolume: 0,
        totalMetricTons: 0,
        averageFillPercentage: 0,
        averageTemperature: null,
        flowRate: 0,
        trend: 'stable'
      };
    }

    let totalVolume = 0;
    let totalMetricTons = 0;
    let totalFillPercentage = 0;
    let temperatureSum = 0;
    let temperatureCount = 0;
    let flowRateSum = 0;
    let flowRateCount = 0;

    for (const tank of groupTanks) {
      // Volume calculation
      const tankVolume = this.getTankVolume(tank);
      totalVolume += tankVolume;

      // Fill percentage calculation
      const fillPercentage = this.getTankFillPercentage(tank);
      totalFillPercentage += fillPercentage;

      // Temperature calculation
      if (tank.temperature !== undefined) {
        temperatureSum += tank.temperature;
        temperatureCount++;
      }

      // Flow rate calculation using new volume-based service
      const flowRateData = this.flowRateService.calculateTankFlowRate(tank);
      if (flowRateData.trend !== 'stable') {
        flowRateSum += flowRateData.flowRateL_per_hour;
        flowRateCount++;
      }

      // Metric tons calculation
      const metricTons = this.calculateTankMetricTons(tank, products);
      totalMetricTons += metricTons;
    }

    const averageFillPercentage = totalFillPercentage / groupTanks.length;
    const averageTemperature = temperatureCount > 0 ? temperatureSum / temperatureCount : null;
    const groupFlowRate = flowRateCount > 0 ? flowRateSum : 0;
    const trend = this.determineTrend(groupFlowRate);

    return {
      groupId,
      groupName: this.getGroupDisplayName(groupId),
      tankCount: groupTanks.length,
      totalVolume: totalVolume / 1000, // Convert L to m³
      totalMetricTons,
      averageFillPercentage,
      averageTemperature,
      flowRate: groupFlowRate / 1000, // Convert L/h to m³/h
      trend
    };
  }

  /**
   * Calculate grand totals across all tanks
   */
  calculateGrandTotals(tanks: Tank[], products: Product[] = []): GrandTotals {
    if (tanks.length === 0) {
      return {
        totalVolume: 0,
        totalMetricTons: 0,
        overallFillPercentage: 0,
        activeTankCount: 0,
        flowRate: 0,
        trend: 'stable',
        lastUpdated: new Date()
      };
    }

    let totalVolume = 0;
    let totalMetricTons = 0;
    let totalFillPercentage = 0;
    let flowRateSum = 0;
    let flowRateCount = 0;
    let activeTankCount = 0;

    for (const tank of tanks) {
      // Volume calculation
      const tankVolume = this.getTankVolume(tank);
      totalVolume += tankVolume;

      // Fill percentage calculation
      const fillPercentage = this.getTankFillPercentage(tank);
      totalFillPercentage += fillPercentage;

      // Flow rate calculation using new volume-based service
      const flowRateData = this.flowRateService.calculateTankFlowRate(tank);
      if (flowRateData.trend !== 'stable') {
        flowRateSum += flowRateData.flowRateL_per_hour;
        flowRateCount++;
        activeTankCount++;
      }

      // Metric tons calculation
      const metricTons = this.calculateTankMetricTons(tank, products);
      totalMetricTons += metricTons;
    }

    const overallFillPercentage = totalFillPercentage / tanks.length;
    const grandFlowRate = flowRateCount > 0 ? flowRateSum : 0;
    const trend = this.determineTrend(grandFlowRate);

    return {
      totalVolume: totalVolume / 1000, // Convert L to m³
      totalMetricTons,
      overallFillPercentage,
      activeTankCount,
      flowRate: grandFlowRate / 1000, // Convert L/h to m³/h
      trend,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate setpoint progress and time estimation
   */
  calculateSetpointProgress(
    currentTotals: GrandTotals,
    targetVolume: number
  ): SetpointCalculation {
    const currentVolume = currentTotals.totalVolume;
    const remainingVolume = targetVolume - currentVolume;
    const progressPercentage = targetVolume > 0 ? (currentVolume / targetVolume) * 100 : 0;
    const isLoading = remainingVolume > 0;

    let timeRemainingMinutes: number | null = null;
    let estimatedCompletionTime: Date | null = null;

    // Calculate time remaining if we have flow rate data
    if (currentTotals.flowRate !== 0 && Math.abs(remainingVolume) > 0.1) {
      const flowRateM3PerMinute = currentTotals.flowRate / 60; // Convert m³/h to m³/min
      
      // Only calculate if flow direction matches requirement
      if ((isLoading && flowRateM3PerMinute > 0) || (!isLoading && flowRateM3PerMinute < 0)) {
        timeRemainingMinutes = Math.abs(remainingVolume / flowRateM3PerMinute);
        estimatedCompletionTime = new Date(Date.now() + timeRemainingMinutes * 60 * 1000);
      }
    }

    return {
      currentVolume,
      targetVolume,
      remainingVolume,
      progressPercentage: Math.min(progressPercentage, 100),
      timeRemainingMinutes,
      estimatedCompletionTime,
      isLoading
    };
  }

  /**
   * Get tank volume in liters (from enhanced tank data or fallback calculation)
   */
  private getTankVolume(tank: Tank): number {
    // Use enhanced tank data if available
    const enhancedTank = tank as Tank & { current_volume_liters?: number };
    if (enhancedTank.current_volume_liters !== undefined) {
      return enhancedTank.current_volume_liters;
    }

    // Fallback to simple calculation (should not happen with tank tables)
    return tank.currentLevel * 10; // 10L per mm as fallback
  }

  /**
   * Get tank fill percentage
   */
  private getTankFillPercentage(tank: Tank): number {
    const enhancedTank = tank as Tank & { fill_percentage?: number };
    if (enhancedTank.fill_percentage !== undefined) {
      return enhancedTank.fill_percentage;
    }

    // Fallback calculation
    return tank.maxCapacity > 0 ? (tank.currentLevel / tank.maxCapacity) * 100 : 0;
  }

  /**
   * Get tank flow rate data from the flow rate service
   */
  getTankFlowRateData(tankId: number) {
    return this.flowRateService.getTankFlowRate(tankId);
  }

  /**
   * Calculate metric tons for a tank using ASTM 54B
   */
  private calculateTankMetricTons(tank: Tank, products: Product[]): number {
    const tankVolume = this.getTankVolume(tank); // in liters

    if (tankVolume <= 0 || tank.temperature === undefined) {
      return 0;
    }

    // Find assigned product or use default
    const product = products.length > 0 ? products[0] : this.defaultProduct;

    try {
      // Test if ASTM54B service is available
      if (typeof ASTM54BService?.calculateMetricTons === 'function') {
        return ASTM54BService.calculateMetricTons(
          tankVolume,
          product.density_15c_vacuum,
          tank.temperature
        );
      } else {
        throw new Error('ASTM54B service not available');
      }
    } catch (error) {
      console.warn(`ASTM54B service failed for tank ${tank.name}, using fallback calculation:`, error);

      // Fallback calculation with temperature correction
      return this.calculateMetricTonsFallback(
        tankVolume,
        product.density_15c_vacuum,
        tank.temperature
      );
    }
  }

  /**
   * Fallback metric tons calculation with basic temperature correction
   */
  private calculateMetricTonsFallback(
    volumeLiters: number,
    density15c: number,
    temperature: number
  ): number {
    if (volumeLiters <= 0 || density15c <= 0) {
      return 0;
    }

    // Basic temperature correction factor (simplified ASTM 54B approximation)
    // For petroleum products: VCF ≈ 1 - α × (T - 15)
    // Where α ≈ 0.0007 for most petroleum products, 0.00025 for water
    const expansionCoefficient = density15c > 1.0 ? 0.00025 : 0.0007; // Water vs petroleum
    const temperatureCorrectionFactor = 1 - (expansionCoefficient * (temperature - 15));

    // Calculate corrected density
    const correctedDensity = density15c * temperatureCorrectionFactor;

    // Calculate metric tons: volume(L) × density(kg/L) ÷ 1000
    const metricTons = (volumeLiters * correctedDensity) / 1000;

    return Math.max(0, metricTons);
  }

  /**
   * Determine trend based on flow rate using centralized configuration
   */
  private determineTrend(flowRateL_per_hour: number): 'loading' | 'unloading' | 'stable' {
    // Convert L/h to m³/h for consistent threshold checking
    const flowRateM3_per_hour = flowRateL_per_hour / 1000;
    return this.flowRateConfigService.getTrend(flowRateM3_per_hour);
  }

  /**
   * Get display name for group
   */
  private getGroupDisplayName(groupId: string): string {
    switch (groupId) {
      case 'BB': return 'BB (Port)';
      case 'SB': return 'SB (Starboard)';
      case 'CENTER': return 'Center';
      default: return groupId;
    }
  }

  /**
   * Format time remaining for display
   */
  formatTimeRemaining(minutes: number | null): string {
    if (minutes === null || minutes <= 0) {
      return '--';
    }

    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  }

  /**
   * Format estimated completion time for display
   */
  formatEstimatedCompletionTime(date: Date | null): string {
    if (!date) {
      return '--:--';
    }

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}
