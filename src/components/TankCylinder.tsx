import React from 'react';
import { type Tank } from '../types/tank';
import { AlertTriangle, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  getLevelColor,
  getStatusColor,
  getTankPercentage,
  getTrendColor,
  getTrendIcon,
  getTrendSpeed,
  getTrendText,
  isAlarmState,
  isCriticalState,
} from '../utils/tankDisplay';

interface TankCylinderProps {
  tank: Tank;
}

export const TankCylinder: React.FC<TankCylinderProps> = ({ tank }) => {
  // Calculate percentage based on configured max height, not max capacity
  const percentage = getTankPercentage(tank.currentLevel, tank.maxCapacity);
  const isAlarm = isCriticalState(tank.status) || tank.status === 'low';

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

  return (
    <article
      className={`bg-white rounded-lg shadow-lg p-6 border-2 transition-all duration-300 hover:shadow-xl w-full min-h-[500px] flex flex-col ${
        isAlarm ? 'border-red-300 animate-pulse' : 'border-gray-200'
      }`}
      aria-label={`Tank ${tank.name}`}
      role="region"
      aria-live={isAlarm ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {/* Tank Name and Status */}
      <div className="flex items-center justify-between mb-4 h-6">
        <h3 className="text-base font-semibold text-gray-800 truncate flex-1">{tank.name}</h3>
        <div
          className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(tank.status)}`}
          role="status"
          aria-label={`Status: ${tank.status}`}
        ></div>
      </div>

      {/* Tank Cylinder Visualization */}
      <div
        className="flex flex-col items-center mb-6 flex-1 justify-center"
        role="img"
        aria-label={`Tank visualization showing ${Math.max(0, percentage).toFixed(0)} percent full`}
      >
        {/* Tank Top */}
        <div className="w-24 h-4 bg-gray-300 rounded-t-full border-2 border-gray-400" aria-hidden="true"></div>

        {/* Tank Body */}
        <div
          className="relative w-24 h-64 bg-gray-200 border-l-2 border-r-2 border-gray-400"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tank fill level"
        >
          {/* Liquid Level */}
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${getLevelColor(tank.status)}`}
            style={{ height: `${Math.max(0, Math.min(percentage, 100))}%` }}
            aria-hidden="true"
          ></div>

          {/* Level Percentage Text */}
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span
              className="text-lg font-bold text-white"
              style={{
                textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 2px 0 #000, 0 -2px 0 #000, 2px 0 0 #000, -2px 0 0 #000',
              }}
            >
              {Math.max(0, percentage).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Tank Bottom */}
        <div className="w-24 h-4 bg-gray-300 rounded-b-full border-2 border-gray-400" aria-hidden="true"></div>
      </div>

      {/* Tank Details - Fixed Height */}
      <div className="text-center space-y-2 h-24 flex flex-col justify-center">
        <div className="text-lg font-bold text-gray-900" role="status" aria-label={`Current level: ${tank.currentLevel.toFixed(0)} millimeters`}>
          {tank.currentLevel.toFixed(0)} mm
        </div>
        <div className="text-base text-gray-500" aria-label={`${percentage.toFixed(1)} percent full`}>
          {percentage.toFixed(1)}%
        </div>
        {tank.temperature !== undefined && (
          <div className="text-sm text-blue-600 font-medium" aria-label={`Temperature: ${tank.temperature.toFixed(1)} degrees Celsius`}>
            {tank.temperature.toFixed(1)}°C
          </div>
        )}
        <div className="text-sm text-gray-600 truncate" aria-label={`Location: ${tank.location}`}>
          {tank.location}
        </div>
      </div>

      {/* Trend Indicator - Fixed Height */}
      <div className="flex justify-center h-10 items-center">
        {tank.trend ? (
          <div
            className={`flex items-center justify-center space-x-1 px-3 py-1 rounded-full text-sm font-medium min-w-[90px] ${getTrendColor(tank.trend, tank.trendValue || 0)}`}
            role="status"
            aria-label={`Trend: ${getTrendText(tank.trend)}${tank.trendValue && tank.trendValue > 0 ? `, speed: ${getTrendSpeed(tank.trend, tank.trendValue)}` : ''}`}
          >
            {renderTrendIcon(tank.trend)}
            <span className="w-14 text-center" aria-hidden="true">{getTrendText(tank.trend)}</span>
            {tank.trendValue && tank.trendValue > 0 && (
              <span className="text-xs font-mono font-semibold" aria-hidden="true">
                {getTrendSpeed(tank.trend, tank.trendValue).replace(' mm/min', '')}
              </span>
            )}
          </div>
        ) : (
          <div className="h-8" aria-hidden="true"></div>
        )}
      </div>

      {/* Alarm Indicator - Fixed Height */}
      <div className="flex justify-center h-8 items-center">
        {isAlarm && (
          <AlertTriangle className="w-5 h-5 text-red-500" aria-label="Warning: Attention required" role="img" />
        )}
      </div>
    </article>
  );
};
