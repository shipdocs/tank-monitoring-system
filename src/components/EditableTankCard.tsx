import React, { useState } from 'react';
import { Tank } from '../types/tank';
import { AlertTriangle, Droplets, Clock, TrendingUp, TrendingDown, Minus, Edit2, GripVertical } from 'lucide-react';

interface EditableTankCardProps {
  tank: Tank;
  onRename: (tankId: number, newName: string) => void;
  dragHandleProps?: any;
}

export const EditableTankCard: React.FC<EditableTankCardProps> = ({ 
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

  const percentage = (tank.currentLevel / tank.maxCapacity) * 100;
  const isAlarm = tank.status === 'critical' || tank.status === 'low';

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
    <div className={`bg-white rounded-lg shadow-lg p-6 border-2 transition-all duration-300 hover:shadow-xl ${
      isAlarm ? 'border-red-300 animate-pulse' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 flex-1">
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing hover:bg-gray-100 p-1 rounded transition-colors">
            <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </div>
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleKeyPress}
              className="text-lg font-semibold text-gray-800 bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1"
              autoFocus
            />
          ) : (
            <div className="flex items-center space-x-2 flex-1">
              <h3 className="text-lg font-semibold text-gray-800">{tank.name}</h3>
              <button
                onClick={() => setIsEditing(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(tank.status)}`}></div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Level</span>
          <span>{percentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${getStatusColor(tank.status)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0 {tank.unit}</span>
          <span>{tank.maxCapacity} {tank.unit}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Current Level:</span>
          <span className="font-semibold text-gray-900">
            {tank.currentLevel.toFixed(0)} mm
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Fill Level:</span>
          <span className="font-semibold text-gray-700">
            {percentage.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status:</span>
          <span className={`text-sm font-medium ${
            isAlarm ? 'text-red-600' : 'text-green-600'
          }`}>
            {getStatusText(tank.status)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Location:</span>
          <span className="text-sm text-gray-900">{tank.location}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Last Update:</span>
          <span className="text-sm text-gray-900">
            {new Date(tank.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {tank.trend && (
        <div className="flex items-center justify-center space-x-1 px-2 py-1 rounded-full text-xs font-medium mt-4 ${getTrendColor(tank.trend)}">
          {getTrendIcon(tank.trend)}
          <span>{getTrendText(tank.trend)}</span>
          {tank.trendValue && tank.trendValue > 0 && (
            <span className="text-xs">
              {tank.trendValue.toFixed(1)} {tank.unit}/min
            </span>
          )}
        </div>
      )}

      {isAlarm && (
        <div className="flex items-center justify-center mt-4">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-sm text-red-600 font-medium">Attention Required</span>
        </div>
      )}
    </div>
  );
};
