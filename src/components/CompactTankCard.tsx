import React from 'react';
import { type Tank } from '../types/tank';
import { AlertTriangle, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  getStatusColor,
  getTankPercentage,
  getTrendIcon,
  isAlarmState,
} from '../utils/tankDisplay';

interface CompactTankCardProps {
  tank: Tank;
}

export const CompactTankCard: React.FC<CompactTankCardProps> = ({ tank }) => {
  // Helper function to render trend icon based on icon info
  const renderTrendIcon = (trend: Tank['trend']) => {
    const iconInfo = getTrendIcon(trend, 'small');
    const ariaLabel = trend === 'rising' ? 'Rising trend' : trend === 'falling' ? 'Falling trend' : 'Stable';
    switch (iconInfo.name) {
      case 'TrendingUp': return <TrendingUp className={iconInfo.className} aria-label={ariaLabel} role="img" />;
      case 'TrendingDown': return <TrendingDown className={iconInfo.className} aria-label={ariaLabel} role="img" />;
      case 'Minus': return <Minus className={iconInfo.className} aria-label={ariaLabel} role="img" />;
      default: return <Minus className={iconInfo.className} aria-label={ariaLabel} role="img" />;
    }
  };

  // Calculate percentage based on configured max height, not max capacity
  const percentage = getTankPercentage(tank.currentLevel, tank.maxCapacity);
  const isAlarm = isAlarmState(tank.status);

  return (
    <article
      className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-300 hover:shadow-md ${
        isAlarm ? 'border-red-300' : 'border-gray-200'
      }`}
      aria-label={`Tank ${tank.name}`}
      role="region"
      aria-live={isAlarm ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {/* Compact Header */}
      <div className="bg-gray-50 px-3 py-2 rounded-t-lg border-b">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">{tank.name}</h4>
          <div className="flex items-center space-x-1">
            <div
              className={`w-2 h-2 rounded-full ${getStatusColor(tank.status)}`}
              role="status"
              aria-label={`Status: ${tank.status}`}
            ></div>
            {tank.trend && renderTrendIcon(tank.trend)}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Level Display */}
        <div className="text-center" role="status" aria-label={`Current level: ${tank.currentLevel.toFixed(0)} millimeters, ${Math.max(0, percentage).toFixed(1)} percent full`}>
          <div className="text-lg font-bold text-gray-800" aria-hidden="true">
            {tank.currentLevel.toFixed(0)} <span className="text-xs text-gray-500">mm</span>
          </div>
          <div className="text-sm font-medium text-blue-600" aria-hidden="true">
            {Math.max(0, percentage).toFixed(1)}%
          </div>
        </div>

        {/* Progress Bar */}
        <div
          className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={'Tank fill level'}
        >
          <div
            className={`h-full transition-all duration-500 ${getStatusColor(tank.status)}`}
            style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }}
            aria-hidden="true"
          ></div>
        </div>

        {/* Additional Info */}
        <div className="flex justify-between text-xs text-gray-500" aria-hidden="true">
          <span>0 mm</span>
          <span>{tank.maxCapacity} mm</span>
        </div>

        {/* Status and Location */}
        <div className="text-xs text-gray-600 text-center">
          <div className="font-medium" aria-label={`Location: ${tank.location}`}>{tank.location}</div>
          {tank.temperature !== undefined && (
            <div className="text-blue-600" aria-label={`Temperature: ${tank.temperature.toFixed(1)} degrees Celsius`}>{tank.temperature.toFixed(1)}°C</div>
          )}
        </div>

        {/* Alarm indicator */}
        {isAlarm && (
          <div className="flex items-center justify-center space-x-1 p-1 bg-red-50 rounded text-red-600" role="alert" aria-live="assertive">
            <AlertTriangle className="w-3 h-3" aria-label="Warning" role="img" />
            <span className="text-xs font-medium">Alert</span>
          </div>
        )}
      </div>
    </article>
  );
};
