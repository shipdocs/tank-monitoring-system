/**
 * AlarmConfigurationService - Manages alarm configuration with localStorage
 * 
 * This service handles configuration of maritime alarm system:
 * - Percentage-based threshold configuration
 * - Audio and visual alarm settings
 * - Operation-specific alarm controls
 * - localStorage persistence
 */

import {
  AlarmConfiguration,
  DEFAULT_ALARM_CONFIG,
  AlarmThresholds,
  AlarmState,
  OperationType
} from '../types/alarm';

export class AlarmConfigurationService {
  private static instance: AlarmConfigurationService;
  private storageKey = 'tank-alarm-config-v1';

  private constructor() {}

  static getInstance(): AlarmConfigurationService {
    if (!AlarmConfigurationService.instance) {
      AlarmConfigurationService.instance = new AlarmConfigurationService();
    }
    return AlarmConfigurationService.instance;
  }

  /**
   * Get current alarm configuration
   */
  getConfiguration(): AlarmConfiguration {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const config = JSON.parse(stored);
        // Ensure all required fields exist (for backward compatibility)
        return { ...DEFAULT_ALARM_CONFIG, ...config };
      }
    } catch (error) {
      console.warn('Failed to load alarm configuration:', error);
    }

    // Return default configuration
    return this.getDefaultConfiguration();
  }

  /**
   * Save alarm configuration
   */
  saveConfiguration(config: AlarmConfiguration): void {
    try {
      config.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(config));
      // Configuration saved successfully (removed console.log for production)
    } catch (error) {
      console.error('❌ Failed to save alarm configuration:', error);
      throw error;
    }
  }

  /**
   * Get default alarm configuration
   */
  getDefaultConfiguration(): AlarmConfiguration {
    return {
      ...DEFAULT_ALARM_CONFIG,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Calculate alarm thresholds for an operation
   */
  calculateAlarmThresholds(
    operationType: OperationType,
    operationQuantity: number,
    initialVolume: number,
    config?: AlarmConfiguration
  ): AlarmThresholds {
    // Validate input parameters
    if (operationQuantity <= 0) {
      throw new Error('Operation quantity must be positive');
    }
    if (initialVolume < 0) {
      throw new Error('Initial volume cannot be negative');
    }

    const alarmConfig = config || this.getConfiguration();
    
    // Calculate target volume
    const targetVolume = operationType === 'loading' 
      ? initialVolume + operationQuantity
      : initialVolume - operationQuantity;

    // Calculate threshold offsets based on operation quantity percentages
    const preAlarmOffset = operationQuantity * (alarmConfig.preAlarmPercentage / 100);
    const overshootWarningOffset = operationQuantity * (alarmConfig.overshootWarningPercentage / 100);
    const overshootAlarmOffset = operationQuantity * (alarmConfig.overshootAlarmPercentage / 100);

    let preAlarmVolume: number;
    let overshootWarningVolume: number;
    let overshootAlarmVolume: number;

    if (operationType === 'loading') {
      // For loading: pre-alarm before target, overshoot after target
      preAlarmVolume = targetVolume - preAlarmOffset;
      overshootWarningVolume = targetVolume + overshootWarningOffset;
      overshootAlarmVolume = targetVolume + overshootAlarmOffset;
    } else {
      // For unloading: pre-alarm before target, overshoot after target (lower volume)
      preAlarmVolume = targetVolume + preAlarmOffset;
      overshootWarningVolume = targetVolume - overshootWarningOffset;
      overshootAlarmVolume = targetVolume - overshootAlarmOffset;
    }

    return {
      operationType,
      operationQuantity,
      initialVolume,
      targetVolume: Math.max(0, targetVolume), // Ensure non-negative
      preAlarmVolume: Math.max(0, preAlarmVolume),
      overshootWarningVolume: Math.max(0, overshootWarningVolume),
      overshootAlarmVolume: Math.max(0, overshootAlarmVolume)
    };
  }

  /**
   * Determine alarm state based on current volume and thresholds
   */
  determineAlarmState(
    currentVolume: number,
    thresholds: AlarmThresholds,
    config?: AlarmConfiguration
  ): AlarmState {
    const alarmConfig = config || this.getConfiguration();
    
    // Check if alarms are enabled for this operation type
    if (thresholds.operationType === 'loading' && !alarmConfig.enableLoadingAlarms) {
      return 'NORMAL';
    }
    if (thresholds.operationType === 'unloading' && !alarmConfig.enableUnloadingAlarms) {
      return 'NORMAL';
    }

    const { targetVolume, preAlarmVolume, overshootWarningVolume, overshootAlarmVolume } = thresholds;

    if (thresholds.operationType === 'loading') {
      // Loading operation logic
      if (currentVolume >= overshootAlarmVolume) {
        return 'OVERSHOOT_ALARM';
      } else if (currentVolume >= overshootWarningVolume) {
        return 'OVERSHOOT_WARNING';
      } else if (currentVolume >= targetVolume) {
        return 'TARGET_REACHED';
      } else if (currentVolume >= preAlarmVolume) {
        return 'PRE_ALARM';
      } else {
        return 'NORMAL';
      }
    } else {
      // Unloading operation logic (volumes decrease)
      if (currentVolume <= overshootAlarmVolume) {
        return 'OVERSHOOT_ALARM';
      } else if (currentVolume <= overshootWarningVolume) {
        return 'OVERSHOOT_WARNING';
      } else if (currentVolume <= targetVolume) {
        return 'TARGET_REACHED';
      } else if (currentVolume <= preAlarmVolume) {
        return 'PRE_ALARM';
      } else {
        return 'NORMAL';
      }
    }
  }

  /**
   * Calculate progress and overshoot percentages
   */
  calculateProgress(
    currentVolume: number,
    thresholds: AlarmThresholds
  ): { progressPercentage: number; overshootPercentage: number } {
    const { initialVolume, targetVolume, operationQuantity, operationType } = thresholds;
    
    let progressPercentage = 0;
    let overshootPercentage = 0;

    if (operationQuantity > 0) {
      if (operationType === 'loading') {
        const volumeChange = currentVolume - initialVolume;
        progressPercentage = Math.max(0, (volumeChange / operationQuantity) * 100);
        
        if (currentVolume > targetVolume) {
          overshootPercentage = ((currentVolume - targetVolume) / operationQuantity) * 100;
        }
      } else {
        const volumeChange = initialVolume - currentVolume;
        progressPercentage = Math.max(0, (volumeChange / operationQuantity) * 100);
        
        if (currentVolume < targetVolume) {
          overshootPercentage = ((targetVolume - currentVolume) / operationQuantity) * 100;
        }
      }
    }

    return {
      progressPercentage: Math.min(progressPercentage, 100),
      overshootPercentage: Math.max(0, overshootPercentage)
    };
  }

  /**
   * Validate alarm configuration
   */
  validateConfiguration(config: Partial<AlarmConfiguration>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate percentage ranges
    if (config.preAlarmPercentage !== undefined) {
      if (config.preAlarmPercentage < 1 || config.preAlarmPercentage > 50) {
        errors.push('Pre-alarm percentage must be between 1% and 50%');
      }
    }

    if (config.overshootWarningPercentage !== undefined) {
      if (config.overshootWarningPercentage < 0.5 || config.overshootWarningPercentage > 20) {
        errors.push('Overshoot warning percentage must be between 0.5% and 20%');
      }
    }

    if (config.overshootAlarmPercentage !== undefined) {
      if (config.overshootAlarmPercentage < 1 || config.overshootAlarmPercentage > 30) {
        errors.push('Overshoot alarm percentage must be between 1% and 30%');
      }
    }

    // Validate audio settings
    if (config.audioVolume !== undefined) {
      if (config.audioVolume < 0 || config.audioVolume > 100) {
        errors.push('Audio volume must be between 0% and 100%');
      }
    }

    if (config.audioFrequency !== undefined) {
      if (config.audioFrequency < 200 || config.audioFrequency > 2000) {
        errors.push('Audio frequency must be between 200Hz and 2000Hz');
      }
    }

    if (config.beepDuration !== undefined) {
      if (config.beepDuration < 50 || config.beepDuration > 2000) {
        errors.push('Beep duration must be between 50ms and 2000ms');
      }
    }

    if (config.beepInterval !== undefined) {
      if (config.beepInterval < 100 || config.beepInterval > 5000) {
        errors.push('Beep interval must be between 100ms and 5000ms');
      }
    }

    if (config.patternRepeat !== undefined) {
      if (config.patternRepeat < 1 || config.patternRepeat > 10) {
        errors.push('Pattern repeat must be between 1 and 10');
      }
    }

    // Validate timing settings
    if (config.alarmDelaySeconds !== undefined) {
      if (config.alarmDelaySeconds < 0 || config.alarmDelaySeconds > 60) {
        errors.push('Alarm delay must be between 0 and 60 seconds');
      }
    }

    if (config.autoResetAfterSeconds !== undefined) {
      if (config.autoResetAfterSeconds < 30 || config.autoResetAfterSeconds > 3600) {
        errors.push('Auto-reset time must be between 30 seconds and 1 hour');
      }
    }

    // Validate logical relationships
    if (config.overshootWarningPercentage !== undefined && config.overshootAlarmPercentage !== undefined) {
      if (config.overshootWarningPercentage >= config.overshootAlarmPercentage) {
        errors.push('Overshoot warning percentage must be less than overshoot alarm percentage');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): AlarmConfiguration {
    const defaultConfig = this.getDefaultConfiguration();
    this.saveConfiguration(defaultConfig);
    return defaultConfig;
  }

  /**
   * Export configuration for backup
   */
  exportConfiguration(): string {
    const config = this.getConfiguration();
    return JSON.stringify(config, null, 2);
  }

  /**
   * Get audio configuration for AudioAlarmService
   */
  getAudioConfiguration() {
    const config = this.getConfiguration();
    return {
      enabled: config.audioEnabled,
      volume: config.audioVolume,
      audioType: config.audioType,
      frequency: config.audioFrequency,
      beepDuration: config.beepDuration,
      beepInterval: config.beepInterval,
      patternRepeat: config.patternRepeat
    };
  }

  /**
   * Update audio configuration
   */
  updateAudioConfiguration(audioConfig: {
    enabled?: boolean;
    volume?: number;
    audioType?: string;
    frequency?: number;
    beepDuration?: number;
    beepInterval?: number;
    patternRepeat?: number;
  }): void {
    const currentConfig = this.getConfiguration();
    const updatedConfig = {
      ...currentConfig,
      audioEnabled: audioConfig.enabled ?? currentConfig.audioEnabled,
      audioVolume: audioConfig.volume ?? currentConfig.audioVolume,
      audioType: audioConfig.audioType ?? currentConfig.audioType,
      audioFrequency: audioConfig.frequency ?? currentConfig.audioFrequency,
      beepDuration: audioConfig.beepDuration ?? currentConfig.beepDuration,
      beepInterval: audioConfig.beepInterval ?? currentConfig.beepInterval,
      patternRepeat: audioConfig.patternRepeat ?? currentConfig.patternRepeat
    };

    this.saveConfiguration(updatedConfig);
  }

  /**
   * Import configuration from backup
   */
  importConfiguration(configJson: string): { success: boolean; message: string } {
    try {
      const config = JSON.parse(configJson) as AlarmConfiguration;
      
      const validation = this.validateConfiguration(config);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid configuration: ${validation.errors.join(', ')}`
        };
      }

      this.saveConfiguration(config);
      return {
        success: true,
        message: 'Alarm configuration imported successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
