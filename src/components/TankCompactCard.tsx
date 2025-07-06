import React from 'react';
import { Tank } from '../types/tank';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TankCompactCardProps {
  tank: Tank;
}

export const TankCompactCard: React.FC<TankCompactCardProps> = ({ tank }) => {
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

  const getTrendColor = (trend: Tank['trend']) => {
    switch (trend) {
      case 'loading': return 'text-green-600';
      case 'unloading': return 'text-red-600';
      case 'stable': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  // Calculate percentage based on configured max height, not max capacity
  const percentage = tank.maxCapacity > 0 ? (tank.currentLevel / tank.maxCapacity) * 100 : 0;
  const isAlarm = tank.status === 'low' || tank.status === 'high' || tank.status === 'critical';

  return (
    <div className={`bg-white rounded-lg shadow-sm p-3 border-2 transition-all duration-300 hover:shadow-md ${
      isAlarm ? 'border-red-300 animate-pulse' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-800 truncate">{tank.name}</h3>
        <div className="flex items-center space-x-1">
          {tank.trend && (
            <div className={`${getTrendColor(tank.trend)}`} title={`${tank.trend} ${tank.trendValue?.toFixed(1) || ''} ${tank.unit}/min`}>
              {getTrendIcon(tank.trend)}
            </div>
          )}
          <div className={`w-2 h-2 rounded-full ${getStatusColor(tank.status)}`}></div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">
            {tank.currentLevel.toFixed(0)} mm
          </div>
          <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
          {tank.temperature !== undefined && (
            <div className="text-xs text-blue-600 font-medium">
              {tank.temperature.toFixed(1)}°C
            </div>
          )}
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getStatusColor(tank.status)}`}
            style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>0 mm</span>
          <span>{Math.max(0, percentage).toFixed(0)}%</span>
          <span>{tank.maxCapacity} mm</span>
        </div>
        
        <div className="text-xs text-gray-500 text-center truncate">
          {tank.location}
        </div>
        
        {isAlarm && (
          <div className="flex items-center justify-center">
            <AlertTriangle className="w-3 h-3 text-red-500" />
          </div>
        )}
      </div>
    </div>
  );
};
