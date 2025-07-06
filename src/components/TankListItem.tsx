import React from 'react';
import { Tank } from '../types/tank';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TankListItemProps {
  tank: Tank;
}

export const TankListItem: React.FC<TankListItemProps> = ({ tank }) => {
  const getStatusColor = (status: Tank['status']) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'low': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: Tank['status']) => {
    switch (status) {
      case 'normal': return 'Normal';
      case 'low': return 'Low Level';
      case 'high': return 'High Level';
      case 'critical': return 'Critical';
      default: return 'Unknown';
    }
  };

  const getTrendIcon = (trend: Tank['trend']) => {
    switch (trend) {
      case 'loading': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'unloading': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable': return <Minus className="w-4 h-4 text-gray-500" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: Tank['trend']) => {
    switch (trend) {
      case 'loading': return 'text-green-600 bg-green-50';
      case 'unloading': return 'text-red-600 bg-red-50';
      case 'stable': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getTrendText = (trend: Tank['trend']) => {
    switch (trend) {
      case 'loading': return 'Loading';
      case 'unloading': return 'Unloading';
      case 'stable': return 'Stable';
      default: return 'Unknown';
    }
  };

  // Calculate percentage based on configured max height, not max capacity
  const percentage = tank.maxCapacity > 0 ? (tank.currentLevel / tank.maxCapacity) * 100 : 0;
  const isAlarm = tank.status === 'low' || tank.status === 'high' || tank.status === 'critical';

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 border-2 transition-all duration-300 hover:shadow-md ${
      isAlarm ? 'border-red-300' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between">
        {/* Tank Info */}
        <div className="flex items-center space-x-4 flex-1">
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${getStatusColor(tank.status)}`}></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{tank.name}</h3>
              <p className="text-sm text-gray-600">{tank.location}</p>
            </div>
          </div>
          
          {/* Level Display */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-1 max-w-xs">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Level</span>
                <span>{Math.max(0, percentage).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getStatusColor(tank.status)}`}
                  style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xl font-bold text-gray-900">
                {tank.currentLevel.toFixed(0)} mm
              </div>
              <div className="text-sm text-gray-500">
                {percentage.toFixed(1)}%
              </div>
              {tank.temperature !== undefined && (
                <div className="text-sm text-blue-600 font-medium">
                  {tank.temperature.toFixed(1)}°C
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-end space-x-4">
          <div className="text-right">
            <div className={`text-sm font-medium ${
              isAlarm ? 'text-red-600' : 'text-green-600'
            }`}>
              {getStatusText(tank.status)}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(tank.lastUpdated).toLocaleTimeString()}
            </div>
          </div>

          {isAlarm && (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          )}
        </div>

        {/* Trend Indicator */}
        {tank.trend && (
          <div className="flex justify-center mt-2">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium ${getTrendColor(tank.trend)}`}>
              {getTrendIcon(tank.trend)}
              <span>{getTrendText(tank.trend)}</span>
              {tank.trendValue && tank.trendValue > 0 && (
                <span className="text-xs">
                  {tank.trendValue.toFixed(1)} {tank.unit}/min
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
