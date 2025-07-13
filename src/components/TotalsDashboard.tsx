import React, { useState, useEffect } from 'react';
import { Tank } from '../types/tank';
import { Product } from '../types/product';
import { TankTotalsService, GrandTotals, SetpointCalculation } from '../services/TankTotalsService';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';

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
    <div className="bg-white rounded-sm shadow-sm border border-gray-300 p-1.5 mb-2">
      {/* Minimal Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-bold text-gray-900">VESSEL OVERVIEW</h2>
        <div className="text-xs text-gray-600">
          {grandTotals.lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* Minimal Grand Totals Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5 mb-1">
        {/* Total Volume - Ultra Compact */}
        <div className="bg-blue-900 border border-blue-700 rounded-sm p-1.5 text-white text-center shadow">
          <div className="text-xs font-bold text-blue-200">VOL</div>
          <div className="text-sm font-black text-white">{grandTotals.totalVolume.toFixed(1)} m³</div>
        </div>

        {/* Total Metric Tons - Ultra Compact */}
        <div className="bg-green-900 border border-green-700 rounded-sm p-1.5 text-white text-center shadow">
          <div className="text-xs font-bold text-green-200">WT</div>
          <div className="text-sm font-black text-white">{grandTotals.totalMetricTons.toFixed(1)} MT</div>
        </div>

        {/* Setpoint Target - Larger Input */}
        <div className="bg-purple-900 border border-purple-700 rounded-sm p-1.5 text-white text-center shadow">
          <div className="text-xs font-bold text-purple-200">TARGET</div>
          <div className="flex items-center justify-center space-x-1">
            <input
              type="number"
              value={targetVolume}
              onChange={(e) => handleTargetVolumeChange(e.target.value)}
              className="bg-white text-black border border-purple-300 rounded px-2 py-1 text-center text-sm font-black w-24"
              placeholder="12500"
              min="0"
              step="10"
            />
            <span className="text-sm font-black">m³</span>
          </div>
        </div>

        {/* Time to Complete - Larger Display */}
        <div className="bg-orange-900 border border-orange-700 rounded-sm p-2 text-white text-center shadow">
          <div className="text-xs font-bold text-orange-200">ETC</div>
          <div className="text-base font-black">
            {totalsService.formatTimeRemaining(setpointCalc.timeRemainingMinutes)}
          </div>
          <div className="text-xs font-bold text-orange-200">
            {totalsService.formatEstimatedCompletionTime(setpointCalc.estimatedCompletionTime)}
          </div>
        </div>
      </div>
      
      {/* Ultra Compact Progress Bar */}
      <div className="bg-gray-800 border border-gray-600 rounded-sm h-3 mb-2 relative shadow-inner">
        <div
          className="bg-gradient-to-r from-blue-600 to-purple-600 h-full rounded-sm relative transition-all duration-500"
          style={{ width: `${Math.min(setpointCalc.progressPercentage, 100)}%` }}
        >
          <div className="absolute right-0.5 top-0 h-full flex items-center">
            <span className="text-xs font-black text-white drop-shadow">
              {setpointCalc.progressPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
        {setpointCalc.progressPercentage < 100 && (
          <div className="absolute right-0.5 top-0 h-full flex items-center">
            <span className="text-xs font-black text-gray-200 drop-shadow">
              {targetVolume.toFixed(0)} m³
            </span>
          </div>
        )}
      </div>

      {/* Enhanced Status Indicators */}
      <div className="flex justify-between items-center text-xs font-bold">
        <div className="flex items-center space-x-1">
          {getTrendIcon(grandTotals.trend)}
          <span className="text-gray-900 text-xs">
            {grandTotals.trend === 'loading' ? 'LOAD' :
             grandTotals.trend === 'unloading' ? 'UNLOAD' : 'STABLE'}: {getFlowRateDisplay(grandTotals.flowRate)}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <span className="text-gray-900 text-xs">{grandTotals.activeTankCount} ACT</span>
        </div>

        <div className="flex items-center space-x-1 bg-yellow-100 px-2 py-1 rounded border border-yellow-400">
          <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
          <span className="text-gray-900 text-sm font-black">
            REM: {Math.abs(setpointCalc.remainingVolume).toFixed(0)} m³
          </span>
        </div>
      </div>

      {/* Status Messages - Ultra Compact Fixed Height */}
      <div className="mt-1 h-5 flex items-center">
        {setpointCalc.remainingVolume !== 0 && !setpointCalc.timeRemainingMinutes && (
          <div className="w-full p-1 bg-yellow-100 border border-yellow-600 rounded-sm">
            <div className="flex items-center space-x-1">
              <Target className="w-2 h-2 text-yellow-800" />
              <span className="text-xs text-yellow-900 font-bold">
                {setpointCalc.isLoading ? 'NO LOAD FLOW' : 'NO UNLOAD FLOW'}
              </span>
            </div>
          </div>
        )}

        {setpointCalc.progressPercentage >= 100 && (
          <div className="w-full p-1 bg-green-100 border border-green-600 rounded-sm">
            <div className="flex items-center space-x-1">
              <Target className="w-2 h-2 text-green-800" />
              <span className="text-xs text-green-900 font-black">
                🎯 TARGET REACHED: {setpointCalc.currentVolume.toFixed(0)} m³
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
