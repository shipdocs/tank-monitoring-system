import React from 'react';
import { Tank } from '../types/tank';
import { TankTableConfiguration } from '../types/tankTable';
import { BarChart3, TrendingUp, TrendingDown, Clock, Droplets, Scale, AlertTriangle } from 'lucide-react';

interface OperationsDashboardProps {
  tanks: Tank[];
  configuration: TankTableConfiguration;
  totalVolume: number;
  totalMass: number;
  activeTanks: number;
  className?: string;
}

export const OperationsDashboard: React.FC<OperationsDashboardProps> = ({
  tanks,
  configuration,
  totalVolume,
  totalMass,
  activeTanks,
  className = ''
}) => {
  // Calculate operational statistics
  const loadingTanks = tanks.filter(tank => tank.trend === 'loading');
  const unloadingTanks = tanks.filter(tank => tank.trend === 'unloading');
  const alarmTanks = tanks.filter(tank => tank.status === 'critical' || tank.status === 'high');
  
  // Calculate total flow rates
  const totalVolumeFlowRate = tanks.reduce((sum, tank) => {
    return sum + (tank.flowRateData?.volumeFlowRate || 0);
  }, 0);
  
  const totalMassFlowRate = tanks.reduce((sum, tank) => {
    return sum + (tank.flowRateData?.massFlowRate || 0);
  }, 0);

  // Calculate average ETA for active operations
  const activeETAs = tanks
    .filter(tank => tank.etaData && tank.trend !== 'stable')
    .map(tank => tank.etaData!.estimatedCompletion.getTime());
  
  const averageETA = activeETAs.length > 0 
    ? new Date(activeETAs.reduce((sum, eta) => sum + eta, 0) / activeETAs.length)
    : null;

  // Format time remaining
  const formatTimeRemaining = (date: Date | null) => {
    if (!date) return 'N/A';
    
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const minutes = Math.round(diffMs / (1000 * 60));
      return `${minutes}min`;
    } else if (diffHours < 24) {
      return `${diffHours.toFixed(1)}h`;
    } else {
      const days = Math.floor(diffHours / 24);
      const hours = Math.round(diffHours % 24);
      return `${days}d ${hours}h`;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Operations Dashboard</h2>
        <div className="flex-1"></div>
        <div className="text-sm text-gray-600">
          Vessel: {configuration.vesselName}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Volume */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Droplets className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Total Volume</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{totalVolume.toFixed(1)} m³</div>
          <div className="text-sm text-blue-700">{(totalVolume * 1000).toFixed(0)} liters</div>
        </div>

        {/* Total Mass */}
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Scale className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Total Mass</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{totalMass.toFixed(1)} t</div>
          <div className="text-sm text-green-700">{(totalMass * 1000).toFixed(0)} kg</div>
        </div>

        {/* Active Operations */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Active Operations</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">{activeTanks}</div>
          <div className="text-sm text-purple-700">
            {loadingTanks.length} loading, {unloadingTanks.length} unloading
          </div>
        </div>

        {/* Alarms */}
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">Alarms</span>
          </div>
          <div className="text-2xl font-bold text-red-900">{alarmTanks.length}</div>
          <div className="text-sm text-red-700">Tanks requiring attention</div>
        </div>
      </div>

      {/* Flow Rates and ETA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Volume Flow Rate */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Volume Flow Rate</h3>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {Math.abs(totalVolumeFlowRate).toFixed(1)} m³/h
          </div>
          <div className="flex items-center space-x-2">
            {totalVolumeFlowRate > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : totalVolumeFlowRate < 0 ? (
              <TrendingDown className="w-4 h-4 text-red-600" />
            ) : (
              <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
            )}
            <span className="text-sm text-gray-600">
              {totalVolumeFlowRate > 0 ? 'Loading' : totalVolumeFlowRate < 0 ? 'Unloading' : 'Stable'}
            </span>
          </div>
        </div>

        {/* Mass Flow Rate */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Mass Flow Rate</h3>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {Math.abs(totalMassFlowRate).toFixed(1)} t/h
          </div>
          <div className="flex items-center space-x-2">
            {totalMassFlowRate > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : totalMassFlowRate < 0 ? (
              <TrendingDown className="w-4 h-4 text-red-600" />
            ) : (
              <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
            )}
            <span className="text-sm text-gray-600">
              {totalMassFlowRate > 0 ? 'Loading' : totalMassFlowRate < 0 ? 'Unloading' : 'Stable'}
            </span>
          </div>
        </div>

        {/* Average ETA */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Average ETA</h3>
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {formatTimeRemaining(averageETA)}
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-gray-600">
              {activeETAs.length} active operation{activeETAs.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Tank Groups Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Tank Groups</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configuration.tankGroups.map(group => {
            const groupTanks = tanks.filter(tank => tank.groupId === group.id);
            const groupVolume = groupTanks.reduce((sum, tank) => 
              sum + (tank.volumeData?.volume || 0), 0);
            const groupMass = groupTanks.reduce((sum, tank) => 
              sum + (tank.massData?.mass || 0), 0);
            const groupActive = groupTanks.filter(tank => 
              tank.trend && tank.trend !== 'stable').length;

            return (
              <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: group.color || '#3B82F6' }}
                  />
                  <h4 className="font-medium text-gray-900">{group.displayName}</h4>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tanks:</span>
                    <span className="font-medium">{groupTanks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Volume:</span>
                    <span className="font-medium">{groupVolume.toFixed(1)} m³</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mass:</span>
                    <span className="font-medium">{groupMass.toFixed(1)} t</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active:</span>
                    <span className="font-medium">{groupActive}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Density:</span>
                    <span className="font-medium">{group.density} kg/m³</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alarms Section */}
      {alarmTanks.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-medium text-red-900 mb-3">Active Alarms</h3>
          <div className="space-y-2">
            {alarmTanks.map(tank => (
              <div key={tank.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-800">{tank.name}</span>
                </div>
                <div className="text-sm text-red-700">
                  {tank.status === 'critical' ? 'Critical Level' : 'High Level'} - {tank.currentLevel}mm
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
