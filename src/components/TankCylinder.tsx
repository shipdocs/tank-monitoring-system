import React from 'react';
import { Tank } from '../types/tank';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TankCylinderProps {
  tank: Tank;
}

export const TankCylinder: React.FC<TankCylinderProps> = ({ tank }) => {
  const percentage = ((tank.currentLevel ?? 0) / (tank.maxCapacity ?? 1)) * 100;
  const isAlarm = tank.status === 'critical' || tank.status === 'low';

  const getStatusColor = (status: Tank['status']) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'low': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getLevelColor = (status: Tank['status']) => {
    switch (status) {
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-yellow-400';
      case 'high': return 'bg-orange-400';
      case 'critical': return 'bg-red-400';
      default: return 'bg-gray-400';
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

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 border-2 transition-all duration-300 hover:shadow-xl w-full min-h-[500px] flex flex-col ${
      isAlarm ? 'border-red-300 animate-pulse' : 'border-gray-200'
    }`}>
      {/* Tank Name and Status */}
      <div className="flex items-center justify-between mb-4 h-6">
        <h3 className="text-base font-semibold text-gray-800 truncate flex-1">{tank.name}</h3>
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(tank.status)}`}></div>
      </div>

      {/* Tank Cylinder Visualization */}
      <div className="flex flex-col items-center mb-6 flex-1 justify-center">
        {/* Tank Top */}
        <div className="w-24 h-4 bg-gray-300 rounded-t-full border-2 border-gray-400"></div>

        {/* Tank Body */}
        <div className="relative w-24 h-64 bg-gray-200 border-l-2 border-r-2 border-gray-400">
          {/* Liquid Level */}
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${getLevelColor(tank.status)}`}
            style={{ height: `${Math.min(percentage, 100)}%` }}
          ></div>

          {/* Level Percentage Text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-white drop-shadow-lg">
              {(percentage ?? 0).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Tank Bottom */}
        <div className="w-24 h-4 bg-gray-300 rounded-b-full border-2 border-gray-400"></div>
      </div>

      {/* Tank Details - Fixed Height */}
      <div className="text-center space-y-2 h-24 flex flex-col justify-center">
        <div className="text-lg font-bold text-gray-900">
          {(tank.currentLevel ?? 0).toFixed(0)} mm
        </div>
        <div className="text-base text-gray-500">
          {(percentage ?? 0).toFixed(1)}%
        </div>
        {tank.temperature !== undefined && (
          <div className="text-sm text-blue-600 font-medium">
            {(tank.temperature ?? 0).toFixed(1)}°C
          </div>
        )}
        <div className="text-sm text-gray-600 truncate">
          {tank.location}
        </div>
      </div>

      {/* Trend Indicator - Fixed Height */}
      <div className="flex justify-center h-10 items-center">
        {tank.trend ? (
          <div className={`flex items-center justify-center space-x-1 px-3 py-1 rounded-full text-sm font-medium min-w-[90px] ${getTrendColor(tank.trend)}`}>
            {getTrendIcon(tank.trend)}
            <span className="w-14 text-center">{getTrendText(tank.trend)}</span>
            {tank.trendValue && tank.trendValue > 0 && (
              <span className="text-sm">
                {(tank.trendValue ?? 0).toFixed(1)}
              </span>
            )}
          </div>
        ) : (
          <div className="h-8"></div>
        )}
      </div>

      {/* Alarm Indicator - Fixed Height */}
      <div className="flex justify-center h-8 items-center">
        {isAlarm && (
          <AlertTriangle className="w-5 h-5 text-red-500" />
        )}
      </div>
    </div>
  );
};
