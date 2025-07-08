import React, { useState } from 'react';
import { type Tank } from '../types/tank';
import { AlertTriangle, Edit2, GripVertical, Minus, TrendingDown, TrendingUp } from 'lucide-react';
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

interface EditableTankListItemProps {
  tank: Tank;
  onRename: (tankId: string, newName: string) => void;
  dragHandleProps?: Record<string, unknown>;
}

export const EditableTankListItem: React.FC<EditableTankListItemProps> = ({
  tank,
  onRename,
  dragHandleProps,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tank.name);

  const percentage = getTankPercentage(tank.currentLevel, tank.maxCapacity);
  const isAlarm = isAlarmState(tank.status);

  // Helper function to render trend icon based on icon info
  const renderTrendIcon = (trend: Tank['trend']) => {
    const iconInfo = getTrendIcon(trend);
    switch (iconInfo.name) {
      case 'TrendingUp': return <TrendingUp className={iconInfo.className} />;
      case 'TrendingDown': return <TrendingDown className={iconInfo.className} />;
      case 'Minus': return <Minus className={iconInfo.className} />;
      default: return <Minus className={iconInfo.className} />;
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
    <div className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all duration-300 hover:shadow-lg ${
      isAlarm ? 'border-red-300 animate-pulse' : 'border-gray-200'
    }`}>
      {/* Tank Info */}
      <div className="flex items-center space-x-4 flex-1">
        <div className="flex items-center space-x-3">
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing hover:bg-gray-100 p-1 rounded transition-colors">
            <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </div>
          <div className={`w-4 h-4 rounded-full ${getStatusColor(tank.status)}`}></div>
          <div>
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleKeyPress}
                className="text-lg font-semibold text-gray-800 bg-transparent border-b-2 border-blue-500 focus:outline-none"
                autoFocus
              />
            ) : (
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-800">{tank.name}</h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-600">{tank.location}</p>
          </div>
        </div>

        {/* Level Display */}
        <div className="flex items-center space-x-4 flex-1">
          <div className="flex-1 max-w-xs">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Level</span>
              <span>{percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getStatusColor(tank.status)}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
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
      <div className="flex items-center justify-end space-x-4 mt-4">
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
            {renderTrendIcon(tank.trend)}
            <span>{getTrendText(tank.trend)}</span>
            {tank.trendValue && tank.trendValue > 0 && (
              <span className="text-xs">
                {getTrendSpeed(tank.trend, tank.trendValue)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
