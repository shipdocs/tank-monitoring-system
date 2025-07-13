/**
 * AlarmConfiguration - Comprehensive alarm settings interface for maritime operations
 * 
 * Features:
 * - Percentage-based threshold controls
 * - Audio settings with test functionality
 * - Operation-specific alarm toggles
 * - Real-time configuration updates
 * - Import/export alarm configurations
 */

import React, { useState, useEffect } from 'react';
import { AlarmConfigurationService } from '../services/AlarmConfigurationService';
import { AudioAlarmService } from '../services/AudioAlarmService';
import { AlarmStateService } from '../services/AlarmStateService';
import { AlarmConfiguration as AlarmConfig, AlarmAudioType, AlarmStatus, AlarmEvent, AlarmStateUtils, ALARM_COLOR_MAP } from '../types/alarm';
import { 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  Settings,
  Download,
  Upload,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  User
} from 'lucide-react';

export const AlarmConfiguration: React.FC = () => {
  const [configService] = useState(() => AlarmConfigurationService.getInstance());
  const [audioService] = useState(() => AudioAlarmService.getInstance());
  const [alarmStateService] = useState(() => AlarmStateService.getInstance());
  const [config, setConfig] = useState<AlarmConfig>(configService.getConfiguration());
  const [isAudioTesting, setIsAudioTesting] = useState<boolean>(false);
  const [testingAudioType, setTestingAudioType] = useState<AlarmAudioType | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentAlarmStatus, setCurrentAlarmStatus] = useState<AlarmStatus | null>(null);
  const [alarmHistory, setAlarmHistory] = useState<AlarmEvent[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Load configuration on mount
  useEffect(() => {
    const loadedConfig = configService.getConfiguration();
    setConfig(loadedConfig);
  }, [configService]);

  // Monitor alarm status changes
  useEffect(() => {
    const handleStatusChange = (status: AlarmStatus | null) => {
      setCurrentAlarmStatus(status);
    };

    const handleAlarmEvent = (event: AlarmEvent) => {
      setAlarmHistory(prev => [event, ...prev].slice(0, 50)); // Keep last 50 events
    };

    // Add listeners
    alarmStateService.addStatusChangeListener(handleStatusChange);
    alarmStateService.addAlarmEventListener(handleAlarmEvent);

    // Load initial state
    const currentStatus = alarmStateService.getCurrentStatus();
    setCurrentAlarmStatus(currentStatus);

    const history = alarmStateService.getAlarmHistory();
    setAlarmHistory(history.slice(0, 50));

    // Cleanup listeners on unmount
    return () => {
      alarmStateService.removeStatusChangeListener(handleStatusChange);
      alarmStateService.removeAlarmEventListener(handleAlarmEvent);
    };
  }, [alarmStateService]);

  // Save configuration with status feedback
  const saveConfiguration = async (newConfig: AlarmConfig) => {
    setSaveStatus('saving');
    try {
      configService.saveConfiguration(newConfig);
      setConfig(newConfig);
      setSaveStatus('saved');
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save alarm configuration:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Update specific configuration field
  const updateConfig = (field: keyof AlarmConfig, value: string | number | boolean) => {
    const newConfig = { ...config, [field]: value };
    saveConfiguration(newConfig);
  };

  // Test audio functionality
  const testAudio = async (audioType: AlarmAudioType) => {
    if (isAudioTesting) return;
    
    setIsAudioTesting(true);
    setTestingAudioType(audioType);
    
    try {
      await audioService.playAudioType(audioType, {
        volume: config.audioVolume,
        enabled: true,
        audioType: config.audioType,
        frequency: config.audioFrequency,
        beepDuration: config.beepDuration,
        beepInterval: config.beepInterval,
        patternRepeat: config.patternRepeat
      });
    } catch {
      console.error('Audio test failed');
    } finally {
      setTimeout(() => {
        setIsAudioTesting(false);
        setTestingAudioType(null);
      }, 2000);
    }
  };

  // Stop audio test
  const stopAudioTest = () => {
    audioService.stopAlarm();
    setIsAudioTesting(false);
    setTestingAudioType(null);
  };

  // Export configuration
  const exportConfiguration = () => {
    const result = configService.exportConfiguration();
    if (result.success) {
      const blob = new Blob([result.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alarm-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Import configuration
  const importConfiguration = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const result = configService.importConfiguration(event.target?.result as string);
            if (result.success) {
              const newConfig = configService.getConfiguration();
              setConfig(newConfig);
              alert('Alarm configuration imported successfully!');
            } else {
              alert(`Import failed: ${result.message}`);
            }
          } catch {
            alert('Failed to import configuration. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Reset to defaults
  const resetToDefaults = () => {
    if (confirm('Reset all alarm settings to defaults? This cannot be undone.')) {
      configService.resetToDefaults();
      const defaultConfig = configService.getConfiguration();
      setConfig(defaultConfig);
    }
  };

  // Acknowledge current alarm
  const acknowledgeAlarm = () => {
    if (currentAlarmStatus) {
      alarmStateService.acknowledgeAlarm('User');
    }
  };

  // Reset alarm state
  const resetAlarmState = () => {
    alarmStateService.resetAlarmState();
  };

  // Clear alarm history
  const clearAlarmHistory = () => {
    if (confirm('Clear all alarm history? This cannot be undone.')) {
      alarmStateService.clearAlarmHistory();
      setAlarmHistory([]);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  };

  // Get save status icon
  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Settings className="w-4 h-4 animate-spin text-blue-600" />;
      case 'saved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Save Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-800">Alarm Configuration</h3>
          {getSaveStatusIcon()}
        </div>
        <div className="text-xs text-gray-500">
          {saveStatus === 'saved' && 'Settings saved'}
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'error' && 'Save failed'}
        </div>
      </div>

      {/* Current Alarm Status */}
      {currentAlarmStatus && (
        <div className={`border rounded-lg p-4 ${ALARM_COLOR_MAP[currentAlarmStatus.currentState].bg} ${ALARM_COLOR_MAP[currentAlarmStatus.currentState].border}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className={`w-5 h-5 ${ALARM_COLOR_MAP[currentAlarmStatus.currentState].text}`} />
              <h4 className={`font-semibold ${ALARM_COLOR_MAP[currentAlarmStatus.currentState].text}`}>
                Current Alarm: {AlarmStateUtils.getDisplayName(currentAlarmStatus.currentState)}
              </h4>
            </div>
            <div className="flex space-x-2">
              {currentAlarmStatus.requiresAcknowledgment && (
                <button
                  onClick={acknowledgeAlarm}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Acknowledge
                </button>
              )}
              <button
                onClick={resetAlarmState}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Operation:</span>
              <p className="capitalize">{currentAlarmStatus.operationType}</p>
            </div>
            <div>
              <span className="font-medium">Current Volume:</span>
              <p>{currentAlarmStatus.currentVolume.toFixed(1)} m³</p>
            </div>
            <div>
              <span className="font-medium">Target Volume:</span>
              <p>{currentAlarmStatus.targetVolume.toFixed(1)} m³</p>
            </div>
            <div>
              <span className="font-medium">Progress:</span>
              <p>{currentAlarmStatus.progressPercentage.toFixed(1)}%</p>
            </div>
          </div>

          {currentAlarmStatus.overshootPercentage > 0 && (
            <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
              <strong>Overshoot:</strong> {currentAlarmStatus.overshootPercentage.toFixed(1)}% over target
            </div>
          )}
        </div>
      )}

      {/* Alarm History */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-800">Alarm History</h4>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
            {alarmHistory.length > 0 && (
              <button
                onClick={clearAlarmHistory}
                className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {alarmHistory.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No alarm events recorded</p>
        ) : (
          <div className="text-sm text-gray-600 mb-2">
            {alarmHistory.length} event{alarmHistory.length !== 1 ? 's' : ''} recorded
          </div>
        )}

        {showHistory && alarmHistory.length > 0 && (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {alarmHistory.map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded border-l-4 ${ALARM_COLOR_MAP[event.alarmState].bg} ${ALARM_COLOR_MAP[event.alarmState].border}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium ${ALARM_COLOR_MAP[event.alarmState].text}`}>
                      {AlarmStateUtils.getDisplayName(event.alarmState)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {event.acknowledged ? (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-xs">Acked</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-orange-600">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">Pending</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Operation:</span> {event.operationType}
                  </div>
                  <div>
                    <span className="font-medium">Volume:</span> {event.currentVolume.toFixed(1)} m³
                  </div>
                </div>

                {event.message && (
                  <p className="text-xs text-gray-700 mt-1 italic">{event.message}</p>
                )}

                {event.acknowledged && event.acknowledgedBy && (
                  <div className="text-xs text-green-600 mt-1 flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>Acknowledged by {event.acknowledgedBy}</span>
                    {event.acknowledgedAt && (
                      <span>at {formatTimestamp(event.acknowledgedAt)}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Master Enable/Disable */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-800">Master Alarm System</h4>
            <p className="text-sm text-gray-600">Enable or disable all alarm functionality</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => updateConfig('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Threshold Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3">Alarm Thresholds</h4>
        <p className="text-sm text-gray-600 mb-4">Configure percentage-based alarm thresholds relative to operation quantity</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pre-alarm Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pre-alarm Threshold
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="5"
                max="25"
                value={config.preAlarmPercentage}
                onChange={(e) => updateConfig('preAlarmPercentage', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={!config.enabled}
              />
              <span className="text-sm font-medium text-gray-700 w-12">
                {config.preAlarmPercentage}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Trigger warning when {config.preAlarmPercentage}% away from target
            </p>
          </div>

          {/* Overshoot Warning */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overshoot Warning
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="1"
                max="10"
                value={config.overshootWarningPercentage}
                onChange={(e) => updateConfig('overshootWarningPercentage', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={!config.enabled}
              />
              <span className="text-sm font-medium text-gray-700 w-12">
                {config.overshootWarningPercentage}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Warning when {config.overshootWarningPercentage}% over target
            </p>
          </div>

          {/* Overshoot Alarm */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overshoot Alarm
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="2"
                max="20"
                value={config.overshootAlarmPercentage}
                onChange={(e) => updateConfig('overshootAlarmPercentage', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={!config.enabled}
              />
              <span className="text-sm font-medium text-gray-700 w-12">
                {config.overshootAlarmPercentage}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Critical alarm when {config.overshootAlarmPercentage}% over target
            </p>
          </div>

          {/* Alarm Delay */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alarm Delay (seconds)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="30"
                value={config.alarmDelaySeconds}
                onChange={(e) => updateConfig('alarmDelaySeconds', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={!config.enabled}
              />
              <span className="text-sm font-medium text-gray-700 w-12">
                {config.alarmDelaySeconds}s
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Delay before triggering alarms (prevents false alarms)
            </p>
          </div>
        </div>
      </div>

      {/* Operation-Specific Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3">Operation Settings</h4>
        <p className="text-sm text-gray-600 mb-4">Enable alarms for specific operations</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-gray-700">Loading Alarms</span>
              <p className="text-xs text-gray-500">Enable alarms during loading operations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableLoadingAlarms}
                onChange={(e) => updateConfig('enableLoadingAlarms', e.target.checked)}
                className="sr-only peer"
                disabled={!config.enabled}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-gray-700">Unloading Alarms</span>
              <p className="text-xs text-gray-500">Enable alarms during unloading operations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableUnloadingAlarms}
                onChange={(e) => updateConfig('enableUnloadingAlarms', e.target.checked)}
                className="sr-only peer"
                disabled={!config.enabled}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Audio Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3">Audio Settings</h4>
        <p className="text-sm text-gray-600 mb-4">Configure alarm sounds and volume</p>

        {/* Audio Enable */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-medium text-gray-700">Audio Alarms</span>
            <p className="text-xs text-gray-500">Enable sound notifications for alarms</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.audioEnabled}
              onChange={(e) => updateConfig('audioEnabled', e.target.checked)}
              className="sr-only peer"
              disabled={!config.enabled}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {config.audioEnabled && (
          <div className="space-y-4 border-t border-gray-100 pt-4">
            {/* Volume Control */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Volume
              </label>
              <div className="flex items-center space-x-2">
                <VolumeX className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.audioVolume}
                  onChange={(e) => updateConfig('audioVolume', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  disabled={!config.enabled}
                />
                <Volume2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 w-12">
                  {config.audioVolume}%
                </span>
              </div>
            </div>

            {/* Audio Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alarm Sound Type
              </label>
              <select
                value={config.audioType}
                onChange={(e) => updateConfig('audioType', e.target.value as AlarmAudioType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!config.enabled}
              >
                <option value="beep">Beep - Short tone alerts</option>
                <option value="continuous">Continuous - Sustained alarm tone</option>
                <option value="pattern">Pattern - Maritime standard pattern</option>
                <option value="voice">Voice - Text-to-speech alerts</option>
              </select>
            </div>

            {/* Audio Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequency (Hz)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="200"
                  max="2000"
                  value={config.audioFrequency}
                  onChange={(e) => updateConfig('audioFrequency', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  disabled={!config.enabled}
                />
                <span className="text-sm font-medium text-gray-700 w-16">
                  {config.audioFrequency}Hz
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Maritime standard: 800Hz (current: {config.audioFrequency}Hz)
              </p>
            </div>

            {/* Timing Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beep Duration (ms)
                </label>
                <input
                  type="number"
                  min="50"
                  max="2000"
                  value={config.beepDuration}
                  onChange={(e) => updateConfig('beepDuration', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!config.enabled}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beep Interval (ms)
                </label>
                <input
                  type="number"
                  min="100"
                  max="5000"
                  value={config.beepInterval}
                  onChange={(e) => updateConfig('beepInterval', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!config.enabled}
                />
              </div>
            </div>

            {/* Audio Test Controls */}
            <div className="border-t border-gray-100 pt-4">
              <h5 className="font-medium text-gray-700 mb-2">Test Audio</h5>
              <div className="flex space-x-2">
                <button
                  onClick={() => testAudio('beep')}
                  disabled={!config.enabled || isAudioTesting}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Beep</span>
                  {testingAudioType === 'beep' && <Settings className="w-4 h-4 animate-spin" />}
                </button>

                <button
                  onClick={() => testAudio('pattern')}
                  disabled={!config.enabled || isAudioTesting}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Pattern</span>
                  {testingAudioType === 'pattern' && <Settings className="w-4 h-4 animate-spin" />}
                </button>

                <button
                  onClick={() => testAudio('continuous')}
                  disabled={!config.enabled || isAudioTesting}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Continuous</span>
                  {testingAudioType === 'continuous' && <Settings className="w-4 h-4 animate-spin" />}
                </button>

                <button
                  onClick={stopAudioTest}
                  disabled={!isAudioTesting}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3">Configuration Management</h4>
        <p className="text-sm text-gray-600 mb-4">Export, import, or reset alarm settings</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={exportConfiguration}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>

          <button
            onClick={importConfiguration}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>

          <button
            onClick={resetToDefaults}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
