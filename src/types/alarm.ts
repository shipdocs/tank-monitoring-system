/**
 * Alarm Configuration Types
 * 
 * Defines interfaces for maritime alarm system configuration
 * with percentage-based thresholds for loading/unloading operations.
 */

export type AlarmState = 
  | 'NORMAL'           // No alarms active
  | 'PRE_ALARM'        // Approaching target (within pre-alarm threshold)
  | 'TARGET_REACHED'   // Target volume reached successfully
  | 'OVERSHOOT_WARNING'// Slightly past target (within overshoot warning threshold)
  | 'OVERSHOOT_ALARM'; // Significantly past target (overshoot alarm threshold)

export type OperationType = 'loading' | 'unloading';

export type AlarmSeverity = 'info' | 'warning' | 'critical';

export type AlarmAudioType = 'beep' | 'continuous' | 'pattern' | 'voice';

export type AlarmTriggerReason =
  | 'PRE_ALARM_THRESHOLD'     // Approaching target
  | 'TARGET_REACHED'          // Target volume achieved
  | 'OVERSHOOT_WARNING'       // Minor overshoot detected
  | 'OVERSHOOT_ALARM'         // Major overshoot detected
  | 'FLOW_RATE_CHANGE'        // Flow rate changed significantly
  | 'MANUAL_TRIGGER'          // Manually triggered alarm
  | 'SYSTEM_ERROR';           // System error condition

export type AlarmActionType =
  | 'VISUAL_INDICATOR'        // Show visual alarm
  | 'AUDIO_ALERT'             // Play audio alarm
  | 'FLASH_DISPLAY'           // Flash the display
  | 'LOG_EVENT'               // Log alarm event
  | 'NOTIFY_OPERATOR'         // Send notification
  | 'AUTO_STOP'               // Auto-stop operation (future)
  | 'EMERGENCY_SHUTDOWN';     // Emergency shutdown (future)

/**
 * Alarm state transition map - defines valid state transitions
 */
export const ALARM_STATE_TRANSITIONS: Record<AlarmState, AlarmState[]> = {
  NORMAL: ['PRE_ALARM', 'TARGET_REACHED'],
  PRE_ALARM: ['NORMAL', 'TARGET_REACHED', 'OVERSHOOT_WARNING'],
  TARGET_REACHED: ['NORMAL', 'OVERSHOOT_WARNING', 'OVERSHOOT_ALARM'],
  OVERSHOOT_WARNING: ['TARGET_REACHED', 'OVERSHOOT_ALARM', 'NORMAL'],
  OVERSHOOT_ALARM: ['OVERSHOOT_WARNING', 'TARGET_REACHED', 'NORMAL']
};

/**
 * Alarm priority levels for sorting and display
 */
export const ALARM_PRIORITY: Record<AlarmState, number> = {
  OVERSHOOT_ALARM: 1,      // Highest priority
  OVERSHOOT_WARNING: 2,
  PRE_ALARM: 3,
  TARGET_REACHED: 4,
  NORMAL: 5                // Lowest priority
};

export interface AlarmConfiguration {
  id: string;
  enabled: boolean;
  
  // Audio settings
  audioEnabled: boolean;
  audioVolume: number; // 0-100%
  audioType: AlarmAudioType; // beep, continuous, pattern, voice
  audioFrequency: number; // Hz for tone generation
  beepDuration: number; // milliseconds
  beepInterval: number; // milliseconds between beeps
  patternRepeat: number; // number of pattern repetitions
  
  // Percentage-based thresholds (% of operation quantity)
  preAlarmPercentage: number;    // Default: 10% (when 90% complete)
  overshootWarningPercentage: number; // Default: 2% (2% past target)
  overshootAlarmPercentage: number;   // Default: 5% (5% past target)
  
  // Visual settings
  showVisualAlarms: boolean;
  flashOnAlarm: boolean;
  
  // Operation-specific settings
  enableLoadingAlarms: boolean;
  enableUnloadingAlarms: boolean;
  
  // Timing settings
  alarmDelaySeconds: number;     // Delay before triggering alarm
  autoResetAfterSeconds: number; // Auto-reset alarm after this time
  
  // Metadata
  lastUpdated: string;
  version: string;
}

export interface AlarmThresholds {
  operationType: OperationType;
  operationQuantity: number;     // m³
  initialVolume: number;         // m³
  targetVolume: number;          // m³
  
  // Calculated threshold volumes
  preAlarmVolume: number;        // Volume at which pre-alarm triggers
  overshootWarningVolume: number; // Volume at which overshoot warning triggers
  overshootAlarmVolume: number;   // Volume at which overshoot alarm triggers
}

export interface AlarmStatus {
  currentState: AlarmState;
  previousState: AlarmState;
  
  // Current operation context
  operationType: OperationType;
  currentVolume: number;         // m³
  targetVolume: number;          // m³
  
  // Progress tracking
  progressPercentage: number;    // 0-100% of operation complete
  overshootPercentage: number;   // % past target (negative if under target)
  
  // Timing
  alarmTriggeredAt: Date | null;
  timeInCurrentState: number;    // seconds
  
