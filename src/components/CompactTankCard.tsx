import React from 'react';
import { Tank } from '../types/tank';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CompactTankCardProps {
  tank: Tank;
}

export const CompactTankCard: React.FC<CompactTankCardProps> = ({ tank }) => {
  const getStatusColor = (status: Tank['status']) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'low': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIcon = (trend: Tank['trend']) => {
    switch (trend) {
      case 'loading': return <TrendingUp className="w-3 h-3 text-green-600" />;
      case 'unloading': return <TrendingDown className="w-3 h-3 text-red-600" />;
      case 'stable': return <Minus className="w-3 h-3 text-gray-500" />;
      default: return <Minus className="w-3 h-3 text-gray-400" />;
    }
  };

  const percentage = (tank.currentLevel / tank.maxCapacity) * 100;
  const isAlarm = tank.status === 'low' || tank.status === 'high' || tank.status === 'critical';

  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-300 hover:shadow-md ${
      isAlarm ? 'border-red-300' : 'border-gray-200'
    }`}>
      {/* Compact Header */}
      <div className="bg-gray-50 px-3 py-2 rounded-t-lg border-b">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">{tank.name}</h4>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(tank.status)}`}></div>
            {tank.trend && getTrendIcon(tank.trend)}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Level Display */}
        <div className="text-center">
          <div className="text-lg font-bold text-gray-800">
            {tank.currentLevel.toFixed(0)} <span className="text-xs text-gray-500">mm</span>
          </div>
          <div className="text-sm font-medium text-blue-600">
            {percentage.toFixed(1)}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${getStatusColor(tank.status)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>

        {/* Additional Info */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>{tank.maxCapacity}</span>
        </div>

        {/* Status and Location */}
        <div className="text-xs text-gray-600 text-center">
          <div className="font-medium">{tank.location}</div>
          {tank.temperature !== undefined && (
            <div className="text-blue-600">{tank.temperature.toFixed(1)}°C</div>
          )}
        </div>

        {/* Alarm indicator */}
        {isAlarm && (
          <div className="flex items-center justify-center space-x-1 p-1 bg-red-50 rounded text-red-600">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs font-medium">Alert</span>
          </div>
        )}
      </div>
    </div>
  );
};
