import { useState, useEffect, useCallback } from 'react';
import { Tank, TankData } from '../types/tank';
import { useVolumeCalculations } from './useVolumeCalculations';
import { useMassCalculations } from './useMassCalculations';
import { useFlowRates } from './useFlowRates';

interface EnhancedTankDataReturn extends TankData {
  // Enhanced statistics
  totalVolume: number;
  totalMass: number;
  averageUtilization: number;
  activeTanks: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Helper function to calculate trend
const calculateTrend = (currentLevel: number, previousLevel: number): { trend: Tank['trend'], trendValue: number } => {
  const difference = currentLevel - previousLevel;
  const threshold = 3.0; // Minimum change to consider as trend (3mm to account for ship movement)

  if (Math.abs(difference) < threshold) {
    return { trend: 'stable', trendValue: 0 };
  }

  // Convert to rate per minute (assuming 3-second updates)
  const ratePerMinute = (difference / 3) * 60;

  return {
    trend: difference > 0 ? 'loading' : 'unloading',
    trendValue: Math.abs(ratePerMinute)
  };
};

export const useTankData = (): EnhancedTankDataReturn => {
  const [tankData, setTankData] = useState<TankData>({
    tanks: [],
    lastSync: new Date(),
    connectionStatus: 'disconnected',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enhanced calculation hooks
  const volumeCalculations = useVolumeCalculations();
  const massCalculations = useMassCalculations();
  const flowRates = useFlowRates();



  // Enhanced data fetching with calculations
  const fetchTankData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/tanks');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fetched tank data:', data.length, 'tanks');

        setTankData(prev => {
          // Calculate trends by comparing with previous data
          const tanksWithTrends = data.map((newTank: Tank) => {
            const prevTank = prev.tanks.find(t => t.id === newTank.id);
            const previousLevel = prevTank?.currentLevel || newTank.currentLevel;
            const { trend, trendValue } = calculateTrend(newTank.currentLevel, previousLevel);

            return {
              ...newTank,
              trend,
              trendValue,
              previousLevel
            };
          });

          return {
            tanks: tanksWithTrends,
            lastSync: new Date(),
            connectionStatus: 'connected'
          };
        });

        // Trigger enhanced calculations
        volumeCalculations.calculateAllVolumes(data);

      } else {
        throw new Error('Failed to fetch tank data from server');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error fetching tank data:', errorMessage);
      setError(errorMessage);
      setTankData(prev => ({
        ...prev,
        connectionStatus: 'disconnected'
      }));
    } finally {
      setIsLoading(false);
    }
  }, [volumeCalculations]);

  useEffect(() => {
    let updateInterval: NodeJS.Timeout | null = null;

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
  }, [fetchTankData]);

  // Enhanced calculations effect
  useEffect(() => {
    if (tankData.tanks.length > 0) {
      // Update volume calculations first
      volumeCalculations.calculateAllVolumes(tankData.tanks);
    }
  }, [tankData.tanks, volumeCalculations]);

  // Update mass and flow calculations when volume calculations change
  useEffect(() => {
    if (tankData.tanks.length > 0 && volumeCalculations.volumeCalculations.size > 0) {
      // Create volume calculation map for mass and flow rate calculations
      const volumeCalcMap = new Map();
      tankData.tanks.forEach(tank => {
        const calc = volumeCalculations.volumeCalculations.get(tank.id);
        if (calc) {
          volumeCalcMap.set(tank.id, calc.volumeResult);
        }
      });

      // Update mass calculations
      if (volumeCalcMap.size > 0) {
        massCalculations.calculateAllMasses(tankData.tanks, volumeCalcMap);

        // Update flow rates
        flowRates.updateAllFlowRates(tankData.tanks, volumeCalcMap);
      }
    }
  }, [tankData.tanks, volumeCalculations.volumeCalculations, massCalculations, flowRates]);

  // Calculate enhanced statistics
  const totalVolume = volumeCalculations.getTotalVolume(tankData.tanks);
  const totalMass = massCalculations.getTotalMass(tankData.tanks).totalMass;
  const averageUtilization = volumeCalculations.getAverageUtilization(tankData.tanks);
  const activeTanks = tankData.tanks.filter(tank =>
    tank.trend && tank.trend !== 'stable'
  ).length;

  return {
    ...tankData,
    totalVolume,
    totalMass,
    averageUtilization,
    activeTanks,
    isLoading,
    error,
    refetch: fetchTankData
  };
};