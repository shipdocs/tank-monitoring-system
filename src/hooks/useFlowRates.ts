import { useState, useCallback, useRef } from 'react';
import { Tank } from '../types/tank';
import { FlowRateData, VolumeCalculationResult, ETACalculation } from '../types/tankTable';
import { calculateVolumeFlowRate, filterOutlierReadings, calculateAverageFlowRate, predictFutureVolume } from '../utils/flowRateCalculator';
import { calculateETA, calculateMultiTankETA, formatETA } from '../utils/etaCalculator';

interface FlowRateReading {
  timestamp: Date;
  volume: number; // m³
  mass?: number; // metric tons
}

interface FlowRateCalculationData {
  tankId: number;
  flowRateData: FlowRateData;
  etaData: ETACalculation;
  readings: FlowRateReading[];
  averageRates: {
    last1Hour: { averageRate: number; dataPoints: number; timeSpan: number };
    last6Hours: { averageRate: number; dataPoints: number; timeSpan: number };
    last24Hours: { averageRate: number; dataPoints: number; timeSpan: number };
  };
  prediction: {
    next1Hour: { predictedVolume: number; confidence: number };
    next6Hours: { predictedVolume: number; confidence: number };
  };
  lastCalculated: Date;
}

interface UseFlowRatesReturn {
  // Calculation data
  flowRateCalculations: Map<number, FlowRateCalculationData>;
  
  // Loading state
  isCalculating: boolean;
  
  // Operations
  addReading: (tank: Tank, volumeResult: VolumeCalculationResult, mass?: number) => void;
  calculateFlowRate: (tankId: number) => FlowRateData | null;
  calculateETA: (tankId: number, targetVolume: number, maxCapacity: number) => ETACalculation | null;
  
  // Batch operations
  updateAllFlowRates: (tanks: Tank[], volumeCalculations: Map<number, VolumeCalculationResult>) => void;
  
  // Multi-tank operations
  calculateOverallETA: (activeTankIds: number[]) => {
    overallETA: Date;
    totalRemainingVolume: number;
    totalRemainingMass: number;
    activeTanks: number;
    confidence: number;
    assumptions: string[];
  } | null;
  
  // Configuration
  setSmoothingFactor: (factor: number) => void;
  setMaxHistoryLength: (length: number) => void;
  setOutlierThreshold: (threshold: number) => void;
  
  // Utility
  clearHistory: (tankId?: number) => void;
  exportFlowRateData: () => string;
  getFormattedETA: (tankId: number) => {
    timeRemaining: string;
    completionTime: string;
    confidence: string;
    status: 'immediate' | 'soon' | 'normal' | 'extended' | 'unknown';
  } | null;
}

