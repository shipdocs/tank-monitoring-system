import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tank } from '../types/tank';
import { Product } from '../types/product';
import { TankTotalsService, GrandTotals, SetpointCalculation } from '../services/TankTotalsService';
import { AlarmStateService } from '../services/AlarmStateService';
import { AlarmConfigurationService } from '../services/AlarmConfigurationService';
import { AudioAlarmService } from '../services/AudioAlarmService';
import { AlarmStatus, AlarmState, ALARM_COLOR_MAP, AlarmStateUtils, AlarmAudioType } from '../types/alarm';
import { FlowRateConfigurationService } from '../services/FlowRateConfigurationService';
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, CheckCircle, VolumeX } from 'lucide-react';

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
  const [audioService] = useState(() => AudioAlarmService.getInstance());
  const [targetVolume] = useState<number>(1500); // Legacy fallback, kept for compatibility
  const [grandTotals, setGrandTotals] = useState<GrandTotals | null>(null);
  const [setpointCalc, setSetpointCalc] = useState<SetpointCalculation | null>(null);
  const [alarmStatus, setAlarmStatus] = useState<AlarmStatus | null>(null);

  // Operation-based state management
  const [operationType, setOperationType] = useState<'loading' | 'unloading'>('unloading');
  const [operationQuantity, setOperationQuantity] = useState<number>(500);
  const [initialVolume, setInitialVolume] = useState<number>(0);

  // Unit toggle state for operation quantity
  const [quantityUnit, setQuantityUnit] = useState<'m3' | 'mt'>('m3');
  const [displayQuantity, setDisplayQuantity] = useState<string>('500');

  // Audio test state
  const [audioTestVolume, setAudioTestVolume] = useState<number>(50);
  const [isAudioTesting, setIsAudioTesting] = useState<boolean>(false);

  // Calculate target based on operation (auto-calculated from operation + current volume)
  const calculatedTarget = useMemo(() => {
    if (!grandTotals) return targetVolume; // Fallback to manual target

    // For new operations, use current volume as initial
    const currentVolume = grandTotals.totalVolume;
    const baseVolume = initialVolume !== null && initialVolume >= 0 ? initialVolume : currentVolume;

    let target: number;
    if (operationType === 'loading') {
      target = baseVolume + operationQuantity;
    } else {
      target = baseVolume - operationQuantity;
    }

    // Ensure target is not negative for unloading operations
    return Math.max(0, target);
  }, [operationType, operationQuantity, initialVolume, grandTotals, targetVolume]);

  // Operation progress calculation removed - not currently used

  // Calculate totals and alarm states whenever tanks data changes
  useEffect(() => {
    if (tanks.length > 0) {
      const totals = totalsService.calculateGrandTotals(tanks, products);
      setGrandTotals(totals);

      const setpoint = totalsService.calculateSetpointProgress(totals, calculatedTarget);
      setSetpointCalc(setpoint);

      // Update alarm state based on current operation
      if (totals && initialVolume !== null && initialVolume >= 0) {
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

  // Audio test functions
  const testAudioType = async (audioType: AlarmAudioType) => {
    if (isAudioTesting) return;

    setIsAudioTesting(true);
    try {
      await audioService.playAudioType(audioType, {
        volume: audioTestVolume,
        enabled: true
      });
    } catch (error) {
      console.error('Audio test failed:', error);
    } finally {
      // Reset testing state after a delay
      setTimeout(() => setIsAudioTesting(false), 2000);
    }
  };

  const stopAudioTest = () => {
    audioService.stopAlarm();
    setIsAudioTesting(false);
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

  // Convert between m³ and MT
  const convertQuantity = useCallback((value: number, fromUnit: 'm3' | 'mt', toUnit: 'm3' | 'mt'): number => {
    if (fromUnit === toUnit) return value;
    
    const averageDensity = products.length > 0 ? products[0]?.density_15c_vacuum || 850 : 850;
    
    if (fromUnit === 'm3' && toUnit === 'mt') {
      // m³ to MT: volume * density / 1000
      return (value * averageDensity) / 1000;
    } else {
      // MT to m³: (mass * 1000) / density
      return (value * 1000) / averageDensity;
    }
  }, [products]);

  // Update display when unit changes
  useEffect(() => {
    const currentM3 = operationQuantity;
    if (quantityUnit === 'mt') {
      const mt = convertQuantity(currentM3, 'm3', 'mt');
      setDisplayQuantity(mt.toFixed(1));
    } else {
      setDisplayQuantity(currentM3.toString());
    }
  }, [quantityUnit, operationQuantity, products, convertQuantity]);

  // Handle quantity change with unit conversion
  const handleQuantityChange = (value: string) => {
    setDisplayQuantity(value);
    const numValue = parseFloat(value) || 0;
    
    // Convert to m³ if needed
    const m3Value = quantityUnit === 'mt' 
      ? convertQuantity(numValue, 'mt', 'm3')
      : numValue;
    
    setOperationQuantity(Math.max(0, m3Value));
  };

  // Handle unit toggle
  const handleUnitToggle = () => {
    setQuantityUnit(prev => prev === 'm3' ? 'mt' : 'm3');
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

  // Use centralized flow rate formatting
  const [flowRateConfigService] = useState(() => FlowRateConfigurationService.getInstance());
  
  const getFlowRateDisplay = (flowRate: number): string => {
    return flowRateConfigService.formatFlowRate(flowRate);
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
        {/* Total Volume - Ultra Compact with Product Info */}
        <div className="bg-blue-900 border border-blue-700 rounded-sm p-1.5 text-white text-center shadow">
          <div className="text-xs font-bold text-blue-200">VOL</div>
          <div className="text-sm font-black text-white">{grandTotals.totalVolume.toFixed(1)} m³</div>
          {/* Product Quick Info */}
          {products.length > 0 && (
            <div className="text-xs text-blue-200 mt-1">
              {products[0].name}: {products[0].density_15c_vacuum.toFixed(0)} kg/m³
            </div>
          )}
        </div>

        {/* Total Metric Tons - Ultra Compact with Quick Stats */}
        <div className="bg-green-900 border border-green-700 rounded-sm p-1.5 text-white text-center shadow">
          <div className="text-xs font-bold text-green-200">METRIC TONS</div>
          <div className="text-sm font-black text-white">{grandTotals.totalMetricTons.toFixed(1)} MT</div>
          {/* Quick Stats */}
          <div className="text-xs text-green-200 mt-1">
            {products.length} Products • {setpointCalc.progressPercentage.toFixed(0)}% Fill
          </div>
        </div>

        {/* Operation Control - Load/Unload Interface with Alarm Indicator and Unit Toggle */}
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
          </div>

          {/* Quantity Input with Unit Toggle */}
          <div className="flex items-center justify-center space-x-1 mb-1">
            <input
              type="number"
              value={displayQuantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              className="bg-white text-black border border-purple-300 rounded px-2 py-1 text-center text-sm font-black w-16"
              placeholder="500"
              min="0"
              step={quantityUnit === 'mt' ? '0.1' : '10'}
              title={`Operation quantity in ${quantityUnit === 'm3' ? 'm³' : 'MT'}`}
            />
            <button
              onClick={handleUnitToggle}
              className="text-xs bg-white text-purple-900 px-2 py-1 rounded hover:bg-gray-100 font-black border border-purple-300"
              title={`Switch to ${quantityUnit === 'm3' ? 'Metric Tons' : 'Cubic Meters'}`}
            >
              {quantityUnit === 'm3' ? 'm³' : 'MT'}
            </button>
          </div>

          {/* Conversion Display and Target */}
          <div className="text-xs text-purple-200">
            {quantityUnit === 'm3' ? (
              <div>≈ {convertQuantity(parseFloat(displayQuantity) || 0, 'm3', 'mt').toFixed(1)} MT</div>
            ) : (
              <div>≈ {convertQuantity(parseFloat(displayQuantity) || 0, 'mt', 'm3').toFixed(0)} m³</div>
            )}
            <div>→ Target: {calculatedTarget.toFixed(0)}m³</div>
          </div>
        </div>

        {/* Audio Test Controls */}
        <div className="bg-gray-800 border border-gray-600 rounded-sm p-1.5 text-white text-center shadow">
          <div className="text-xs font-bold text-gray-200 mb-1">AUDIO TEST</div>
          <div className="flex items-center space-x-1 mb-1">
            <input
              type="range"
              min="0"
              max="100"
              value={audioTestVolume}
              onChange={(e) => setAudioTestVolume(parseInt(e.target.value))}
              className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              disabled={isAudioTesting}
            />
            <span className="text-xs text-gray-300 w-8">{audioTestVolume}%</span>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => testAudioType('beep')}
              disabled={isAudioTesting}
              className="flex-1 px-1 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded transition-colors"
            >
              Beep
            </button>
            <button
              onClick={() => testAudioType('pattern')}
              disabled={isAudioTesting}
              className="flex-1 px-1 py-0.5 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded transition-colors"
            >
              Pattern
            </button>
            <button
              onClick={stopAudioTest}
              disabled={!isAudioTesting}
              className="px-1 py-0.5 text-xs bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded transition-colors"
            >
              <VolumeX className="w-3 h-3" />
            </button>
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
      <div className="bg-gray-800 border border-gray-600 rounded-sm h-3 mb-2 relative shadow-inner overflow-visible">
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
          <span className="text-gray-900 text-xs" title="Active tanks (loading/unloading)">{grandTotals.activeTankCount} ACTIVE</span>
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
            {operationType === 'loading' ? 'REMAINING TO LOAD' : 'REMAINING TO UNLOAD'}: {Math.abs(setpointCalc.remainingVolume).toFixed(0)} m³
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
