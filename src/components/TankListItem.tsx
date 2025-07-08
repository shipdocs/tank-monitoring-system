import React from 'react';
import { type Tank } from '../types/tank';
import { AlertTriangle, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  getStatusColor,
  getStatusText,
  getTankPercentage,
  getTrendColor,
  getTrendIcon,
  getTrendSpeed,
  getTrendText,
  isAlarmState,
} from '../utils/tankDisplay';

interface TankListItemProps {
  tank: Tank;
}

export const TankListItem: React.FC<TankListItemProps> = ({ tank }) => {
  // Helper function to render trend icon based on icon info
  const renderTrendIcon = (trend: Tank['trend']) => {
    const iconInfo = getTrendIcon(trend);
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
      className={`bg-white rounded-lg shadow-sm p-4 border-2 transition-all duration-300 hover:shadow-md ${
        isAlarm ? 'border-red-300' : 'border-gray-200'
      }`}
      aria-label={`Tank ${tank.name}`}
      role="region"
      aria-live={isAlarm ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div className="flex items-center justify-between">
        {/* Tank Info */}
        <div className="flex items-center space-x-4 flex-1">
          <div className="flex items-center space-x-3">
            <div
              className={`w-4 h-4 rounded-full ${getStatusColor(tank.status)}`}
              role="status"
              aria-label={`Status: ${getStatusText(tank.status)}`}
            ></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{tank.name}</h3>
              <p className="text-sm text-gray-600">Location: {tank.location}</p>
            </div>
          </div>

          {/* Level Display */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-1 max-w-xs">
              <div className="flex justify-between text-sm text-gray-600 mb-1" aria-hidden="true">
                <span>Level</span>
                <span>{Math.max(0, percentage).toFixed(1)}%</span>
              </div>
              <div
                className="w-full bg-gray-200 rounded-full h-3 overflow-hidden"
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Tank fill level: ${percentage.toFixed(1)} percent`}
              >
                <div
                  className={`h-full transition-all duration-500 ${getStatusColor(tank.status)}`}
                  style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }}
                  aria-hidden="true"
                ></div>
              </div>
            </div>

            <div className="text-right" role="status" aria-label={`Current level: ${tank.currentLevel.toFixed(0)} millimeters, ${percentage.toFixed(1)} percent full${tank.temperature !== undefined ? `, Temperature: ${tank.temperature.toFixed(1)} degrees Celsius` : ''}`}>
              <div className="text-xl font-bold text-gray-900" aria-hidden="true">
                {tank.currentLevel.toFixed(0)} mm
              </div>
              <div className="text-sm text-gray-500" aria-hidden="true">
                {percentage.toFixed(1)}%
              </div>
              {tank.temperature !== undefined && (
                <div className="text-sm text-blue-600 font-medium" aria-hidden="true">
                  {tank.temperature.toFixed(1)}°C
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-end space-x-4">
          <div className="text-right">
            <div
              className={`text-sm font-medium ${
                isAlarm ? 'text-red-600' : 'text-green-600'
              }`}
              role="status"
              aria-label={`Status: ${getStatusText(tank.status)}`}
            >
              <span aria-hidden="true">{getStatusText(tank.status)}</span>
            </div>
            <div className="text-xs text-gray-500" aria-label={`Last updated: ${new Date(tank.lastUpdated).toLocaleTimeString()}`}>
              <span aria-hidden="true">{new Date(tank.lastUpdated).toLocaleTimeString()}</span>
            </div>
          </div>

          {isAlarm && (
            <AlertTriangle className="w-5 h-5 text-red-500" aria-label="Warning: Attention required" role="img" />
          )}
        </div>

        {/* Trend Indicator */}
        {tank.trend && (
          <div className="flex justify-center mt-2">
            <div
              className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium ${getTrendColor(tank.trend, tank.trendValue || 0)}`}
              role="status"
              aria-label={`Trend: ${getTrendText(tank.trend)}${tank.trendValue && tank.trendValue > 0 ? `, speed: ${getTrendSpeed(tank.trend, tank.trendValue)}` : ''}`}
            >
              {renderTrendIcon(tank.trend)}
              <span aria-hidden="true">{getTrendText(tank.trend)}</span>
              {tank.trendValue && tank.trendValue > 0 && (
                <span className="text-xs font-mono font-semibold" aria-hidden="true">
                  {getTrendSpeed(tank.trend, tank.trendValue)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
