import { useState, useEffect } from 'react';
import { Tank, TankData } from '../types/tank';



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



  useEffect(() => {
    let updateInterval: NodeJS.Timeout | null = null;

    // Simple data fetching function
    const fetchTankData = async () => {
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

        } else {
          throw new Error('Failed to fetch tank data from server');
        }
      } catch (error) {
        console.error('❌ Error fetching tank data:', error.message);
        setTankData(prev => ({
          ...prev,
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
  }, []); // Empty dependency array - run once on mount

  return tankData;
};