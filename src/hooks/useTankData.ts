import { useState, useEffect, useMemo } from 'react';
import { Tank, TankData } from '../types/tank';
import { EnhancedTank } from '../types/tankTable';
import { EnhancedTankDataService } from '../services/EnhancedTankDataService';

// Raw measurement interface from server
interface RawMeasurement {
  index: number;
  currentLevel: number;
  temperature: number;
  lastUpdated: string;
}

// Helper function to calculate trend
const calculateTrend = (currentLevel: number, previousLevel: number): { trend: Tank['trend'], trendValue: number } => {
  const difference = currentLevel - previousLevel;
  const threshold = 0.5; // Minimum change to consider as trend

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

export const useTankData = () => {
  const [tankData, setTankData] = useState<TankData>({
    tanks: [],
    lastSync: new Date(),
    connectionStatus: 'disconnected',
  });

  const enhancedDataService = useMemo(() => new EnhancedTankDataService(), []);

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

          // Enhance with tank table data
          const enhancedTanks = enhancedDataService.enhanceTankData(basicTanks);

          setTankData(prev => {
            // Calculate trends by comparing with previous data
            const tanksWithTrends = enhancedTanks.map((newTank: EnhancedTank) => {
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

        } else {
          throw new Error('Failed to fetch tank data from server');
        }
      } catch (error) {
        console.error('❌ Error fetching tank data:', error.message);

        // Fallback: Create mock tank data and enhance with tank table data
        console.log('🔄 Creating fallback tank data for tank table integration...');
        const mockTanks: Tank[] = Array.from({ length: 12 }, (_, index) => ({
          id: index + 1,
          name: `Tank ${index + 1}`,
          currentLevel: 500 + (index * 50), // Mock levels
          maxCapacity: 1000,
          minLevel: 0,
          maxLevel: 1000,
          unit: 'mm',
          status: 'normal' as const,
          lastUpdated: new Date(),
          location: `Location ${index + 1}`,
          temperature: 20 + (index % 5) // Mock temperatures
        }));

        // Enhance mock tanks with tank table data
        const enhancedTanks = enhancedDataService.enhanceTankData(mockTanks);

        if (enhancedTanks.length > 0) {
          console.log(`✅ Created ${enhancedTanks.length} enhanced tanks from tank table data`);
          setTankData(() => ({
            tanks: enhancedTanks.map((tank: EnhancedTank) => ({
              ...tank,
              trend: 'stable' as const,
              trendValue: 0,
              previousLevel: tank.currentLevel
            })),
            lastSync: new Date(),
            connectionStatus: 'disconnected' // Still disconnected, but we have tank table data
          }));
        } else {
          setTankData(prev => ({
            ...prev,
            connectionStatus: 'disconnected'
          }));
        }
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
  }, [enhancedDataService]); // Include enhancedDataService in dependency array

  return tankData;
};