export function useFlowRates(): UseFlowRatesReturn {
  const [flowRateCalculations, setFlowRateCalculations] = useState<Map<number, FlowRateCalculationData>>(new Map());
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Configuration
  const [smoothingFactor, setSmoothingFactor] = useState(0.3);
  const [maxHistoryLength, setMaxHistoryLength] = useState(50);
  const [outlierThreshold, setOutlierThreshold] = useState(3);
  
  // Refs to maintain history between renders
  const readingHistoryRef = useRef<Map<number, FlowRateReading[]>>(new Map());

  // Add a new reading for a tank
  const addReading = useCallback((tank: Tank, volumeResult: VolumeCalculationResult, mass?: number) => {
    const reading: FlowRateReading = {
      timestamp: new Date(),
      volume: volumeResult.volume,
      mass
    };
    
    const currentHistory = readingHistoryRef.current.get(tank.id) || [];
    const newHistory = [...currentHistory, reading].slice(-maxHistoryLength);
    
    readingHistoryRef.current.set(tank.id, newHistory);
  }, [maxHistoryLength]);

  // Calculate flow rate for a specific tank
  const calculateFlowRate = useCallback((tankId: number): FlowRateData | null => {
    const readings = readingHistoryRef.current.get(tankId);
    if (!readings || readings.length < 2) {
      return null;
    }
    
    // Filter outliers
    const filteredReadings = filterOutlierReadings(readings, outlierThreshold);
    
    // Calculate flow rate
    return calculateVolumeFlowRate(filteredReadings, smoothingFactor);
  }, [smoothingFactor, outlierThreshold]);

  // Calculate ETA for a specific tank
  const calculateETAForTank = useCallback((
    tankId: number, 
    targetVolume: number, 
    maxCapacity: number
  ): ETACalculation | null => {
    const calculation = flowRateCalculations.get(tankId);
    if (!calculation) {
      return null;
    }
    
    const readings = readingHistoryRef.current.get(tankId);
    if (!readings || readings.length === 0) {
      return null;
    }
    
    const currentReading = readings[readings.length - 1];
    const currentVolumeResult = {
      volume: currentReading.volume,
      volumeLiters: currentReading.volume * 1000,
      interpolated: false,
      accuracy: 'exact' as const
    };
    
    return calculateETA(
      currentVolumeResult,
      targetVolume,
      calculation.flowRateData,
      maxCapacity,
      currentReading.mass
    );
  }, [flowRateCalculations]);

  // Update flow rates for all tanks
  const updateAllFlowRates = useCallback((
    tanks: Tank[], 
    volumeCalculations: Map<number, VolumeCalculationResult>
  ) => {
    setIsCalculating(true);
    
    try {
      const newCalculations = new Map<number, FlowRateCalculationData>();
      
      tanks.forEach(tank => {
        const volumeResult = volumeCalculations.get(tank.id);
        if (volumeResult) {
          // Add current reading to history
          addReading(tank, volumeResult, tank.massData?.mass);
          
          // Get readings for this tank
          const readings = readingHistoryRef.current.get(tank.id) || [];
          
          if (readings.length >= 2) {
            // Calculate flow rate
            const flowRateData = calculateFlowRate(tank.id);
            
            if (flowRateData) {
              // Calculate ETA (assuming target is max capacity for loading)
              const targetVolume = tank.maxCapacity / 1000; // Convert mm to m³ (rough estimate)
              const maxCapacity = targetVolume;
              const etaData = calculateETAForTank(tank.id, targetVolume, maxCapacity);
              
              // Calculate average rates
              const averageRates = {
                last1Hour: calculateAverageFlowRate(readings, 1),
                last6Hours: calculateAverageFlowRate(readings, 6),
                last24Hours: calculateAverageFlowRate(readings, 24)
              };
              
              // Calculate predictions
              const currentVolume = volumeResult.volume;
              const prediction = {
                next1Hour: predictFutureVolume(currentVolume, flowRateData.volumeFlowRate, 1),
                next6Hours: predictFutureVolume(currentVolume, flowRateData.volumeFlowRate, 6)
              };
              
              newCalculations.set(tank.id, {
                tankId: tank.id,
                flowRateData,
                etaData: etaData || {
                  estimatedCompletion: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                  remainingVolume: 0,
                  remainingMass: 0,
                  currentRate: 0,
                  confidence: 0,
                  assumptions: ['Insufficient data for ETA calculation']
                },
                readings: [...readings],
                averageRates,
                prediction,
                lastCalculated: new Date()
              });
            }
          }
        }
      });
      
      setFlowRateCalculations(newCalculations);
    } catch (error) {
      console.error('Failed to update flow rates:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [addReading, calculateFlowRate, calculateETAForTank]);

  // Calculate overall ETA for multiple tanks
  const calculateOverallETA = useCallback((activeTankIds: number[]) => {
    const tankETAs = activeTankIds
      .map(tankId => {
        const calculation = flowRateCalculations.get(tankId);
        return calculation ? {
          tankId: tankId.toString(),
          eta: calculation.etaData,
          isActive: Math.abs(calculation.flowRateData.volumeFlowRate) > 0.01
        } : null;
      })
      .filter(Boolean) as Array<{ tankId: string; eta: ETACalculation; isActive: boolean }>;
    
    if (tankETAs.length === 0) {
      return null;
    }
    
    return calculateMultiTankETA(tankETAs);
  }, [flowRateCalculations]);

  // Clear history for specific tank or all tanks
  const clearHistory = useCallback((tankId?: number) => {
    if (tankId !== undefined) {
      readingHistoryRef.current.delete(tankId);
      setFlowRateCalculations(prev => {
        const newMap = new Map(prev);
        newMap.delete(tankId);
        return newMap;
      });
    } else {
      readingHistoryRef.current.clear();
      setFlowRateCalculations(new Map());
    }
  }, []);

  // Export flow rate data
  const exportFlowRateData = useCallback((): string => {
    const data = {
      calculations: Array.from(flowRateCalculations.entries()).map(([tankId, calc]) => ({
        tankId,
        ...calc
      })),
      history: Array.from(readingHistoryRef.current.entries()).map(([tankId, readings]) => ({
        tankId,
        readings
      })),
      configuration: {
        smoothingFactor,
        maxHistoryLength,
        outlierThreshold
      },
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }, [flowRateCalculations, smoothingFactor, maxHistoryLength, outlierThreshold]);

  // Get formatted ETA for display
  const getFormattedETA = useCallback((tankId: number) => {
    const calculation = flowRateCalculations.get(tankId);
    if (!calculation) {
      return null;
    }
    
    return formatETA(calculation.etaData);
  }, [flowRateCalculations]);

  return {
    // Calculation data
    flowRateCalculations,
    
    // Loading state
    isCalculating,
    
    // Operations
    addReading,
    calculateFlowRate,
    calculateETA: calculateETAForTank,
    
    // Batch operations
    updateAllFlowRates,
    
    // Multi-tank operations
    calculateOverallETA,
    
    // Configuration
    setSmoothingFactor,
    setMaxHistoryLength,
    setOutlierThreshold,
    
    // Utility
    clearHistory,
    exportFlowRateData,
    getFormattedETA
  };
}
