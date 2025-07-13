/**
 * AlarmStateService - Real-time alarm state management
 * 
 * This service manages the real-time alarm state for maritime operations:
 * - Tracks current alarm status
 * - Manages alarm state transitions
 * - Handles alarm timing and delays
 * - Provides alarm status updates
 */

import {
  AlarmState,
  AlarmStatus,
  AlarmEvent,
  OperationType,
  ALARM_SEVERITY_MAP
} from '../types/alarm';
import { AlarmConfigurationService } from './AlarmConfigurationService';
import { AudioAlarmService } from './AudioAlarmService';

export class AlarmStateService {
  private static instance: AlarmStateService;
  private configService: AlarmConfigurationService;
  private audioService: AudioAlarmService;
  
  // Current alarm state
  private currentStatus: AlarmStatus | null = null;
  private alarmHistory: AlarmEvent[] = [];
  
  // Timing management (browser-compatible timer types)
  private stateChangeTimer: number | null = null;
  private alarmDelayTimer: number | null = null;
  
  // Event listeners
  private statusChangeListeners: ((status: AlarmStatus | null) => void)[] = [];
  private alarmEventListeners: ((event: AlarmEvent) => void)[] = [];

  private constructor() {
    this.configService = AlarmConfigurationService.getInstance();
    this.audioService = AudioAlarmService.getInstance();
  }

  static getInstance(): AlarmStateService {
    if (!AlarmStateService.instance) {
      AlarmStateService.instance = new AlarmStateService();
    }
    return AlarmStateService.instance;
  }

  /**
   * Update alarm state based on current volume and operation
   */
  updateAlarmState(
    currentVolume: number,
    operationType: OperationType,
    operationQuantity: number,
    initialVolume: number
  ): AlarmStatus {
    const config = this.configService.getConfiguration();
    
    // Calculate thresholds for current operation
    const thresholds = this.configService.calculateAlarmThresholds(
      operationType,
      operationQuantity,
      initialVolume,
      config
    );

    // Determine new alarm state
    const newState = this.configService.determineAlarmState(currentVolume, thresholds, config);
    
    // Calculate progress
    const progress = this.configService.calculateProgress(currentVolume, thresholds);

    // Get previous state
    const previousState = this.currentStatus?.currentState || 'NORMAL';

    // Create new status
    const newStatus: AlarmStatus = {
      currentState: newState,
      previousState,
      operationType,
      currentVolume,
      targetVolume: thresholds.targetVolume,
      progressPercentage: progress.progressPercentage,
      overshootPercentage: progress.overshootPercentage,
      alarmTriggeredAt: this.getAlarmTriggeredTime(newState, previousState),
      timeInCurrentState: this.calculateTimeInState(newState, previousState),
      isAudioPlaying: this.shouldPlayAudio(newState, config),
      shouldFlash: this.shouldFlash(newState, config),
      requiresAcknowledgment: this.requiresAcknowledgment(newState)
    };

    // Handle state change
    if (newState !== previousState) {
      this.handleStateChange(newStatus);
    }

    // Update current status
    this.currentStatus = newStatus;

    // Notify listeners
    this.notifyStatusChange(newStatus);

    return newStatus;
  }

  /**
   * Get current alarm status
   */
  getCurrentStatus(): AlarmStatus | null {
    return this.currentStatus;
  }

  /**
   * Get alarm history
   */
  getAlarmHistory(limit?: number): AlarmEvent[] {
    return limit ? this.alarmHistory.slice(-limit) : [...this.alarmHistory];
  }

  /**
   * Clear alarm history
   */
  clearAlarmHistory(): void {
    this.alarmHistory = [];
  }

