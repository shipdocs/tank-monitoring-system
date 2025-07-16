import React, { useState, useEffect } from 'react';
import { Tank } from '../types/tank';
import { Product } from '../types/product';
import { TankTotalsService, GroupTotals } from '../services/TankTotalsService';
import { FlowRateConfigurationService } from '../services/FlowRateConfigurationService';
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
  const [flowRateConfigService] = useState(() => FlowRateConfigurationService.getInstance());
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
    // Use centralized formatting but remove units for compact display
    const formatted = flowRateConfigService.formatFlowRate(flowRate);
    return formatted.replace(' m³/h', ''); // Remove units for compact display
  };

  if (!groupTotals || groupTotals.tankCount === 0) {
    return null;
  }

  return (
    <div className="bg-gray-100 border border-gray-400 rounded-sm p-2 mb-2 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-black text-gray-900">{groupTotals.groupName}</h3>
          <div className="h-px bg-gray-500 flex-1 mx-2"></div>
          <span className="text-xs font-bold text-gray-700 bg-gray-200 px-1 py-0.5 rounded">
            {groupTotals.tankCount}
          </span>
        </div>

        {/* Ultra Compact Group Totals */}
        <div className="flex items-center space-x-3">
          <div className="text-center">
            <div className="text-xs font-bold text-gray-700">VOL</div>
            <div className="text-xs font-black text-blue-800">
              {groupTotals.totalVolume.toFixed(0)} m³
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs font-bold text-gray-700">MT</div>
            <div className="text-xs font-black text-green-800">
              {groupTotals.totalMetricTons.toFixed(0)} MT
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs font-bold text-gray-700">FILL</div>
            <div className="text-xs font-black text-purple-800">
              {groupTotals.averageFillPercentage.toFixed(0)}%
            </div>
          </div>

          {groupTotals.averageTemperature !== null && (
            <div className="text-center">
              <div className="text-xs font-bold text-gray-700">TEMP</div>
              <div className="text-xs font-black text-blue-800">
                {groupTotals.averageTemperature.toFixed(0)}°C
              </div>
            </div>
          )}

          <div className="text-center">
            <div className="text-xs font-bold text-gray-700">FLOW</div>
            <div className="flex items-center justify-center space-x-0.5">
              {getTrendIcon(groupTotals.trend)}
              <span className="text-xs font-black text-gray-900">
                {getFlowRateDisplay(groupTotals.flowRate)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
