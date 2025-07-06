import React, { useState } from 'react';
import { Tank } from '../types/tank';
import { Edit2, GripVertical } from 'lucide-react';

interface EditableTankCompactCardProps {
  tank: Tank;
  onRename: (tankId: number, newName: string) => void;
  dragHandleProps?: Record<string, unknown>;
}

export const EditableTankCompactCard: React.FC<EditableTankCompactCardProps> = ({ 
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
    <div className={`bg-white rounded-lg shadow-md p-4 border-2 transition-all duration-300 hover:shadow-lg ${
      isAlarm ? 'border-red-300 animate-pulse' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2 flex-1">
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
              className="text-sm font-semibold text-gray-800 bg-transparent border-b border-blue-500 focus:outline-none flex-1"
              autoFocus
            />
          ) : (
            <div className="flex items-center space-x-1 flex-1">
              <h3 className="text-sm font-semibold text-gray-800 truncate">{tank.name}</h3>
              <button
                onClick={() => setIsEditing(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <div className={`w-3 h-3 rounded-full ${getStatusColor(tank.status)}`}></div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Level</span>
          <span>{percentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${getStatusColor(tank.status)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="text-center">
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
        <div className="text-xs text-gray-500">
          {tank.location}
        </div>
      </div>
    </div>
  );
};
