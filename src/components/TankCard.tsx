import React from 'react';
import { Tank } from '../types/tank';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TankCardProps {
  tank: Tank;
}

export const TankCard: React.FC<TankCardProps> = ({ tank }) => {
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
    <div className={`bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
      isAlarm ? 'border-red-300 shadow-red-100' : 'border-gray-200'
    }`}>
      {/* Header with tank name and status */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{tank.name}</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(tank.status)} ring-2 ring-white`}></div>
            <span className="text-sm font-medium text-blue-100">
              {getStatusText(tank.status)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Main level display */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-800 mb-1">
            {tank.currentLevel.toFixed(0)} <span className="text-lg text-gray-500">mm</span>
          </div>
          <div className="text-lg font-semibold text-blue-600">
            {percentage.toFixed(1)}%
          </div>
        </div>

        {/* Visual level indicator */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-700 ease-out ${getStatusColor(tank.status)} relative`}
              style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white opacity-30"></div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>{tank.maxCapacity} mm</span>
          </div>
        </div>

        {/* Additional info grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {tank.temperature !== undefined && (
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-xs text-blue-600 font-medium">Temperature</div>
              <div className="text-lg font-bold text-blue-700">
                {tank.temperature.toFixed(1)}°C
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-600 font-medium">Location</div>
            <div className="text-sm font-semibold text-gray-700">
              {tank.location}
            </div>
          </div>
        </div>

        {/* Trend indicator */}
        {tank.trend && (
          <div className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg ${getTrendColor(tank.trend)}`}>
            {getTrendIcon(tank.trend)}
            <span className="text-sm font-medium">{getTrendText(tank.trend)}</span>
            {tank.trendValue && tank.trendValue > 0 && (
              <span className="text-xs opacity-75">
                {tank.trendValue.toFixed(1)} mm/min
              </span>
            )}
          </div>
        )}

        {/* Last update */}
        <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{new Date(tank.lastUpdated).toLocaleTimeString()}</span>
        </div>

        {/* Alarm indicator */}
        {isAlarm && (
          <div className="flex items-center justify-center space-x-2 p-2 bg-red-100 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">Attention Required</span>
          </div>
        )}
      </div>
    </div>
  );
};