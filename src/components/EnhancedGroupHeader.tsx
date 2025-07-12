import React, { useState, useEffect } from 'react';
import { Tank } from '../types/tank';
import { Product } from '../types/product';
import { TankTotalsService, GroupTotals } from '../services/TankTotalsService';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EnhancedGroupHeaderProps {
  groupId: string;
  tanks: Tank[];
  products?: Product[];
}

export const EnhancedGroupHeader: React.FC<EnhancedGroupHeaderProps> = ({ 
  groupId, 
  tanks, 
  products = [] 
}) => {
  const [totalsService] = useState(() => new TankTotalsService());
  const [groupTotals, setGroupTotals] = useState<GroupTotals | null>(null);

  // Calculate group totals whenever tanks data changes
  useEffect(() => {
    if (tanks.length > 0) {
      const totals = totalsService.calculateGroupTotals(tanks, groupId, products);
      setGroupTotals(totals);
    }
  }, [tanks, groupId, products, totalsService]);

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
      return '0.0';
    }
    const sign = flowRate >= 0 ? '+' : '';
    return `${sign}${flowRate.toFixed(1)}`;
  };

  if (!groupTotals || groupTotals.tankCount === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-800">{groupTotals.groupName}</h3>
          <div className="h-px bg-gray-300 flex-1 mx-4"></div>
          <span className="text-sm text-gray-500">{groupTotals.tankCount} tanks</span>
        </div>
        
        {/* Group Totals */}
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-sm text-gray-600">Volume</div>
            <div className="text-lg font-bold text-blue-600">
              {groupTotals.totalVolume.toFixed(1)} m³
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-600">Weight</div>
            <div className="text-lg font-bold text-green-600">
              {groupTotals.totalMetricTons.toFixed(1)} MT
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-600">Avg Fill</div>
            <div className="text-lg font-bold text-purple-600">
              {groupTotals.averageFillPercentage.toFixed(1)}%
            </div>
          </div>
          
          {groupTotals.averageTemperature !== null && (
            <div className="text-center">
              <div className="text-sm text-gray-600">Avg Temp</div>
              <div className="text-lg font-bold text-blue-600">
                {groupTotals.averageTemperature.toFixed(1)}°C
              </div>
            </div>
          )}
          
          <div className="text-center">
            <div className="text-sm text-gray-600">Trend</div>
            <div className="flex items-center justify-center space-x-1">
              {getTrendIcon(groupTotals.trend)}
              <span className="text-sm font-medium text-gray-700">
                {getFlowRateDisplay(groupTotals.flowRate)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