  /**
   * Acknowledge current alarm
   */
  acknowledgeAlarm(acknowledgedBy: string = 'operator'): boolean {
    if (!this.currentStatus || !this.requiresAcknowledgment(this.currentStatus.currentState)) {
      return false;
    }

    // Update current status
    this.currentStatus.requiresAcknowledgment = false;
    this.currentStatus.isAudioPlaying = false;

    // Stop audio alarm
    this.audioService.stopAlarm();

    // Update alarm history
    const lastEvent = this.alarmHistory[this.alarmHistory.length - 1];
    if (lastEvent
        && !lastEvent.acknowledged
        && lastEvent.alarmState === this.currentStatus.currentState
    ) {
      lastEvent.acknowledged = true;
      lastEvent.acknowledgedAt = new Date();
      lastEvent.acknowledgedBy = acknowledgedBy;
    }

    // Notify listeners
    this.notifyStatusChange(this.currentStatus);

    return true;
  }

  /**
   * Add status change listener
   */
  addStatusChangeListener(listener: (status: AlarmStatus | null) => void): void {
    this.statusChangeListeners.push(listener);
  }

  /**
   * Remove status change listener
   */
  removeStatusChangeListener(listener: (status: AlarmStatus | null) => void): void {
    const index = this.statusChangeListeners.indexOf(listener);
    if (index > -1) {
      this.statusChangeListeners.splice(index, 1);
    }
  }

  /**
   * Add alarm event listener
   */
  addAlarmEventListener(listener: (event: AlarmEvent) => void): void {
    this.alarmEventListeners.push(listener);
  }

  /**
   * Remove alarm event listener
   */
  removeAlarmEventListener(listener: (event: AlarmEvent) => void): void {
    const index = this.alarmEventListeners.indexOf(listener);
    if (index > -1) {
      this.alarmEventListeners.splice(index, 1);
    }
  }

  /**
   * Reset alarm state
   */
  resetAlarmState(): void {
    // Clear timers
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
      this.stateChangeTimer = null;
    }
    if (this.alarmDelayTimer) {
      clearTimeout(this.alarmDelayTimer);
      this.alarmDelayTimer = null;
    }

    // Stop any playing audio alarms
    this.audioService.stopAlarm();

    // Reset status
    this.currentStatus = null;

