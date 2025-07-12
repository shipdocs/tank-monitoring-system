import React, { useState, useEffect, useMemo } from 'react';
import { Clock, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { EnhancedTank } from '../types/tankTable';
import { TankOperationalData } from '../types/product';
import { OperationalCalculationService } from '../services/OperationalCalculationService';

interface TimeTableViewProps {
  tanks: EnhancedTank[];
  operationalData: Map<string, TankOperationalData>;
}

export const TimeTableView: React.FC<TimeTableViewProps> = ({
  tanks,
  operationalData
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Service instance
  const operationalService = useMemo(() => new OperationalCalculationService(), []);

  // Generate time table data
  const timeTableEntries = useMemo(() => {
    return operationalService.generateTimeTable(tanks, operationalData);
  }, [tanks, operationalData, operationalService]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Format remaining time
  const formatRemainingTime = (minutes: number | null): string => {
    if (minutes === null) return '-';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Format completion time
  const formatCompletionTime = (date: Date | null): string => {
    if (!date) return '-';
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Get time remaining color class
  const getTimeRemainingColor = (minutes: number | null): string => {
    if (minutes === null) return '';
    
    if (minutes > 120) return 'text-green-600'; // > 2 hours
    if (minutes > 60) return 'text-yellow-600'; // 1-2 hours
    return 'text-red-600'; // < 1 hour
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (timeTableEntries.length === 0) {
      return { totalTanks: 0, averageTime: 0 };
    }
    
    const totalTime = timeTableEntries.reduce((sum, entry) => 
      sum + (entry.minutesRemaining || 0), 0
    );
    
    return {
      totalTanks: timeTableEntries.length,
      averageTime: Math.round(totalTime / timeTableEntries.length)
    };
  }, [timeTableEntries]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div
        className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Time Table</h3>
            {timeTableEntries.length > 0 && (
              <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {timeTableEntries.length} active
              </span>
            )}
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-4">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="transition-all duration-300 ease-in-out">
          {timeTableEntries.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No active operations</p>
              <p className="text-sm mt-1">Tanks with flow rates will appear here</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tank Name
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Volume
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Setpoint
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Flow Rate
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time Remaining
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Est. Completion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timeTableEntries.map((entry) => (
                      <tr key={entry.tankId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.tankName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {entry.currentVolume.toLocaleString()} L
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {entry.setpoint.toLocaleString()} L
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          <span className={entry.flowRate > 0 ? 'text-green-600' : 'text-red-600'}>
                            {entry.flowRate > 0 ? '+' : ''}{entry.flowRate.toFixed(1)} L/min
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${getTimeRemainingColor(entry.minutesRemaining)}`}>
                          {formatRemainingTime(entry.minutesRemaining)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatCompletionTime(entry.estimatedCompletionTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <div className="text-gray-600">
                    <span className="font-medium">{summary.totalTanks}</span> tanks operating
                  </div>
                  <div className="text-gray-600">
                    Average time remaining: <span className="font-medium">{formatRemainingTime(summary.averageTime)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};