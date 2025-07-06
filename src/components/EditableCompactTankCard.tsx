import React, { useState } from 'react';
import { Tank } from '../types/tank';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Edit2, GripVertical } from 'lucide-react';

interface EditableCompactTankCardProps {
  tank: Tank;
  onRename: (tankId: number, newName: string) => void;
  dragHandleProps?: Record<string, unknown>;
}

export const EditableCompactTankCard: React.FC<EditableCompactTankCardProps> = ({ 
  tank, 
  onRename, 
  dragHandleProps 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tank.name);

  const getStatusColor = (status: Tank['status']) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'low': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBorderColor = (status: Tank['status']) => {
    switch (status) {
      case 'normal': return 'border-green-200';
      case 'low': return 'border-yellow-300';
      case 'high': return 'border-orange-300';
      case 'critical': return 'border-red-400';
      default: return 'border-gray-200';
    }
  };

  const getTrendIcon = (trend: Tank['trend']) => {
    switch (trend) {
      case 'loading': return <TrendingUp className="w-4 h-4 text-green-600 font-bold" />;
      case 'unloading': return <TrendingDown className="w-4 h-4 text-red-600 font-bold" />;
      case 'stable': return <Minus className="w-4 h-4 text-gray-500" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendText = (trend: Tank['trend']) => {
    switch (trend) {
      case 'loading': return 'LOADING';
      case 'unloading': return 'UNLOADING';
      case 'stable': return 'STABLE';
      default: return '';
    }
  };

  const getTrendColor = (trend: Tank['trend']) => {
    switch (trend) {
      case 'loading': return 'bg-green-100 text-green-700 border-green-300';
      case 'unloading': return 'bg-red-100 text-red-700 border-red-300';
      case 'stable': return 'bg-gray-100 text-gray-600 border-gray-300';
      default: return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  const handleSave = () => {
    if (editName.trim() && editName !== tank.name) {
      onRename(tank.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(tank.name);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const percentage = (tank.currentLevel / tank.maxCapacity) * 100;
  const isAlarm = tank.status === 'low' || tank.status === 'high' || tank.status === 'critical';
  const isCritical = tank.status === 'critical';

  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-300 hover:shadow-md ${
      isCritical ? 'border-red-400 shadow-red-200 animate-pulse' :
      isAlarm ? 'border-orange-300 shadow-orange-100' :
      getStatusBorderColor(tank.status)
    }`}>
      {/* Compact Header */}
      <div className="bg-gray-50 px-3 py-2 rounded-t-lg border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1">
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="w-3 h-3 text-gray-400" />
            </div>
            
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyPress}
                className="text-sm font-semibold text-gray-800 bg-white border border-blue-300 rounded px-1 py-0.5 flex-1 min-w-0"
                autoFocus
              />
            ) : (
              <h4 
                className="text-sm font-semibold text-gray-800 cursor-pointer hover:text-blue-600 flex-1 min-w-0 truncate"
                onClick={() => setIsEditing(true)}
              >
                {tank.name}
              </h4>
            )}
            
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
              >
                <Edit2 className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(tank.status)} ${isCritical ? 'animate-pulse' : ''}`}></div>
            {tank.trend && getTrendIcon(tank.trend)}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Level Display */}
        <div className="text-center">
          <div className={`text-xl font-bold ${isCritical ? 'text-red-600' : isAlarm ? 'text-orange-600' : 'text-gray-800'}`}>
            {tank.currentLevel.toFixed(0)} <span className="text-sm text-gray-500">mm</span>
          </div>
          <div className={`text-lg font-bold ${isCritical ? 'text-red-600' : isAlarm ? 'text-orange-600' : 'text-blue-600'}`}>
            {percentage.toFixed(1)}%
          </div>
        </div>

        {/* Prominent Trend Indicator */}
        {tank.trend && tank.trend !== 'stable' && (
          <div className={`flex items-center justify-center space-x-2 px-2 py-1 rounded-md border ${getTrendColor(tank.trend)}`}>
            {getTrendIcon(tank.trend)}
            <span className="text-xs font-bold">{getTrendText(tank.trend)}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${getStatusColor(tank.status)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>

        {/* Additional Info */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>{tank.maxCapacity}</span>
        </div>

        {/* Status and Location */}
        <div className="text-xs text-gray-600 text-center">
          <div className="font-medium">{tank.location}</div>
          {tank.temperature !== undefined && (
            <div className="text-blue-600">{tank.temperature.toFixed(1)}°C</div>
          )}
        </div>

        {/* Critical Alarm indicator */}
        {isCritical && (
          <div className="flex items-center justify-center space-x-1 p-2 bg-red-100 border-2 border-red-400 rounded-md text-red-700 animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-bold">CRITICAL</span>
          </div>
        )}

        {/* Standard Alarm indicator */}
        {isAlarm && !isCritical && (
          <div className="flex items-center justify-center space-x-1 p-1 bg-orange-50 border border-orange-300 rounded text-orange-700">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs font-medium">ALERT</span>
          </div>
        )}
      </div>
    </div>
  );
};
