import React from 'react';
import { type Tank } from '../types/tank';
import { AlertTriangle, Clock, Minus, TrendingDown, TrendingUp } from 'lucide-react';
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
import { useTankAccessibility } from '../hooks/useTankAccessibility';

interface TankCardProps {
  tank: Tank;
  onActivate?: (tank: Tank) => void;
  onShowDetails?: (tank: Tank) => void;
  enableKeyboardNavigation?: boolean;
}

export const TankCard: React.FC<TankCardProps> = ({
  tank,
  onActivate,
  onShowDetails,
  enableKeyboardNavigation = true,
}) => {
  // Initialize accessibility hook
  const {
    containerRef,
    getAriaAttributes,
    getProgressAriaAttributes,
    getStatusAriaAttributes,
    getTrendAriaAttributes,
    focusContainer,
    isAlarmState: isAlarm,
  } = useTankAccessibility({
    tank,
    onActivate,
    onDetails: onShowDetails,
    enableKeyboardNavigation,
  });

  // Helper function to render trend icon based on icon info
  const renderTrendIcon = (trend: Tank['trend']) => {
    const iconInfo = getTrendIcon(trend);
    const ariaLabel = trend === 'loading' ? 'Loading trend' : trend === 'unloading' ? 'Unloading trend' : 'Stable';
    switch (iconInfo.name) {
      case 'TrendingUp': return <TrendingUp className={iconInfo.className} aria-label={ariaLabel} role="img" />;
      case 'TrendingDown': return <TrendingDown className={iconInfo.className} aria-label={ariaLabel} role="img" />;
      case 'Minus': return <Minus className={iconInfo.className} aria-label={ariaLabel} role="img" />;
      default: return <Minus className={iconInfo.className} aria-label={ariaLabel} role="img" />;
    }
  };

  // Calculate percentage based on configured max height, not max capacity
  const percentage = getTankPercentage(tank.currentLevel, tank.maxCapacity);

  return (
    <article
      ref={containerRef}
      className={`bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 focus:border-blue-500 ${
        isAlarm ? 'border-red-300 shadow-red-100' : 'border-gray-200'
      }`}
      {...getAriaAttributes()}
    >
      {/* Header with tank name and status */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{tank.name}</h3>
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${getStatusColor(tank.status)} ring-2 ring-white`}
              {...getStatusAriaAttributes()}
            ></div>
            <span className="text-sm font-medium text-blue-100" aria-hidden="true">
              {getStatusText(tank.status)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Main level display */}
        <div className="text-center" role="status" aria-label={`Current level: ${tank.currentLevel.toFixed(0)} millimeters, ${percentage.toFixed(1)} percent full`}>
          <div className="text-3xl font-bold text-gray-800 mb-1" aria-hidden="true">
            {tank.currentLevel.toFixed(0)} <span className="text-lg text-gray-500">mm</span>
          </div>
          <div className="text-lg font-semibold text-blue-600" aria-hidden="true">
            {percentage.toFixed(1)}%
          </div>
        </div>

        {/* Visual level indicator */}
        <div className="relative" {...getProgressAriaAttributes()}>
          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-700 ease-out ${getStatusColor(tank.status)} relative`}
              style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }}
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white opacity-30"></div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1" aria-hidden="true">
            <span>0</span>
            <span>{tank.maxCapacity} mm</span>
          </div>
        </div>

        {/* Additional info grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {tank.temperature !== undefined && (
            <div className="bg-blue-50 rounded-lg p-2 text-center" role="status" aria-label={`Temperature: ${tank.temperature.toFixed(1)} degrees Celsius`}>
              <div className="text-xs text-blue-600 font-medium" aria-hidden="true">Temperature</div>
              <div className="text-lg font-bold text-blue-700" aria-hidden="true">
                {tank.temperature.toFixed(1)}°C
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-2 text-center" role="status" aria-label={`Location: ${tank.location}`}>
            <div className="text-xs text-gray-600 font-medium" aria-hidden="true">Location</div>
            <div className="text-sm font-semibold text-gray-700" aria-hidden="true">
              {tank.location}
            </div>
          </div>
        </div>

        {/* Trend indicator */}
        {tank.trend && (
          <div
            className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg ${getTrendColor(tank.trend, tank.trendValue || 0)}`}
            {...getTrendAriaAttributes()}
          >
            {renderTrendIcon(tank.trend)}
            <span className="text-sm font-medium" aria-hidden="true">{getTrendText(tank.trend)}</span>
            {tank.trendValue && tank.trendValue > 0 && (
              <span className="text-xs font-mono font-semibold" aria-hidden="true">
                {getTrendSpeed(tank.trend, tank.trendValue)}
              </span>
            )}
          </div>
        )}

        {/* Last update */}
        <div className="flex items-center justify-center space-x-1 text-xs text-gray-500" role="status" aria-label={`Last updated: ${new Date(tank.lastUpdated).toLocaleTimeString()}`}>
          <Clock className="w-3 h-3" aria-hidden="true" />
          <span aria-hidden="true">{new Date(tank.lastUpdated).toLocaleTimeString()}</span>
        </div>

        {/* Alarm indicator */}
        {isAlarm && (
          <div className="flex items-center justify-center space-x-2 p-2 bg-red-100 border border-red-200 rounded-lg" role="alert" aria-live="assertive">
            <AlertTriangle className="w-4 h-4 text-red-600" aria-label="Warning" role="img" />
            <span className="text-sm font-medium text-red-700">Attention Required</span>
          </div>
        )}

        {/* Keyboard navigation help */}
        {enableKeyboardNavigation && (
          <div className="sr-only" aria-live="polite">
            Press Enter or Space to activate tank. Press I for details. Press Escape to remove focus.
          </div>
        )}
      </div>
    </article>
  );
};
