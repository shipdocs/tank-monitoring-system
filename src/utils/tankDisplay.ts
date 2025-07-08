import { type Tank } from '../types/tank';

/**
 * Get the background color class for a tank status
 */
export const getStatusColor = (status: Tank['status']): string => {
  switch (status) {
    case 'normal': return 'bg-green-500';
    case 'low': return 'bg-yellow-500';
    case 'high': return 'bg-orange-500';
    case 'critical': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

/**
 * Get the display text for a tank status
 */
export const getStatusText = (status: Tank['status']): string => {
  switch (status) {
    case 'normal': return 'Normal';
    case 'low': return 'Low Level';
    case 'high': return 'High Level';
    case 'critical': return 'Critical';
    default: return 'Unknown';
  }
};

/**
 * Get the icon component JSX for a tank trend
 * Note: This returns JSX elements, so it needs to be used within a React component
 */
export const getTrendIcon = (trend: Tank['trend'], size: 'small' | 'medium' = 'medium') => {
  // We'll return the icon name and let components handle the actual rendering
  // This avoids importing React components in a utility file
  const sizeClass = size === 'small' ? 'w-3 h-3' : 'w-4 h-4';

  switch (trend) {
    case 'loading': return { name: 'TrendingUp', className: `${sizeClass} text-green-600` };
    case 'unloading': return { name: 'TrendingDown', className: `${sizeClass} text-red-600` };
    case 'stable': return { name: 'Minus', className: `${sizeClass} text-gray-500` };
    default: return { name: 'Minus', className: `${sizeClass} text-gray-400` };
  }
};

/**
 * Get the color classes for a tank trend based on trend type and speed
 */
export const getTrendColor = (trend: Tank['trend'], speed: number = 0): string => {
  // Determine intensity based on speed
  const getIntensity = (speed: number) => {
    if (speed < 50) return 'light';
    if (speed < 150) return 'normal';
    return 'intense';
  };

  const intensity = getIntensity(speed);

  switch (trend) {
    case 'loading':
      if (intensity === 'light') return 'text-green-500 bg-green-50';
      if (intensity === 'normal') return 'text-green-600 bg-green-100';
      return 'text-green-700 bg-green-200';
    case 'unloading':
      if (intensity === 'light') return 'text-red-500 bg-red-50';
      if (intensity === 'normal') return 'text-red-600 bg-red-100';
      return 'text-red-700 bg-red-200';
    case 'stable': return 'text-gray-600 bg-gray-50';
    default: return 'text-gray-500 bg-gray-50';
  }
};

/**
 * Get the display text for a tank trend
 */
export const getTrendText = (trend: Tank['trend']): string => {
  switch (trend) {
    case 'loading': return 'Loading';
    case 'unloading': return 'Unloading';
    case 'stable': return 'Stable';
    default: return 'Unknown';
  }
};

/**
 * Get the trend speed display text with proper sign and units
 */
export const getTrendSpeed = (trend: Tank['trend'], trendValue: number | undefined): string => {
  if (!trendValue || trendValue === 0) return '';

  const sign = trend === 'loading' ? '+' : trend === 'unloading' ? '-' : '±';
  return `${sign}${trendValue.toFixed(0)} mm/min`;
};

/**
 * Additional utility functions for consistent tank display
 */

/**
 * Get the border color class for a tank status
 */
export const getStatusBorderColor = (status: Tank['status']): string => {
  switch (status) {
    case 'normal': return 'border-green-200';
    case 'low': return 'border-yellow-300';
    case 'high': return 'border-orange-300';
    case 'critical': return 'border-red-400';
    default: return 'border-gray-200';
  }
};

/**
 * Check if a tank is in alarm state
 */
export const isAlarmState = (status: Tank['status']): boolean => status === 'low' || status === 'high' || status === 'critical';

/**
 * Check if a tank is in critical state
 */
export const isCriticalState = (status: Tank['status']): boolean => status === 'critical';

/**
 * Calculate tank fill percentage
 */
export const getTankPercentage = (currentLevel: number, maxCapacity: number): number => maxCapacity > 0 ? (currentLevel / maxCapacity) * 100 : 0;

/**
 * Get level color for cylinder visualization
 */
export const getLevelColor = (status: Tank['status']): string => {
  switch (status) {
    case 'normal': return 'bg-blue-500';
    case 'low': return 'bg-yellow-400';
    case 'high': return 'bg-orange-400';
    case 'critical': return 'bg-red-400';
    default: return 'bg-gray-400';
  }
};
