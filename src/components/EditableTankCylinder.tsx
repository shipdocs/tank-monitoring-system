import React, { useState } from 'react';
import { Tank } from '../types/tank';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Edit2, GripVertical } from 'lucide-react';

interface EditableTankCylinderProps {
  tank: Tank;
  onRename: (tankId: number, newName: string) => void;
  dragHandleProps?: any;
}

export const EditableTankCylinder: React.FC<EditableTankCylinderProps> = ({ 
  tank, 
  onRename, 
  dragHandleProps 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tank.name);

  const percentage = (tank.currentLevel / tank.maxCapacity) * 100;
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

  const handleNameSubmit = () => {
    if (editName.trim() !== tank.name) {
      onRename(tank.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditName(tank.name);
      setIsEditing(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 border-2 transition-all duration-300 hover:shadow-xl w-full h-80 flex flex-col ${
      isAlarm ? 'border-red-300 animate-pulse' : 'border-gray-200'
    }`}>
      {/* Tank Name and Status */}
      <div className="flex items-center justify-between mb-3 h-6">
        <div className="flex items-center space-x-1 flex-1">
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing hover:bg-gray-100 p-1 rounded transition-colors">
            <GripVertical className="w-3 h-3 text-gray-400 hover:text-gray-600" />
          </div>
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleKeyPress}
              className="text-sm font-semibold text-gray-800 bg-transparent border-b border-blue-500 focus:outline-none flex-1 min-w-0"
              autoFocus
            />
          ) : (
            <div className="flex items-center space-x-1 flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 truncate flex-1">{tank.name}</h3>
              <button
                onClick={() => setIsEditing(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(tank.status)}`}></div>
      </div>

      {/* Tank Cylinder Visualization */}
      <div className="flex flex-col items-center mb-3 flex-1 justify-center">
        {/* Tank Top */}
        <div className="w-16 h-2 bg-gray-300 rounded-t-full border-2 border-gray-400"></div>
        
        {/* Tank Body */}
        <div className="relative w-16 h-32 bg-gray-200 border-l-2 border-r-2 border-gray-400">
          {/* Liquid Level */}
          <div 
            className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${getLevelColor(tank.status)}`}
            style={{ height: `${Math.min(percentage, 100)}%` }}
          ></div>
          
          {/* Level Percentage Text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white drop-shadow-lg">
              {percentage.toFixed(0)}%
            </span>
          </div>
        </div>
        
        {/* Tank Bottom */}
        <div className="w-16 h-2 bg-gray-300 rounded-b-full border-2 border-gray-400"></div>
      </div>

      {/* Tank Details - Fixed Height */}
      <div className="text-center space-y-1 h-16 flex flex-col justify-center">
        <div className="text-sm font-bold text-gray-900">
          {tank.currentLevel.toFixed(0)} mm
        </div>
        <div className="text-xs text-gray-500">
          {percentage.toFixed(1)}%
        </div>
        {tank.temperature !== undefined && (
          <div className="text-xs text-blue-600 font-medium">
            {tank.temperature.toFixed(1)}°C
          </div>
        )}
        <div className="text-xs text-gray-600 truncate">
          {tank.location}
        </div>
      </div>

      {/* Trend Indicator - Fixed Height */}
      <div className="flex justify-center h-8 items-center">
        {tank.trend ? (
          <div className={`flex items-center justify-center space-x-1 px-2 py-1 rounded-full text-xs font-medium min-w-[80px] ${getTrendColor(tank.trend)}`}>
            {getTrendIcon(tank.trend)}
            <span className="w-12 text-center">{getTrendText(tank.trend)}</span>
            {tank.trendValue && tank.trendValue > 0 && (
              <span className="text-xs">
                {tank.trendValue.toFixed(1)}
              </span>
            )}
          </div>
        ) : (
          <div className="h-6"></div>
        )}
      </div>

      {/* Alarm Indicator - Fixed Height */}
      <div className="flex justify-center h-6 items-center">
        {isAlarm && (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        )}
      </div>
    </div>
  );
};