    // Notify listeners of the reset
    this.statusChangeListeners.forEach(listener => {
      try {
        listener(null);
      } catch (error) {
        console.error('Error in alarm status change listener during reset:', error);
      }
    });
  }

  // Private helper methods

  private handleStateChange(newStatus: AlarmStatus): void {
    const config = this.configService.getConfiguration();

    // Create alarm event
    const event: AlarmEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      alarmState: newStatus.currentState,
      operationType: newStatus.operationType,
      currentVolume: newStatus.currentVolume,
      targetVolume: newStatus.targetVolume,
      overshootAmount: this.calculateOvershootAmount(newStatus),
      message: this.generateAlarmMessage(newStatus),
      severity: ALARM_SEVERITY_MAP[newStatus.currentState],
      acknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null
    };

    // Add to history
    this.alarmHistory.push(event);

    // Limit history size (keep last 100 events)
    if (this.alarmHistory.length > 100) {
      this.alarmHistory = this.alarmHistory.slice(-100);
    }

    // Trigger audio alarm if enabled
    this.triggerAudioAlarm(newStatus.currentState, config);

    // Handle alarm delay for critical alarms
    if (this.requiresDelay(newStatus.currentState) && config.alarmDelaySeconds > 0) {
      this.alarmDelayTimer = setTimeout(() => {
        this.notifyAlarmEvent(event);
      }, config.alarmDelaySeconds * 1000);
    } else {
      this.notifyAlarmEvent(event);
    }

    // Set auto-reset timer for persistent alarms
    if (this.shouldAutoReset(newStatus.currentState) && config.autoResetAfterSeconds > 0) {
      this.stateChangeTimer = setTimeout(() => {
        this.resetAlarmState();
      }, config.autoResetAfterSeconds * 1000);
    }
  }

  private getAlarmTriggeredTime(newState: AlarmState, previousState: AlarmState): Date | null {
    if (newState !== previousState && newState !== 'NORMAL') {
      return new Date();
    }
    return this.currentStatus?.alarmTriggeredAt || null;
  }

  private calculateTimeInState(newState: AlarmState, previousState: AlarmState): number {
    if (newState !== previousState) {
      return 0;
    }
    const triggeredAt = this.currentStatus?.alarmTriggeredAt;
    if (triggeredAt) {
      return Math.floor((Date.now() - triggeredAt.getTime()) / 1000);
    }
    return 0;
  }

  private shouldPlayAudio(state: AlarmState, config: { audioEnabled: boolean }): boolean {
    if (!config.audioEnabled) return false;
    return state === 'OVERSHOOT_WARNING' || state === 'OVERSHOOT_ALARM';
  }

  private shouldFlash(state: AlarmState, config: { flashOnAlarm: boolean }): boolean {
    if (!config.flashOnAlarm) return false;
    return state === 'OVERSHOOT_ALARM';
  }

  /**
   * Trigger audio alarm based on state
   */
  private async triggerAudioAlarm(state: AlarmState, config: { audioEnabled: boolean; enableLoadingAlarms: boolean; enableUnloadingAlarms: boolean }): Promise<void> {
    if (!config.audioEnabled) {
      return;
    }

    // Check if operation-specific alarms are enabled
    const currentStatus = this.getCurrentStatus();
    if (currentStatus) {
      if (currentStatus.operationType === 'loading' && !config.enableLoadingAlarms) {
        return;
      }
      if (currentStatus.operationType === 'unloading' && !config.enableUnloadingAlarms) {
        return;
      }
    }

    // Get audio configuration
    const audioConfig = this.configService.getAudioConfiguration();

    try {
      // Play alarm sound for the current state
      await this.audioService.playAlarmForState(state, audioConfig);
    } catch (error) {
      console.error('Failed to play audio alarm:', error);
    }
  }

  private requiresAcknowledgment(state: AlarmState): boolean {
    return state === 'OVERSHOOT_ALARM';
  }

  private requiresDelay(state: AlarmState): boolean {
    return state === 'OVERSHOOT_WARNING' || state === 'OVERSHOOT_ALARM';
  }

  private shouldAutoReset(state: AlarmState): boolean {
    return state === 'OVERSHOOT_WARNING' || state === 'OVERSHOOT_ALARM';
  }

  private calculateOvershootAmount(status: AlarmStatus): number {
    const { currentVolume, targetVolume, operationType } = status;
    
    if (operationType === 'loading') {
      return currentVolume - targetVolume;
    } else {
      return targetVolume - currentVolume;
    }
  }

  private generateAlarmMessage(status: AlarmStatus): string {
    const { currentState, operationType, currentVolume, targetVolume } = status;
    const overshootAmount = Math.abs(this.calculateOvershootAmount(status));

    switch (currentState) {
      case 'NORMAL':
        return `${operationType} operation in progress`;
      case 'PRE_ALARM':
        return `Approaching target: ${currentVolume.toFixed(1)}m³ → ${targetVolume.toFixed(1)}m³`;
      case 'TARGET_REACHED':
        return `🎯 Target reached: ${targetVolume.toFixed(1)}m³`;
      case 'OVERSHOOT_WARNING':
        return `⚠️ Overshoot warning: ${overshootAmount.toFixed(1)}m³ past target`;
      case 'OVERSHOOT_ALARM':
        return `🚨 OVERSHOOT ALARM: ${overshootAmount.toFixed(1)}m³ past target`;
      default:
        return 'Unknown alarm state';
    }
  }

  private generateEventId(): string {
    return `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifyStatusChange(status: AlarmStatus): void {
    this.statusChangeListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in alarm status change listener:', error);
      }
    });
  }

  private notifyAlarmEvent(event: AlarmEvent): void {
    this.alarmEventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in alarm event listener:', error);
      }
    });
  }
}
