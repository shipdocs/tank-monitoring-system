/**
 * Test suite for AlarmConfigurationService
 * 
 * Tests localStorage persistence, threshold calculations, and alarm state logic
 */

import { AlarmConfigurationService } from '../services/AlarmConfigurationService';
import { DEFAULT_ALARM_CONFIG } from '../types/alarm';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('AlarmConfigurationService', () => {
  let service: AlarmConfigurationService;

  beforeEach(() => {
    localStorage.clear();
    service = AlarmConfigurationService.getInstance();
  });

  describe('Configuration Management', () => {
    test('should return default configuration when no stored config exists', () => {
      const config = service.getConfiguration();
      expect(config.enabled).toBe(true);
      expect(config.preAlarmPercentage).toBe(10);
      expect(config.overshootWarningPercentage).toBe(2);
      expect(config.overshootAlarmPercentage).toBe(5);
    });

    test('should save and retrieve configuration from localStorage', () => {
      const testConfig = {
        ...DEFAULT_ALARM_CONFIG,
        preAlarmPercentage: 15,
        audioVolume: 50
      };

      service.saveConfiguration(testConfig);
      const retrievedConfig = service.getConfiguration();

      expect(retrievedConfig.preAlarmPercentage).toBe(15);
      expect(retrievedConfig.audioVolume).toBe(50);
    });

    test('should validate configuration correctly', () => {
      // Valid configuration
      const validConfig = {
        preAlarmPercentage: 10,
        overshootWarningPercentage: 2,
        overshootAlarmPercentage: 5,
        audioVolume: 75
      };

      const validResult = service.validateConfiguration(validConfig);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid configuration
      const invalidConfig = {
        preAlarmPercentage: 60, // Too high
        overshootWarningPercentage: 10,
        overshootAlarmPercentage: 5, // Less than warning
        audioVolume: 150 // Too high
      };

      const invalidResult = service.validateConfiguration(invalidConfig);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Threshold Calculations', () => {
    test('should calculate loading operation thresholds correctly', () => {
      const thresholds = service.calculateAlarmThresholds(
        'loading',
        1000, // 1000 m³ operation
        2000  // 2000 m³ initial volume
      );

      expect(thresholds.operationType).toBe('loading');
      expect(thresholds.targetVolume).toBe(3000); // 2000 + 1000
      expect(thresholds.preAlarmVolume).toBe(2900); // 3000 - (1000 * 0.10)
      expect(thresholds.overshootWarningVolume).toBe(3020); // 3000 + (1000 * 0.02)
      expect(thresholds.overshootAlarmVolume).toBe(3050); // 3000 + (1000 * 0.05)
    });

    test('should calculate unloading operation thresholds correctly', () => {
      const thresholds = service.calculateAlarmThresholds(
        'unloading',
        800,  // 800 m³ operation
        2000  // 2000 m³ initial volume
      );

      expect(thresholds.operationType).toBe('unloading');
      expect(thresholds.targetVolume).toBe(1200); // 2000 - 800
      expect(thresholds.preAlarmVolume).toBe(1280); // 1200 + (800 * 0.10)
      expect(thresholds.overshootWarningVolume).toBe(1184); // 1200 - (800 * 0.02)
      expect(thresholds.overshootAlarmVolume).toBe(1160); // 1200 - (800 * 0.05)
    });

    test('should prevent negative target volumes', () => {
      const thresholds = service.calculateAlarmThresholds(
        'unloading',
        3000, // Trying to unload more than available
        2000  // 2000 m³ initial volume
      );

      expect(thresholds.targetVolume).toBe(0); // Should be clamped to 0
    });
  });

  describe('Alarm State Determination', () => {
    test('should determine NORMAL state correctly for loading', () => {
      const thresholds = service.calculateAlarmThresholds('loading', 1000, 2000);
      
      // Current volume below pre-alarm threshold
      const state = service.determineAlarmState(2800, thresholds);
      expect(state).toBe('NORMAL');
    });

    test('should determine PRE_ALARM state correctly for loading', () => {
      const thresholds = service.calculateAlarmThresholds('loading', 1000, 2000);
      
      // Current volume at pre-alarm threshold
      const state = service.determineAlarmState(2950, thresholds);
      expect(state).toBe('PRE_ALARM');
    });

    test('should determine TARGET_REACHED state correctly for loading', () => {
      const thresholds = service.calculateAlarmThresholds('loading', 1000, 2000);
      
      // Current volume at target
      const state = service.determineAlarmState(3000, thresholds);
      expect(state).toBe('TARGET_REACHED');
    });

    test('should determine OVERSHOOT_WARNING state correctly for loading', () => {
      const thresholds = service.calculateAlarmThresholds('loading', 1000, 2000);
      
      // Current volume in overshoot warning range
      const state = service.determineAlarmState(3030, thresholds);
      expect(state).toBe('OVERSHOOT_WARNING');
    });

    test('should determine OVERSHOOT_ALARM state correctly for loading', () => {
      const thresholds = service.calculateAlarmThresholds('loading', 1000, 2000);
      
      // Current volume in overshoot alarm range
      const state = service.determineAlarmState(3100, thresholds);
      expect(state).toBe('OVERSHOOT_ALARM');
    });

    test('should handle disabled alarms', () => {
      const config = {
        ...DEFAULT_ALARM_CONFIG,
        enableLoadingAlarms: false
      };

      const thresholds = service.calculateAlarmThresholds('loading', 1000, 2000, config);
      
      // Should return NORMAL even in overshoot condition
      const state = service.determineAlarmState(3100, thresholds, config);
      expect(state).toBe('NORMAL');
    });
  });

  describe('Progress Calculations', () => {
    test('should calculate loading progress correctly', () => {
      const thresholds = service.calculateAlarmThresholds('loading', 1000, 2000);
      
      // 50% loaded (2500 out of 2000->3000)
      const progress = service.calculateProgress(2500, thresholds);
      expect(progress.progressPercentage).toBe(50);
      expect(progress.overshootPercentage).toBe(0);
    });

    test('should calculate loading overshoot correctly', () => {
      const thresholds = service.calculateAlarmThresholds('loading', 1000, 2000);
      
      // 10% overshoot (3100 vs 3000 target, 100/1000 = 10%)
      const progress = service.calculateProgress(3100, thresholds);
      expect(progress.progressPercentage).toBe(100);
      expect(progress.overshootPercentage).toBe(10);
    });

    test('should calculate unloading progress correctly', () => {
      const thresholds = service.calculateAlarmThresholds('unloading', 800, 2000);
      
      // 50% unloaded (1600 out of 2000->1200)
      const progress = service.calculateProgress(1600, thresholds);
      expect(progress.progressPercentage).toBe(50);
      expect(progress.overshootPercentage).toBe(0);
    });

    test('should calculate unloading overshoot correctly', () => {
      const thresholds = service.calculateAlarmThresholds('unloading', 800, 2000);
      
      // 5% overshoot (1160 vs 1200 target, 40/800 = 5%)
      const progress = service.calculateProgress(1160, thresholds);
      expect(progress.progressPercentage).toBe(100);
      expect(progress.overshootPercentage).toBe(5);
    });
  });

  describe('Import/Export', () => {
    test('should export configuration as JSON', () => {
      const config = service.getConfiguration();
      const exported = service.exportConfiguration();
      
      const parsed = JSON.parse(exported);
      expect(parsed.enabled).toBe(config.enabled);
      expect(parsed.preAlarmPercentage).toBe(config.preAlarmPercentage);
    });

    test('should import valid configuration', () => {
      const testConfig = {
        ...DEFAULT_ALARM_CONFIG,
        preAlarmPercentage: 20,
        audioVolume: 60
      };

      const result = service.importConfiguration(JSON.stringify(testConfig));
      expect(result.success).toBe(true);

      const imported = service.getConfiguration();
      expect(imported.preAlarmPercentage).toBe(20);
      expect(imported.audioVolume).toBe(60);
    });

    test('should reject invalid configuration import', () => {
      const invalidConfig = {
        preAlarmPercentage: 200, // Invalid value
        audioVolume: -50
      };

      const result = service.importConfiguration(JSON.stringify(invalidConfig));
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid configuration');
    });
  });
});

// Integration code and manual console logs removed to keep the test suite focused.