  // Status flags
  isAudioPlaying: boolean;
  shouldFlash: boolean;
  requiresAcknowledgment: boolean;
}

export interface AlarmEvent {
  id: string;
  timestamp: Date;
  alarmState: AlarmState;
  operationType: OperationType;
  
  // Volume context
  currentVolume: number;
  targetVolume: number;
  overshootAmount: number;       // m³ past target (negative if under)
  
  // Event details
  message: string;
  severity: 'info' | 'warning' | 'critical';
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
}

/**
 * Default alarm configuration for maritime operations
 */
export const DEFAULT_ALARM_CONFIG: AlarmConfiguration = {
  id: 'default-maritime-alarms',
  enabled: true,
  
  // Audio settings
  audioEnabled: true,
  audioVolume: 75,
  audioType: 'beep',
  audioFrequency: 800, // Maritime standard frequency
  beepDuration: 200,
  beepInterval: 500,
  patternRepeat: 3,
  
  // Percentage-based thresholds
  preAlarmPercentage: 10,        // Alert when 90% complete
  overshootWarningPercentage: 2, // Warning at 2% overshoot
  overshootAlarmPercentage: 5,   // Alarm at 5% overshoot
  
  // Visual settings
  showVisualAlarms: true,
  flashOnAlarm: true,
  
  // Operation-specific settings
  enableLoadingAlarms: true,
  enableUnloadingAlarms: true,
  
  // Timing settings
  alarmDelaySeconds: 3,          // 3 second delay to avoid false alarms
  autoResetAfterSeconds: 300,    // Auto-reset after 5 minutes
  
  // Metadata
  lastUpdated: new Date().toISOString(),
  version: '1.0.0'
};

/**
 * Alarm severity levels for different states
 */
export const ALARM_SEVERITY_MAP: Record<AlarmState, 'info' | 'warning' | 'critical'> = {
  NORMAL: 'info',
  PRE_ALARM: 'warning',
  TARGET_REACHED: 'info',
  OVERSHOOT_WARNING: 'warning',
  OVERSHOOT_ALARM: 'critical'
};

/**
 * Color schemes for different alarm states
 */
export const ALARM_COLOR_MAP: Record<AlarmState, { bg: string; border: string; text: string }> = {
  NORMAL: {
    bg: 'bg-green-100',
    border: 'border-green-400',
    text: 'text-green-800'
  },
  PRE_ALARM: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-400',
    text: 'text-yellow-800'
  },
  TARGET_REACHED: {
    bg: 'bg-blue-100',
    border: 'border-blue-400',
    text: 'text-blue-800'
  },
  OVERSHOOT_WARNING: {
    bg: 'bg-orange-100',
    border: 'border-orange-400',
    text: 'text-orange-800'
  },
  OVERSHOOT_ALARM: {
    bg: 'bg-red-100',
    border: 'border-red-400',
    text: 'text-red-800'
  }
};

/**
 * Utility functions for alarm state management
 */
export const AlarmStateUtils = {
  /**
   * Check if alarm state is critical
   */
  isCritical: (state: AlarmState): boolean => {
    return state === 'OVERSHOOT_ALARM';
  },

  /**
   * Check if alarm state requires attention
   */
  requiresAttention: (state: AlarmState): boolean => {
    return state === 'PRE_ALARM' || state === 'OVERSHOOT_WARNING' || state === 'OVERSHOOT_ALARM';
  },

  /**
   * Check if alarm state is successful
   */
  isSuccessful: (state: AlarmState): boolean => {
    return state === 'TARGET_REACHED';
  },

  /**
   * Check if state transition is valid
   */
  isValidTransition: (from: AlarmState, to: AlarmState): boolean => {
    return ALARM_STATE_TRANSITIONS[from].includes(to);
  },

  /**
   * Get alarm state priority (lower number = higher priority)
   */
  getPriority: (state: AlarmState): number => {
    return ALARM_PRIORITY[state];
  },

  /**
   * Compare alarm states by priority
   */
  comparePriority: (a: AlarmState, b: AlarmState): number => {
    return ALARM_PRIORITY[a] - ALARM_PRIORITY[b];
  },

  /**
   * Get display name for alarm state
   */
  getDisplayName: (state: AlarmState): string => {
    switch (state) {
      case 'NORMAL': return 'Normal';
      case 'PRE_ALARM': return 'Pre-Alarm';
      case 'TARGET_REACHED': return 'Target Reached';
      case 'OVERSHOOT_WARNING': return 'Overshoot Warning';
      case 'OVERSHOOT_ALARM': return 'Overshoot Alarm';
      default: return 'Unknown';
    }
  },

  /**
   * Get icon for alarm state
   */
  getIcon: (state: AlarmState): string => {
    switch (state) {
      case 'NORMAL': return '✅';
      case 'PRE_ALARM': return '⚠️';
      case 'TARGET_REACHED': return '🎯';
      case 'OVERSHOOT_WARNING': return '⚠️';
      case 'OVERSHOOT_ALARM': return '🚨';
      default: return '❓';
    }
  }
};
