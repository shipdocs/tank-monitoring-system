import React, { useState, useEffect } from 'react';
import { Tank } from '../types/tank';
import { Product } from '../types/product';
import { TankTotalsService, GrandTotals, SetpointCalculation } from '../services/TankTotalsService';
import { TrendingUp, TrendingDown, Minus, Clock, Target } from 'lucide-react';

interface TotalsDashboardProps {
  tanks: Tank[];
  products?: Product[];
}

export const TotalsDashboard: React.FC<TotalsDashboardProps> = ({ 
  tanks, 
  products = [] 
}) => {
  const [totalsService] = useState(() => new TankTotalsService());
  const [targetVolume, setTargetVolume] = useState<number>(1500);
  const [grandTotals, setGrandTotals] = useState<GrandTotals | null>(null);
  const [setpointCalc, setSetpointCalc] = useState<SetpointCalculation | null>(null);

  // Calculate totals whenever tanks data changes
  useEffect(() => {
    if (tanks.length > 0) {
      const totals = totalsService.calculateGrandTotals(tanks, products);
      setGrandTotals(totals);

      const setpoint = totalsService.calculateSetpointProgress(totals, targetVolume);
      setSetpointCalc(setpoint);
    }
  }, [tanks, products, targetVolume, totalsService]);

  // Handle target volume change
  const handleTargetVolumeChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setTargetVolume(numValue);
  };

  const getTrendIcon = (trend: 'loading' | 'unloading' | 'stable') => {
    switch (trend) {
      case 'loading':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'unloading':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getFlowRateDisplay = (flowRate: number): string => {
    if (Math.abs(flowRate) < 0.1) {
      return '0.0 m³/h';
    }
    const sign = flowRate >= 0 ? '+' : '';
    return `${sign}${flowRate.toFixed(1)} m³/h`;
  };

  if (!grandTotals || !setpointCalc) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="text-center text-gray-500">
          Loading totals...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Vessel Overview</h2>
      
      {/* Grand Totals Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Total Volume */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white text-center">
          <div className="text-sm opacity-90 mb-1">Total Volume</div>
          <div className="text-2xl font-bold">{grandTotals.totalVolume.toFixed(1)} m³</div>
          <div className="text-xs opacity-75">All Tanks</div>
        </div>
        
        {/* Total Metric Tons */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white text-center">
          <div className="text-sm opacity-90 mb-1">Total Weight</div>
          <div className="text-2xl font-bold">{grandTotals.totalMetricTons.toFixed(1)} MT</div>
          <div className="text-xs opacity-75">Metric Tons</div>
        </div>
        
        {/* Setpoint Target */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white text-center">
          <div className="text-sm opacity-90 mb-1">Target Volume</div>
          <div className="flex items-center justify-center space-x-2">
            <input 
              type="number" 
              value={targetVolume} 
              onChange={(e) => handleTargetVolumeChange(e.target.value)}
              className="bg-white/20 border border-white/30 rounded px-2 py-1 text-center text-lg font-bold w-20 text-white placeholder-white/70"
              placeholder="1500"
              min="0"
              step="10"
            />
            <span className="text-lg font-bold">m³</span>
          </div>
          <div className="text-xs opacity-75">Setpoint</div>
        </div>
        
        {/* Time to Complete */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white text-center">
          <div className="text-sm opacity-90 mb-1">Time to Target</div>
          <div className="text-xl font-bold">
            {totalsService.formatTimeRemaining(setpointCalc.timeRemainingMinutes)}
          </div>
          <div className="text-xs opacity-75">
            ETC: {totalsService.formatEstimatedCompletionTime(setpointCalc.estimatedCompletionTime)}
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="bg-gray-200 rounded-full h-4 mb-4 relative">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full relative transition-all duration-500" 
          style={{ width: `${Math.min(setpointCalc.progressPercentage, 100)}%` }}
        >
          <div className="absolute right-2 top-0 h-full flex items-center">
            <span className="text-xs font-bold text-white">
              {setpointCalc.progressPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
        {setpointCalc.progressPercentage < 100 && (
          <div className="absolute right-2 top-0 h-full flex items-center">
            <span className="text-xs font-bold text-gray-600">
              {targetVolume.toFixed(0)} m³
            </span>
          </div>
        )}
      </div>
      
      {/* Status Indicators */}
      <div className="flex justify-center space-x-6 text-sm flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          {getTrendIcon(grandTotals.trend)}
          <span className="text-gray-600">
            {grandTotals.trend === 'loading' ? 'Loading' : 
             grandTotals.trend === 'unloading' ? 'Unloading' : 'Stable'}: {getFlowRateDisplay(grandTotals.flowRate)}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-gray-600">{grandTotals.activeTankCount} Tanks Active</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-gray-600">
            Remaining: {Math.abs(setpointCalc.remainingVolume).toFixed(1)} m³
          </span>
        </div>
        
        {setpointCalc.timeRemainingMinutes && (
          <div className="flex items-center space-x-2">
            <Clock className="w-3 h-3 text-purple-500" />
            <span className="text-gray-600">
              {setpointCalc.isLoading ? 'Loading' : 'Unloading'} Operation
            </span>
          </div>
        )}
      </div>

      {/* Warning Messages */}
      {setpointCalc.remainingVolume !== 0 && !setpointCalc.timeRemainingMinutes && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              {setpointCalc.isLoading 
                ? 'No loading flow detected. Time estimation unavailable.' 
                : 'No unloading flow detected. Time estimation unavailable.'}
            </span>
          </div>
        </div>
      )}

      {setpointCalc.progressPercentage >= 100 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800">
              🎉 Target volume reached! Current: {setpointCalc.currentVolume.toFixed(1)} m³
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
