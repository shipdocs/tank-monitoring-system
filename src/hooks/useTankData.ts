import { useState, useEffect, useMemo } from 'react';
import { Tank, TankData } from '../types/tank';
import { EnhancedTank } from '../types/tankTable';
import { UnifiedTankConfigurationService } from '../services/UnifiedTankConfigurationService';
import { FlowRateCalculationService } from '../services/FlowRateCalculationService';

// Raw measurement interface from server
interface RawMeasurement {
  index: number;
  currentLevel: number;
  temperature: number;
  lastUpdated: string;
}

// Helper function to get trend from flow rate service
const getTrendFromFlowRate = (flowRateData: { trend: string; flowRateL_per_min: number } | null): { trend: Tank['trend'], trendValue: number } => {
  if (!flowRateData || flowRateData.trend === 'stable') {
    return { trend: 'stable', trendValue: 0 };
  }

  return {
    trend: flowRateData.trend,
    trendValue: Math.abs(flowRateData.flowRateL_per_min) // Use L/min for consistency
  };
};

export const useTankData = () => {
  const [tankData, setTankData] = useState<TankData>({
    tanks: [],
    lastSync: new Date(),
    connectionStatus: 'disconnected',
  });

  const unifiedConfigService = useMemo(() => new UnifiedTankConfigurationService(), []);
  const flowRateService = useMemo(() => FlowRateCalculationService.getInstance(), []);

  useEffect(() => {
    let updateInterval: NodeJS.Timeout | null = null;

    // Fetch raw measurements and enhance with tank table data
    const fetchTankData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/tanks');
        if (response.ok) {
          const rawMeasurements: RawMeasurement[] = await response.json();
          console.log('✅ Fetched raw measurements:', rawMeasurements.length, 'measurements');

          // Convert raw measurements to basic Tank objects
          const basicTanks: Tank[] = rawMeasurements.map(measurement => ({
            id: measurement.index + 1, // Convert 0-based index to 1-based ID
            name: `Measurement ${measurement.index + 1}`,
            currentLevel: measurement.currentLevel,
            maxCapacity: 1000, // Temporary - will be overridden by tank table
            minLevel: 0,
            maxLevel: 1000,
            unit: 'mm',
            status: 'normal' as const,
            lastUpdated: new Date(measurement.lastUpdated),
            location: `Source ${measurement.index + 1}`,
            temperature: measurement.temperature
          }));

          // Enhance with unified tank configuration
          const enhancedTanks = unifiedConfigService.getEnhancedTankData(basicTanks);

          setTankData(prev => {
            // Calculate flow rates and trends using the new service
            const tanksWithTrends = enhancedTanks.map((newTank: EnhancedTank) => {
              // Calculate flow rate using the new service
              const flowRateData = flowRateService.calculateTankFlowRate(newTank);
              const { trend, trendValue } = getTrendFromFlowRate(flowRateData);

              return {
                ...newTank,
                trend,
                trendValue,
                previousLevel: prev.tanks.find(t => t.id === newTank.id)?.currentLevel || newTank.currentLevel
              };
            });

            return {
              tanks: tanksWithTrends,
              lastSync: new Date(),
              connectionStatus: 'connected'
            };
          });

        } else {
          throw new Error('Failed to fetch tank data from server');
        }
      } catch (error) {
        console.error('❌ Error fetching tank data:', error.message);
        console.warn('⚠️ No tank data available - connection failed');

        // CRITICAL: Do NOT show mock data to users in a tank monitoring system
        // Users must know when there is no real data available
        setTankData(prev => ({
          tanks: [], // Empty tanks array - no fake data
          lastSync: prev.lastSync, // Keep previous sync time
          connectionStatus: 'disconnected'
        }));
      }
    };

    // Update function that runs every 3 seconds
    const updateData = () => {
      fetchTankData();
    };

    // Set up simple 3-second interval
    updateInterval = setInterval(updateData, 3000);

    // Try to fetch real data initially
    fetchTankData();

    return () => {
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, [unifiedConfigService, flowRateService]); // Include unifiedConfigService in dependency array

  // Debug function for troubleshooting configuration issues
  const debugConfiguration = () => {
    const status = unifiedConfigService.getConfigurationStatus();
    console.log('🔍 Tank Configuration Debug:', status);
    return status;
  };

  return {
    ...tankData,
    debugConfiguration
  };
};