import React, { useState, useEffect, useMemo } from 'react';
import { Tank } from '../types/tank';
import { Product } from '../types/product';
import { TankTotalsService, GrandTotals, SetpointCalculation } from '../services/TankTotalsService';
import { AlarmStateService } from '../services/AlarmStateService';
import { AlarmConfigurationService } from '../services/AlarmConfigurationService';
import { AlarmStatus, AlarmState, ALARM_COLOR_MAP, AlarmStateUtils } from '../types/alarm';
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, CheckCircle } from 'lucide-react';

interface TotalsDashboardProps {
  tanks: Tank[];
  products?: Product[];
}

export const TotalsDashboard: React.FC<TotalsDashboardProps> = ({
  tanks,
  products = []
}) => {
  const [totalsService] = useState(() => new TankTotalsService());
  const [alarmStateService] = useState(() => AlarmStateService.getInstance());
  const [alarmConfigService] = useState(() => AlarmConfigurationService.getInstance());
  const [targetVolume] = useState<number>(1500); // Legacy fallback, kept for compatibility
  const [grandTotals, setGrandTotals] = useState<GrandTotals | null>(null);
  const [setpointCalc, setSetpointCalc] = useState<SetpointCalculation | null>(null);
  const [alarmStatus, setAlarmStatus] = useState<AlarmStatus | null>(null);

  // Operation-based state management
  const [operationType, setOperationType] = useState<'loading' | 'unloading'>('unloading');
  const [operationQuantity, setOperationQuantity] = useState<number>(500);
  const [initialVolume, setInitialVolume] = useState<number>(0);

  // Calculate target based on operation (auto-calculated from operation + current volume)
  const calculatedTarget = useMemo(() => {
    if (!grandTotals) return targetVolume; // Fallback to manual target

    // For new operations, use current volume as initial
    const currentVolume = grandTotals.totalVolume;
    const baseVolume = initialVolume || currentVolume;

    let target: number;
    if (operationType === 'loading') {
      target = baseVolume + operationQuantity;
    } else {
      target = baseVolume - operationQuantity;
    }

    // Ensure target is not negative for unloading operations
    return Math.max(0, target);
  }, [operationType, operationQuantity, initialVolume, grandTotals, targetVolume]);

  // Calculate operation progress for display (for future use)
  // const operationProgress = useMemo(() => {
  //   if (!grandTotals || !initialVolume) return 0;
  //
  //   const currentVolume = grandTotals.totalVolume;
  //   const volumeChange = Math.abs(currentVolume - initialVolume);
  //   const progressPercentage = operationQuantity > 0 ? (volumeChange / operationQuantity) * 100 : 0;
  //
  //   return Math.min(progressPercentage, 100);
  // }, [grandTotals, initialVolume, operationQuantity]);

  // Calculate totals and alarm states whenever tanks data changes
  useEffect(() => {
    if (tanks.length > 0) {
      const totals = totalsService.calculateGrandTotals(tanks, products);
      setGrandTotals(totals);

      const setpoint = totalsService.calculateSetpointProgress(totals, calculatedTarget);
      setSetpointCalc(setpoint);

      // Update alarm state based on current operation
      if (totals && initialVolume > 0) {
        const alarmState = alarmStateService.updateAlarmState(
          totals.totalVolume,
          operationType,
          operationQuantity,
          initialVolume
        );
        setAlarmStatus(alarmState);
      }
    }
  }, [tanks, products, calculatedTarget, totalsService, alarmStateService, operationType, operationQuantity, initialVolume]);

  // Handle target volume change (legacy - kept for backward compatibility)
  // const handleTargetVolumeChange = (value: string) => {
  //   const numValue = parseFloat(value) || 0;
  //   setTargetVolume(numValue);
  // };

  // Handle operation type change
  const handleOperationTypeChange = (type: 'loading' | 'unloading') => {
    setOperationType(type);
    // Set initial volume to current volume when changing operation type
    if (grandTotals) {
      setInitialVolume(grandTotals.totalVolume);
    }
  };

  // Initialize operation with current volume (for future manual reset functionality)
  // const initializeOperation = () => {
  //   if (grandTotals) {
  //     setInitialVolume(grandTotals.totalVolume);
  //   }
  // };

  // Auto-initialize when grandTotals first becomes available
  useEffect(() => {
    if (grandTotals && initialVolume === 0) {
      setInitialVolume(grandTotals.totalVolume);
    }
  }, [grandTotals, initialVolume]);

  // Get alarm state colors and styling
  const getAlarmStyling = (state: AlarmState) => {
    const colors = ALARM_COLOR_MAP[state];
    return {
      bgClass: colors.bg,
      borderClass: colors.border,
      textClass: colors.text,
      icon: AlarmStateUtils.getIcon(state),
      displayName: AlarmStateUtils.getDisplayName(state)
    };
  };

  // Get alarm state for progress bar
  const getProgressBarStyling = () => {
    if (!alarmStatus) {
      return operationType === 'loading'
        ? 'bg-gradient-to-r from-green-600 to-blue-600'
        : 'bg-gradient-to-r from-red-600 to-orange-600';
    }

    switch (alarmStatus.currentState) {
      case 'NORMAL':
        return operationType === 'loading'
          ? 'bg-gradient-to-r from-green-600 to-blue-600'
          : 'bg-gradient-to-r from-red-600 to-orange-600';
      case 'PRE_ALARM':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500';
      case 'TARGET_REACHED':
        return 'bg-gradient-to-r from-blue-500 to-green-500';
      case 'OVERSHOOT_WARNING':
        return 'bg-gradient-to-r from-orange-500 to-red-500';
      case 'OVERSHOOT_ALARM':
        return 'bg-gradient-to-r from-red-600 to-red-800 animate-pulse';
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-600';
    }
  };

  // Calculate alarm threshold positions for visual indicators
  const getAlarmThresholdPositions = () => {
    if (!alarmStatus) return { preAlarm: 90, target: 100 };

    const config = alarmConfigService.getConfiguration();
    const preAlarmPosition = 100 - config.preAlarmPercentage; // 90% by default

    return {
      preAlarm: preAlarmPosition,
      target: 100,
      overshootWarning: 100 + config.overshootWarningPercentage,
      overshootAlarm: 100 + config.overshootAlarmPercentage
    };
  };

  // Handle operation quantity change
  const handleOperationQuantityChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setOperationQuantity(Math.max(0, numValue)); // Ensure positive values
  };

  const getTrendIcon = (trend: 'loading' | 'unloading' | 'stable') => {
    switch (trend) {
      case 'loading':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'unloading':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getFlowRateDisplay = (flowRate: number): string => {
    if (Math.abs(flowRate) < 0.1) {
      return '0.0 m³/h';
    }
    const sign = flowRate >= 0 ? '+' : '';
    return `${sign}${flowRate.toFixed(1)} m³/h`;
  };

  if (!grandTotals || !setpointCalc) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="text-center text-gray-500">
          Loading totals...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-sm shadow-sm border border-gray-300 p-1.5 mb-2">
      {/* Minimal Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <h2 className="text-xs font-bold text-gray-900">VESSEL OVERVIEW</h2>
          {alarmStatus && alarmStatus.currentState !== 'NORMAL' && (
            <div className={`px-1 py-0.5 rounded text-xs font-bold ${getAlarmStyling(alarmStatus.currentState).bgClass} ${getAlarmStyling(alarmStatus.currentState).textClass}`}>
              {getAlarmStyling(alarmStatus.currentState).icon}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-600">
          {grandTotals.lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* Minimal Grand Totals Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5 mb-1">
        {/* Total Volume - Ultra Compact */}
        <div className="bg-blue-900 border border-blue-700 rounded-sm p-1.5 text-white text-center shadow">
          <div className="text-xs font-bold text-blue-200">VOL</div>
          <div className="text-sm font-black text-white">{grandTotals.totalVolume.toFixed(1)} m³</div>
        </div>

        {/* Total Metric Tons - Ultra Compact */}
        <div className="bg-green-900 border border-green-700 rounded-sm p-1.5 text-white text-center shadow">
          <div className="text-xs font-bold text-green-200">WT</div>
          <div className="text-sm font-black text-white">{grandTotals.totalMetricTons.toFixed(1)} MT</div>
        </div>

        {/* Operation Control - Load/Unload Interface with Alarm Indicator */}
        <div className={`border rounded-sm p-1.5 text-white text-center shadow transition-all duration-300 ${
          alarmStatus && alarmStatus.currentState === 'OVERSHOOT_ALARM'
            ? 'bg-red-900 border-red-700 animate-pulse'
            : alarmStatus && alarmStatus.currentState === 'OVERSHOOT_WARNING'
            ? 'bg-orange-900 border-orange-700'
            : alarmStatus && alarmStatus.currentState === 'PRE_ALARM'
            ? 'bg-yellow-900 border-yellow-700'
            : 'bg-purple-900 border-purple-700'
        }`}>
          <div className="flex items-center justify-center space-x-1">
            <span className="text-xs font-bold text-purple-200">OPERATION</span>
            {alarmStatus && alarmStatus.currentState !== 'NORMAL' && (
              <span className="text-xs">
                {getAlarmStyling(alarmStatus.currentState).icon}
              </span>
            )}
          </div>
          <div className="flex items-center justify-center space-x-1 mb-1">
            {/* Operation Type Toggle */}
            <div className="flex bg-white rounded border border-purple-300 overflow-hidden">
              <button
                className={`px-2 py-1 text-xs font-black transition-colors ${
                  operationType === 'loading'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
                onClick={() => handleOperationTypeChange('loading')}
                title="Loading operation"
              >
                LOAD
              </button>
              <button
                className={`px-2 py-1 text-xs font-black transition-colors ${
                  operationType === 'unloading'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
                onClick={() => handleOperationTypeChange('unloading')}
                title="Unloading operation"
              >
                UNLOAD
              </button>
            </div>

            {/* Quantity Input */}
            <input
              type="number"
              value={operationQuantity}
              onChange={(e) => handleOperationQuantityChange(e.target.value)}
              className="bg-white text-black border border-purple-300 rounded px-2 py-1 text-center text-sm font-black w-16"
              placeholder="500"
              min="0"
              step="10"
              title="Operation quantity in m³"
            />
            <span className="text-sm font-black">m³</span>
          </div>

          {/* Calculated Target Display */}
          <div className="text-xs text-purple-200">
            → Target: {calculatedTarget.toFixed(0)}m³
          </div>
        </div>

        {/* Time to Complete - Larger Display */}
        <div className="bg-orange-900 border border-orange-700 rounded-sm p-2 text-white text-center shadow">
          <div className="text-xs font-bold text-orange-200">ETC</div>
          <div className="text-base font-black">
            {totalsService.formatTimeRemaining(setpointCalc.timeRemainingMinutes)}
          </div>
          <div className="text-xs font-bold text-orange-200">
            {totalsService.formatEstimatedCompletionTime(setpointCalc.estimatedCompletionTime)}
          </div>
        </div>
      </div>
      
      {/* Ultra Compact Progress Bar - Alarm State Aware with Thresholds */}
      <div className="bg-gray-800 border border-gray-600 rounded-sm h-3 mb-2 relative shadow-inner overflow-hidden">
        {/* Alarm threshold indicators */}
        {alarmStatus && (() => {
          const thresholds = getAlarmThresholdPositions();
          return (
            <>
              {/* Pre-alarm threshold indicator */}
              <div
                className="absolute top-0 w-0.5 h-full bg-yellow-400 opacity-70 z-10"
                style={{ left: `${Math.min(thresholds.preAlarm, 100)}%` }}
                title={`Pre-alarm at ${thresholds.preAlarm.toFixed(0)}%`}
              />
              {/* Target line */}
              <div
                className="absolute top-0 w-0.5 h-full bg-white opacity-90 z-10"
                style={{ left: '100%' }}
                title="Target volume"
              />
              {/* Overshoot warning zone (if visible) */}
              {setpointCalc.progressPercentage > 100 && (
                <div
                  className="absolute top-0 w-0.5 h-full bg-orange-400 opacity-70 z-10"
                  style={{ left: `${Math.min(thresholds.overshootWarning, 150)}%` }}
                  title={`Overshoot warning at +${(thresholds.overshootWarning - 100).toFixed(1)}%`}
                />
              )}
              {/* Overshoot alarm zone (if visible) */}
              {setpointCalc.progressPercentage > thresholds.overshootWarning && (
                <div
                  className="absolute top-0 w-0.5 h-full bg-red-400 opacity-70 z-10"
                  style={{ left: `${Math.min(thresholds.overshootAlarm, 150)}%` }}
                  title={`Overshoot alarm at +${(thresholds.overshootAlarm - 100).toFixed(1)}%`}
                />
              )}
            </>
          );
        })()}

        {/* Progress fill - can extend beyond 100% for overshoot visualization */}
        <div
          className={`h-full rounded-sm relative transition-all duration-500 ${getProgressBarStyling()}`}
          style={{
            width: `${Math.min(setpointCalc.progressPercentage, 150)}%`, // Allow up to 150% for overshoot
            maxWidth: '100%' // But constrain to container
          }}
        >
          <div className="absolute right-0.5 top-0 h-full flex items-center">
            <span className="text-xs font-black text-white drop-shadow">
              {setpointCalc.progressPercentage.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Overshoot extension (beyond 100%) */}
        {setpointCalc.progressPercentage > 100 && (
          <div
            className="absolute top-0 h-full bg-red-500 opacity-60 transition-all duration-500"
            style={{
              left: '100%',
              width: `${Math.min(setpointCalc.progressPercentage - 100, 50)}%` // Show overshoot up to 50% extra
            }}
            title={`Overshoot: ${(setpointCalc.progressPercentage - 100).toFixed(1)}%`}
          />
        )}

        {/* Target volume display */}
        {setpointCalc.progressPercentage < 100 && (
          <div className="absolute right-0.5 top-0 h-full flex items-center">
            <span className="text-xs font-black text-gray-200 drop-shadow">
              {calculatedTarget.toFixed(0)} m³
            </span>
          </div>
        )}
      </div>

      {/* Enhanced Status Indicators */}
      <div className="flex justify-between items-center text-xs font-bold">
        <div className="flex items-center space-x-1">
          {getTrendIcon(grandTotals.trend)}
          <span className="text-gray-900 text-xs">
            {grandTotals.trend === 'loading' ? 'LOAD' :
             grandTotals.trend === 'unloading' ? 'UNLOAD' : 'STABLE'}: {getFlowRateDisplay(grandTotals.flowRate)}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <span className="text-gray-900 text-xs">{grandTotals.activeTankCount} ACT</span>
        </div>

        <div className={`flex items-center space-x-1 px-2 py-1 rounded border ${
          operationType === 'loading'
            ? 'bg-green-100 border-green-400'
            : 'bg-orange-100 border-orange-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            operationType === 'loading' ? 'bg-green-600' : 'bg-orange-600'
          }`}></div>
          <span className="text-gray-900 text-sm font-black">
            {operationType === 'loading' ? 'TO LOAD' : 'TO UNLOAD'}: {Math.abs(setpointCalc.remainingVolume).toFixed(0)} m³
          </span>
        </div>
      </div>

      {/* Alarm Status Messages - Ultra Compact Fixed Height */}
      <div className="mt-1 h-5 flex items-center">
        {alarmStatus ? (
          <div className={`w-full p-1 rounded-sm border ${getAlarmStyling(alarmStatus.currentState).bgClass} ${getAlarmStyling(alarmStatus.currentState).borderClass}`}>
            <div className="flex items-center space-x-1">
              {alarmStatus.currentState === 'NORMAL' && <CheckCircle className="w-2 h-2 text-green-800" />}
              {alarmStatus.currentState === 'PRE_ALARM' && <AlertTriangle className="w-2 h-2 text-yellow-800" />}
              {alarmStatus.currentState === 'TARGET_REACHED' && <Target className="w-2 h-2 text-blue-800" />}
              {alarmStatus.currentState === 'OVERSHOOT_WARNING' && <AlertTriangle className="w-2 h-2 text-orange-800" />}
              {alarmStatus.currentState === 'OVERSHOOT_ALARM' && <AlertTriangle className="w-2 h-2 text-red-800" />}
              <span className={`text-xs font-bold ${getAlarmStyling(alarmStatus.currentState).textClass}`}>
                {getAlarmStyling(alarmStatus.currentState).icon} {getAlarmStyling(alarmStatus.currentState).displayName}
                {alarmStatus.overshootPercentage > 0 && ` (+${alarmStatus.overshootPercentage.toFixed(1)}%)`}
              </span>
            </div>
          </div>
        ) : (
          // Fallback to original status messages when no alarm status
          <>
            {setpointCalc.remainingVolume !== 0 && !setpointCalc.timeRemainingMinutes && (
              <div className="w-full p-1 bg-yellow-100 border border-yellow-600 rounded-sm">
                <div className="flex items-center space-x-1">
                  <Target className="w-2 h-2 text-yellow-800" />
                  <span className="text-xs text-yellow-900 font-bold">
                    {setpointCalc.isLoading ? 'NO LOAD FLOW' : 'NO UNLOAD FLOW'}
                  </span>
                </div>
              </div>
            )}

            {setpointCalc.progressPercentage >= 100 && (
              <div className="w-full p-1 bg-green-100 border border-green-600 rounded-sm">
                <div className="flex items-center space-x-1">
                  <Target className="w-2 h-2 text-green-800" />
                  <span className="text-xs text-green-900 font-black">
                    🎯 TARGET REACHED: {setpointCalc.targetVolume.toFixed(0)} m³
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
