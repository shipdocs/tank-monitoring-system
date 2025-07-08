import React from 'react';
import { type Tank } from '../types/tank';
import { AlertTriangle, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  getStatusColor,
  getTankPercentage,
  getTrendColor,
  getTrendIcon,
  getTrendSpeed,
  isAlarmState,
} from '../utils/tankDisplay';

interface TankCompactCardProps {
  tank: Tank;
}

export const TankCompactCard: React.FC<TankCompactCardProps> = ({ tank }) => {
  // Helper function to render trend icon based on icon info
  const renderTrendIcon = (trend: Tank['trend']) => {
    const iconInfo = getTrendIcon(trend, 'small');
    switch (iconInfo.name) {
      case 'TrendingUp': return <TrendingUp className={iconInfo.className} />;
      case 'TrendingDown': return <TrendingDown className={iconInfo.className} />;
      case 'Minus': return <Minus className={iconInfo.className} />;
      default: return <Minus className={iconInfo.className} />;
    }
  };

  // Get color classes without background (for inline display)
  const getTrendColorText = (trend: Tank['trend'], speed: number = 0) => {
    const color = getTrendColor(trend, speed);
    // Extract just the text color class
    const match = color.match(/(text-\S+)/);
    return match ? match[1] : 'text-gray-500';
  };

  // Calculate percentage based on configured max height, not max capacity
  const percentage = getTankPercentage(tank.currentLevel, tank.maxCapacity);
  const isAlarm = isAlarmState(tank.status);

  return (
    <div className={`bg-white rounded-lg shadow-sm p-3 border-2 transition-all duration-300 hover:shadow-md ${
      isAlarm ? 'border-red-300 animate-pulse' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-800 truncate">{tank.name}</h3>
        <div className="flex items-center space-x-1">
          {tank.trend && (
            <div className={`${getTrendColorText(tank.trend, tank.trendValue || 0)}`} title={`${tank.trend} ${tank.trendValue?.toFixed(1) || ''} mm/min`}>
              {renderTrendIcon(tank.trend)}
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

        {/* Trend indicator */}
        {tank.trend && tank.trend !== 'stable' && (
          <div className={`flex items-center justify-center space-x-1 ${getTrendColor(tank.trend, tank.trendValue || 0)}`}>
            {renderTrendIcon(tank.trend)}
            <span className="text-xs font-mono font-semibold">
              {getTrendSpeed(tank.trend, tank.trendValue).replace(' mm/min', '')}
            </span>
          </div>
        )}

        {isAlarm && (
          <div className="flex items-center justify-center">
            <AlertTriangle className="w-3 h-3 text-red-500" />
          </div>
        )}
      </div>
    </div>
  );
};
