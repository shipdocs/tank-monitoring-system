import React from 'react';
import { Tank } from '../types/tank';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface AlarmSummaryProps {
  tanks: Tank[];
  lastSync?: string;
}

export const AlarmSummary: React.FC<AlarmSummaryProps> = ({ tanks, lastSync }) => {
  const alarms = tanks.filter(tank => tank.status !== 'normal');
  const totalTanks = tanks.length;
  const normalTanks = totalTanks - alarms.length;

  return (
    <div className="bg-white rounded-lg shadow-sm px-3 py-2 flex items-center space-x-3">
      {/* Compact status indicators */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span className="text-xs font-medium text-gray-700">{normalTanks}</span>
        </div>

        <div className="flex items-center space-x-1">
          <AlertTriangle className="w-3 h-3 text-red-500" />
          <span className="text-xs font-medium text-gray-700">{alarms.length}</span>
        </div>
      </div>

      {/* Status text */}
      <div className="text-xs text-gray-600">
        {alarms.length > 0 ? (
          <span className="text-red-600 font-medium">{alarms.length} alarm{alarms.length > 1 ? 's' : ''}</span>
        ) : (
          <span className="text-green-600 font-medium">All normal</span>
        )}
      </div>

      {/* Compact timestamp */}
      <div className="text-xs text-gray-500 font-mono">
        {lastSync ? new Date(lastSync).toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }) : '--:--'}
      </div>
    </div>
  );
};