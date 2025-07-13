/**
 * Alarm System Tests - Comprehensive test suite for maritime alarm system
 * 
 * Tests cover:
 * - Alarm configuration service
 * - Alarm state management
 * - Audio alarm functionality
 * - Flow rate calculations
 * - Integration scenarios
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlarmConfigurationService } from '../services/AlarmConfigurationService';
import { AlarmStateService } from '../services/AlarmStateService';
import { AudioAlarmService } from '../services/AudioAlarmService';
import { FlowRateCalculationService } from '../services/FlowRateCalculationService';
import { DEFAULT_ALARM_CONFIG } from '../types/alarm';
import { Tank } from '../types/tank';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Web Audio API
const mockAudioContext = {
  createOscillator: vi.fn(() => ({
    type: 'sine',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), value: 0.5 },
    connect: vi.fn(),
  })),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn(),
  close: vi.fn(),
};

Object.defineProperty(window, 'AudioContext', { 
  value: vi.fn(() => mockAudioContext),
  writable: true 
});

describe('AlarmConfigurationService', () => {
  let configService: AlarmConfigurationService;

  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    configService = AlarmConfigurationService.getInstance();
  });

  test('should return default configuration when no stored config exists', () => {
    localStorageMock.getItem.mockReturnValue(null);
    const config = configService.getConfiguration();
    expect(config).toEqual(DEFAULT_ALARM_CONFIG);
  });

  test('should save and retrieve configuration correctly', () => {
    const testConfig = {
      ...DEFAULT_ALARM_CONFIG,
      preAlarmPercentage: 15,
      audioVolume: 80
    };

    configService.saveConfiguration(testConfig);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'alarm-configuration',
      JSON.stringify(testConfig)
    );
  });

  test('should calculate alarm thresholds correctly for loading operation', () => {
    const thresholds = configService.calculateAlarmThresholds('loading', 500, 100);
    
    expect(thresholds.operationType).toBe('loading');
    expect(thresholds.initialVolume).toBe(100);
    expect(thresholds.operationQuantity).toBe(500);
    expect(thresholds.targetVolume).toBe(600); // 100 + 500
    expect(thresholds.preAlarmVolume).toBe(550); // 600 - (500 * 0.1)
    expect(thresholds.overshootWarningVolume).toBe(620); // 600 + (500 * 0.04)
    expect(thresholds.overshootAlarmVolume).toBe(650); // 600 + (500 * 0.1)
  });

  test('should calculate alarm thresholds correctly for unloading operation', () => {
    const thresholds = configService.calculateAlarmThresholds('unloading', 400, 800);
    
    expect(thresholds.operationType).toBe('unloading');
    expect(thresholds.initialVolume).toBe(800);
    expect(thresholds.operationQuantity).toBe(400);
    expect(thresholds.targetVolume).toBe(400); // 800 - 400
    expect(thresholds.preAlarmVolume).toBe(440); // 400 + (400 * 0.1)
    expect(thresholds.overshootWarningVolume).toBe(384); // 400 - (400 * 0.04)
    expect(thresholds.overshootAlarmVolume).toBe(360); // 400 - (400 * 0.1)
  });

  test('should determine correct alarm states', () => {
    const thresholds = configService.calculateAlarmThresholds('loading', 500, 100);
    
    expect(configService.determineAlarmState(300, thresholds)).toBe('NORMAL');
    expect(configService.determineAlarmState(550, thresholds)).toBe('PRE_ALARM');
    expect(configService.determineAlarmState(600, thresholds)).toBe('TARGET_REACHED');
    expect(configService.determineAlarmState(620, thresholds)).toBe('OVERSHOOT_WARNING');
    expect(configService.determineAlarmState(650, thresholds)).toBe('OVERSHOOT_ALARM');
  });

  test('should validate configuration correctly', () => {
    const validConfig = { ...DEFAULT_ALARM_CONFIG };
    const invalidConfig = {
      ...DEFAULT_ALARM_CONFIG,
      preAlarmPercentage: 50, // Invalid: too high
      audioVolume: 150 // Invalid: over 100%
    };

    expect(configService.validateConfiguration(validConfig).isValid).toBe(true);
    expect(configService.validateConfiguration(invalidConfig).isValid).toBe(false);
    expect(configService.validateConfiguration(invalidConfig).errors).toContain(
      'Pre-alarm percentage must be between 5% and 25%'
    );
    expect(configService.validateConfiguration(invalidConfig).errors).toContain(
      'Audio volume must be between 0% and 100%'
    );
  });

  test('should export and import configuration correctly', () => {
    const testConfig = { ...DEFAULT_ALARM_CONFIG, audioVolume: 75 };
    configService.saveConfiguration(testConfig);

    const exportResult = configService.exportConfiguration();
    expect(exportResult.success).toBe(true);
    expect(exportResult.data).toContain('"audioVolume":75');

    const importResult = configService.importConfiguration(exportResult.data);
    expect(importResult.success).toBe(true);
    
    const importedConfig = configService.getConfiguration();
    expect(importedConfig.audioVolume).toBe(75);
  });
});

describe('AlarmStateService', () => {
  let alarmStateService: AlarmStateService;

  beforeEach(() => {
    alarmStateService = AlarmStateService.getInstance();
    alarmStateService.resetAlarmState();
  });

  test('should update alarm state correctly for loading operation', () => {
    const status = alarmStateService.updateAlarmState(300, 'loading', 500, 100);
    
    expect(status).toBeDefined();
    expect(status!.operationType).toBe('loading');
    expect(status!.currentVolume).toBe(300);
    expect(status!.targetVolume).toBe(600);
    expect(status!.currentState).toBe('NORMAL');
    expect(status!.progressPercentage).toBeCloseTo(40, 1); // (300-100)/(600-100) * 100
  });

  test('should trigger pre-alarm state correctly', () => {
    const status = alarmStateService.updateAlarmState(550, 'loading', 500, 100);
    
    expect(status!.currentState).toBe('PRE_ALARM');
    expect(status!.progressPercentage).toBeCloseTo(90, 1);
  });

  test('should detect target reached', () => {
    const status = alarmStateService.updateAlarmState(600, 'loading', 500, 100);
    
    expect(status!.currentState).toBe('TARGET_REACHED');
    expect(status!.progressPercentage).toBe(100);
  });

  test('should detect overshoot warning', () => {
    const status = alarmStateService.updateAlarmState(620, 'loading', 500, 100);
    
    expect(status!.currentState).toBe('OVERSHOOT_WARNING');
    expect(status!.progressPercentage).toBeCloseTo(104, 1);
    expect(status!.overshootPercentage).toBeCloseTo(4, 1);
  });

  test('should detect critical overshoot alarm', () => {
    const status = alarmStateService.updateAlarmState(650, 'loading', 500, 100);
    
    expect(status!.currentState).toBe('OVERSHOOT_ALARM');
    expect(status!.progressPercentage).toBeCloseTo(110, 1);
    expect(status!.overshootPercentage).toBeCloseTo(10, 1);
    expect(status!.requiresAcknowledgment).toBe(true);
  });

  test('should handle unloading operation correctly', () => {
    const status = alarmStateService.updateAlarmState(600, 'unloading', 400, 800);
    
    expect(status!.operationType).toBe('unloading');
    expect(status!.targetVolume).toBe(400);
    expect(status!.currentState).toBe('NORMAL');
    expect(status!.progressPercentage).toBeCloseTo(50, 1); // (800-600)/(800-400) * 100
  });

  test('should track alarm history correctly', () => {
    // Trigger multiple alarm states
    alarmStateService.updateAlarmState(550, 'loading', 500, 100); // PRE_ALARM
    alarmStateService.updateAlarmState(600, 'loading', 500, 100); // TARGET_REACHED
    alarmStateService.updateAlarmState(650, 'loading', 500, 100); // OVERSHOOT_ALARM

    const history = alarmStateService.getAlarmHistory();
    expect(history).toHaveLength(3);
    expect(history[0].alarmState).toBe('OVERSHOOT_ALARM'); // Most recent first
    expect(history[1].alarmState).toBe('TARGET_REACHED');
    expect(history[2].alarmState).toBe('PRE_ALARM');
  });

  test('should acknowledge alarms correctly', () => {
    // Trigger critical alarm
    alarmStateService.updateAlarmState(650, 'loading', 500, 100);
    
    const statusBefore = alarmStateService.getCurrentStatus();
    expect(statusBefore!.requiresAcknowledgment).toBe(true);

    alarmStateService.acknowledgeAlarm('TestUser');
    
    const statusAfter = alarmStateService.getCurrentStatus();
    expect(statusAfter!.requiresAcknowledgment).toBe(false);

    const history = alarmStateService.getAlarmHistory();
    expect(history[0].acknowledged).toBe(true);
    expect(history[0].acknowledgedBy).toBe('TestUser');
  });

  test('should reset alarm state correctly', () => {
    // Set up alarm state
    alarmStateService.updateAlarmState(650, 'loading', 500, 100);
    expect(alarmStateService.getCurrentStatus()).toBeDefined();

    // Reset
    alarmStateService.resetAlarmState();
    expect(alarmStateService.getCurrentStatus()).toBeNull();
  });
});

describe('AudioAlarmService', () => {
  let audioService: AudioAlarmService;

  beforeEach(() => {
    audioService = AudioAlarmService.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    audioService.dispose();
  });

  test('should initialize audio context correctly', async () => {
    const result = await audioService.initializeAudio();
    expect(result).toBe(true);
    expect(mockAudioContext.createGain).toHaveBeenCalled();
  });

  test('should check audio support correctly', () => {
    expect(audioService.isAudioSupported()).toBe(true);
  });

  test('should play beep audio correctly', async () => {
    await audioService.initializeAudio();
    await audioService.playBeep({ volume: 50, enabled: true, audioType: 'beep', frequency: 800, beepDuration: 200, beepInterval: 500, patternRepeat: 1 });
    
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
  });

  test('should test audio functionality', async () => {
    const result = await audioService.testAudio('beep', 50);
    expect(result).toBe(true);
  });

  test('should stop alarms correctly', () => {
    audioService.stopAlarm();
    expect(audioService.isPlaying()).toBe(false);
  });

  test('should set volume correctly', async () => {
    await audioService.initializeAudio();
    audioService.setVolume(75);
    expect(audioService.getVolume()).toBe(75);
  });
});

describe('FlowRateCalculationService', () => {
  let flowRateService: FlowRateCalculationService;

  beforeEach(() => {
    flowRateService = FlowRateCalculationService.getInstance();
  });

  test('should calculate flow rate correctly with volume change', () => {
    const mockTank: Tank = {
      id: 1,
      name: 'Test Tank',
      currentLevel: 1500, // 150cm = 1500mm
      maxLevel: 2000,
      currentVolume: 150, // m³
      maxVolume: 200,
      fillPercentage: 75,
      trend: 'loading',
      trendValue: 5, // mm/min
      previousLevel: 1400, // Previous: 140cm
      lastUpdated: new Date(),
      status: 'normal',
      group: 'test'
    };

    const flowRateData = flowRateService.calculateTankFlowRate(mockTank);
    
    expect(flowRateData.trend).toBe('loading');
    expect(flowRateData.flowRateL_per_min).toBeGreaterThan(0);
    expect(flowRateData.flowRateL_per_hour).toBe(flowRateData.flowRateL_per_min * 60);
    expect(flowRateData.flowRateM3_per_hour).toBe(flowRateData.flowRateL_per_hour / 1000);
  });

  test('should detect stable trend correctly', () => {
    const mockTank: Tank = {
      id: 1,
      name: 'Test Tank',
      currentLevel: 1500,
      maxLevel: 2000,
      currentVolume: 150,
      maxVolume: 200,
      fillPercentage: 75,
      trend: 'stable',
      trendValue: 0,
      previousLevel: 1500, // No change
      lastUpdated: new Date(),
      status: 'normal',
      group: 'test'
    };

    const flowRateData = flowRateService.calculateTankFlowRate(mockTank);
    
    expect(flowRateData.trend).toBe('stable');
    expect(flowRateData.flowRateL_per_min).toBe(0);
  });

  test('should handle unloading trend correctly', () => {
    const mockTank: Tank = {
      id: 1,
      name: 'Test Tank',
      currentLevel: 1400, // Decreased from 1500
      maxLevel: 2000,
      currentVolume: 140,
      maxVolume: 200,
      fillPercentage: 70,
      trend: 'unloading',
      trendValue: -5, // Negative for unloading
      previousLevel: 1500,
      lastUpdated: new Date(),
      status: 'normal',
      group: 'test'
    };

    const flowRateData = flowRateService.calculateTankFlowRate(mockTank);
    
    expect(flowRateData.trend).toBe('unloading');
    expect(flowRateData.flowRateL_per_min).toBeGreaterThan(0); // Absolute value
  });

  test('should provide confidence scoring', () => {
    const mockTank: Tank = {
      id: 1,
      name: 'Test Tank',
      currentLevel: 1500,
      maxLevel: 2000,
      currentVolume: 150,
      maxVolume: 200,
      fillPercentage: 75,
      trend: 'loading',
      trendValue: 5,
      previousLevel: 1450,
      lastUpdated: new Date(),
      status: 'normal',
      group: 'test'
    };

    const flowRateData = flowRateService.calculateTankFlowRate(mockTank);
    
    expect(flowRateData.confidence).toBeGreaterThan(0);
    expect(flowRateData.confidence).toBeLessThanOrEqual(1);
  });
});
