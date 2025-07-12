import React, { useMemo } from 'react';
import { TimeTableView } from '../components/TimeTableView';
import { EnhancedTank } from '../types/tankTable';
import { TankOperationalData } from '../types/product';

/**
 * Example usage of TimeTableView component
 * 
 * This example demonstrates how to integrate the TimeTableView with your tank monitoring system.
 * The operational data (setpoint, flow rate, temperature) would typically come from:
 * 1. User input forms for setpoints
 * 2. Real-time sensor data for flow rates and temperatures
 * 3. Tank trend calculations (trendValue can be used as flow rate)
 */
export const TimeTableViewExample: React.FC<{
  tanks: EnhancedTank[];
}> = ({ tanks }) => {
  
  // Generate operational data from tank trends
  // In a real application, this would come from:
  // - User-defined setpoints stored in a database or state management
  // - Real-time flow rate measurements from sensors
  // - Temperature readings from tank sensors
  const operationalData = useMemo(() => {
    const data = new Map<string, TankOperationalData>();
    
    tanks.forEach(tank => {
      // Only create operational data for tanks with active trends
      if (tank.trend && tank.trend !== 'stable' && tank.trendValue) {
        // Convert trend to flow rate
        // Loading (filling) = positive flow rate
        // Unloading (emptying) = negative flow rate
        const flowRate = tank.trend === 'loading' 
          ? Math.abs(tank.trendValue) 
          : -Math.abs(tank.trendValue);
        
        // Calculate a reasonable setpoint based on current operation
        let setpoint = 0;
        if (tank.trend === 'loading') {
          // If loading, set target to 90% of max capacity
          setpoint = (tank.max_volume_liters || tank.maxCapacity) * 0.9;
        } else if (tank.trend === 'unloading') {
          // If unloading, set target to 10% of max capacity
          setpoint = (tank.max_volume_liters || tank.maxCapacity) * 0.1;
        }
        
        data.set(tank.id.toString(), {
          temperature: tank.temperature || 0, // Only use actual temperature, 0 if none available
          setpoint: setpoint,
          flowRate: flowRate
        });
      }
    });
    
    return data;
  }, [tanks]);
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Tank Operations Time Table</h1>
      
      <TimeTableView
        tanks={tanks}
        operationalData={operationalData}
      />
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Integration Notes:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Flow rates are derived from tank trend values (loading/unloading rates)</li>
          <li>• Setpoints should be user-configurable through a form or settings panel</li>
          <li>• Temperature data should come from real-time tank sensors</li>
          <li>• The table auto-refreshes every 30 seconds to show updated completion times</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Alternative integration with user-defined operational data
 * 
 * This shows how you might integrate with a form-based system where users
 * manually set operational parameters for each tank
 */
export const TimeTableViewWithUserData: React.FC<{
  tanks: EnhancedTank[];
  products: Product[];
  userOperationalSettings: Map<string, {
    targetVolume: number;
    pumpRate: number;
    productTemperature: number;
  }>;
}> = ({ tanks, products, userOperationalSettings }) => {
  
  // Convert user settings to operational data format
  const operationalData = useMemo(() => {
    const data = new Map<string, TankOperationalData>();
    
    userOperationalSettings.forEach((settings, tankId) => {
      // Find the tank to get current volume
      const tank = tanks.find(t => t.id.toString() === tankId);
      if (!tank) return;
      
      const currentVolume = tank.current_volume_liters || 0;
      
      // Determine flow rate direction based on target vs current
      const flowRate = settings.targetVolume > currentVolume 
        ? Math.abs(settings.pumpRate)  // Filling
        : -Math.abs(settings.pumpRate); // Emptying
      
      data.set(tankId, {
        temperature: settings.productTemperature,
        setpoint: settings.targetVolume,
        flowRate: flowRate
      });
    });
    
    return data;
  }, [tanks, userOperationalSettings]);
  
  return <TimeTableView tanks={tanks} operationalData={operationalData} products={products} />;
};