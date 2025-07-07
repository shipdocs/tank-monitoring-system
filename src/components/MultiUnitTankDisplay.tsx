import React from 'react';
import { Tank } from '../types/tank';
import { Droplets, Thermometer, TrendingUp, TrendingDown, Minus, Clock, AlertTriangle } from 'lucide-react';

interface MultiUnitTankDisplayProps {
  tank: Tank;
  showVolume?: boolean;
  showMass?: boolean;
  showFlowRate?: boolean;
  showETA?: boolean;
  showTemperature?: boolean;
  compact?: boolean;
  className?: string;
}

export const MultiUnitTankDisplay: React.FC<MultiUnitTankDisplayProps> = ({
  tank,
  showVolume = true,
  showMass = true,
  showFlowRate = true,
  showETA = true,
  showTemperature = true,
  compact = false,
  className = ''
}) => {
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  // Get trend icon and color
  const getTrendDisplay = () => {
    if (!tank.trend || tank.trend === 'stable') {
      return { icon: Minus, color: 'text-gray-500', label: 'Stable' };
    }
    if (tank.trend === 'loading') {
      return { icon: TrendingUp, color: 'text-green-600', label: 'Loading' };
    }
    return { icon: TrendingDown, color: 'text-blue-600', label: 'Unloading' };
  };

  const trendDisplay = getTrendDisplay();
  const TrendIcon = trendDisplay.icon;

  // Format values
  const formatVolume = (volume?: number) => {
    if (volume === undefined) return 'N/A';
    if (volume < 1) return `${(volume * 1000).toFixed(0)}L`;
    return `${volume.toFixed(1)}m³`;
  };

  const formatMass = (mass?: number) => {
    if (mass === undefined) return 'N/A';
    return `${mass.toFixed(1)}t`;
  };

  const formatFlowRate = (rate?: number, unit: 'm³/h' | 't/h' = 'm³/h') => {
    if (rate === undefined) return 'N/A';
    return `${Math.abs(rate).toFixed(1)}${unit}`;
  };

  const formatETA = (eta?: Date) => {
    if (!eta) return 'N/A';
    const now = new Date();
    const diffMs = eta.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const minutes = Math.round(diffMs / (1000 * 60));
      return `${minutes}min`;
    } else if (diffHours < 24) {
      return `${diffHours.toFixed(1)}h`;
    } else {
      const days = Math.floor(diffHours / 24);
      const hours = Math.round(diffHours % 24);
      return `${days}d ${hours}h`;
    }
  };

  if (compact) {
    return (
      <div className={`bg-white border rounded-lg p-3 ${getStatusColor(tank.status)} ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-sm">{tank.name}</h3>
          <div className="flex items-center space-x-1">
            <TrendIcon className={`w-3 h-3 ${trendDisplay.color}`} />
            <span className="text-xs text-gray-600">{tank.currentLevel}mm</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          {showVolume && tank.volumeData && (
            <div>
              <span className="text-gray-600">Vol:</span>
              <span className="ml-1 font-medium">{formatVolume(tank.volumeData.volume)}</span>
            </div>
          )}
          {showMass && tank.massData && (
            <div>
              <span className="text-gray-600">Mass:</span>
              <span className="ml-1 font-medium">{formatMass(tank.massData.mass)}</span>
            </div>
          )}
          {showFlowRate && tank.flowRateData && (
            <div>
              <span className="text-gray-600">Rate:</span>
              <span className="ml-1 font-medium">{formatFlowRate(tank.flowRateData.volumeFlowRate)}</span>
            </div>
          )}
          {showETA && tank.etaData && (
            <div>
              <span className="text-gray-600">ETA:</span>
              <span className="ml-1 font-medium">{formatETA(tank.etaData.estimatedCompletion)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${getStatusColor(tank.status)} ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{tank.name}</h3>
            <p className="text-sm text-gray-600">{tank.location}</p>
          </div>
          <div className="flex items-center space-x-2">
            <TrendIcon className={`w-5 h-5 ${trendDisplay.color}`} />
            <span className="text-sm font-medium">{trendDisplay.label}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Height Display */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Current Level</span>
          <span className="text-xl font-bold text-gray-900">{tank.currentLevel} mm</span>
        </div>

        {/* Multi-unit displays */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Volume */}
          {showVolume && tank.volumeData && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Droplets className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Volume</span>
              </div>
              <div className="text-lg font-bold text-blue-900">
                {formatVolume(tank.volumeData.volume)}
              </div>
              <div className="text-xs text-blue-700">
                {tank.volumeData.volumeLiters.toFixed(0)} liters
              </div>
              {tank.volumeData.accuracy !== 'exact' && (
                <div className="flex items-center space-x-1 mt-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs text-yellow-700 capitalize">{tank.volumeData.accuracy}</span>
                </div>
              )}
            </div>
          )}

          {/* Mass */}
          {showMass && tank.massData && (
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <span className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">M</span>
                <span className="text-sm font-medium text-green-800">Mass</span>
              </div>
              <div className="text-lg font-bold text-green-900">
                {formatMass(tank.massData.mass)}
              </div>
              <div className="text-xs text-green-700">
                Density: {tank.massData.density.toFixed(0)} kg/m³
              </div>
              {tank.massData.temperatureCorrected && (
                <div className="text-xs text-green-600 mt-1">
                  ✓ Temperature corrected
                </div>
              )}
            </div>
          )}

          {/* Flow Rate */}
          {showFlowRate && tank.flowRateData && (
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <TrendIcon className={`w-4 h-4 ${trendDisplay.color}`} />
                <span className="text-sm font-medium text-purple-800">Flow Rate</span>
              </div>
              <div className="text-lg font-bold text-purple-900">
                {formatFlowRate(tank.flowRateData.volumeFlowRate)}
              </div>
              {tank.flowRateData.massFlowRate > 0 && (
                <div className="text-xs text-purple-700">
                  {formatFlowRate(tank.flowRateData.massFlowRate, 't/h')}
                </div>
              )}
              <div className="text-xs text-purple-600 mt-1">
                Confidence: {(tank.flowRateData.confidence * 100).toFixed(0)}%
              </div>
            </div>
          )}

          {/* ETA */}
          {showETA && tank.etaData && (
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">ETA</span>
              </div>
              <div className="text-lg font-bold text-orange-900">
                {formatETA(tank.etaData.estimatedCompletion)}
              </div>
              <div className="text-xs text-orange-700">
                Remaining: {formatVolume(tank.etaData.remainingVolume)}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Confidence: {(tank.etaData.confidence * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </div>

        {/* Temperature */}
        {showTemperature && tank.temperature !== undefined && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Temperature</span>
            </div>
            <span className="text-sm font-medium text-gray-900">{tank.temperature}°C</span>
          </div>
        )}

        {/* Fill Percentage Bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Fill Level</span>
            <span className="text-sm font-medium text-gray-900">
              {((tank.currentLevel / tank.maxCapacity) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                tank.status === 'critical' ? 'bg-red-500' :
                tank.status === 'high' ? 'bg-orange-500' :
                tank.status === 'low' ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, (tank.currentLevel / tank.maxCapacity) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
