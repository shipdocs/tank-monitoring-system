/**
 * Alarm System Integration Tests - End-to-end testing of complete alarm system
 * 
 * Tests the integration between:
 * - AlarmConfigurationService
 * - AlarmStateService  
 * - AudioAlarmService
 * - FlowRateCalculationService
 * - Maritime test scenarios
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { MaritimeTestRunner, MARITIME_TEST_SCENARIOS } from './MaritimeTestScenarios';
import { AlarmConfigurationService } from '../services/AlarmConfigurationService';
import { AlarmStateService } from '../services/AlarmStateService';
import { AudioAlarmService } from '../services/AudioAlarmService';

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

describe('Alarm System Integration Tests', () => {
  let testRunner: MaritimeTestRunner;
  let configService: AlarmConfigurationService;
  let alarmStateService: AlarmStateService;
  let audioService: AudioAlarmService;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Initialize services
    configService = AlarmConfigurationService.getInstance();
    alarmStateService = AlarmStateService.getInstance();
    audioService = AudioAlarmService.getInstance();
    testRunner = new MaritimeTestRunner();
    
    // Reset alarm state
    alarmStateService.resetAlarmState();
  });

  afterEach(() => {
    audioService.dispose();
  });

  test('should run standard loading operation scenario successfully', async () => {
    const scenario = MARITIME_TEST_SCENARIOS.find(s => s.id === 'loading-standard');
    expect(scenario).toBeDefined();

    const result = await testRunner.runScenario(scenario!);
    
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.stepResults).toHaveLength(scenario!.testSteps.length);
    expect(result.performanceMetrics.totalExecutionTime).toBeGreaterThan(0);
    
    // Verify all steps passed
    result.stepResults.forEach(stepResult => {
      expect(stepResult.passed).toBe(true);
    });
  });

  test('should run unloading with variable flow scenario successfully', async () => {
    const scenario = MARITIME_TEST_SCENARIOS.find(s => s.id === 'unloading-variable-flow');
    expect(scenario).toBeDefined();

    const result = await testRunner.runScenario(scenario!);
    
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Verify alarm state transitions
    const normalSteps = result.stepResults.filter(step => 
      step.actualValues.alarmState === 'NORMAL'
    );
    const preAlarmSteps = result.stepResults.filter(step => 
      step.actualValues.alarmState === 'PRE_ALARM'
    );
    const targetReachedSteps = result.stepResults.filter(step => 
      step.actualValues.alarmState === 'TARGET_REACHED'
    );

    expect(normalSteps.length).toBeGreaterThan(0);
    expect(preAlarmSteps.length).toBeGreaterThan(0);
    expect(targetReachedSteps.length).toBeGreaterThan(0);
  });

  test('should handle critical overshoot scenario correctly', async () => {
    const scenario = MARITIME_TEST_SCENARIOS.find(s => s.id === 'loading-critical-overshoot');
    expect(scenario).toBeDefined();

    const result = await testRunner.runScenario(scenario!);
    
    expect(result.passed).toBe(true);
    
    // Verify critical alarm state was reached
    const overshootAlarmSteps = result.stepResults.filter(step => 
      step.actualValues.alarmState === 'OVERSHOOT_ALARM'
    );
    expect(overshootAlarmSteps.length).toBeGreaterThan(0);
  });

  test('should handle empty tank loading scenario', async () => {
    const scenario = MARITIME_TEST_SCENARIOS.find(s => s.id === 'loading-empty-tank');
    expect(scenario).toBeDefined();

    const result = await testRunner.runScenario(scenario!);
    
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Verify progression from 0 volume
    const firstStep = result.stepResults[0];
    expect(firstStep.actualValues.alarmState).toBe('NORMAL');
  });

  test('should handle complete unloading scenario', async () => {
    const scenario = MARITIME_TEST_SCENARIOS.find(s => s.id === 'unloading-complete');
    expect(scenario).toBeDefined();

    const result = await testRunner.runScenario(scenario!);
    
    expect(result.passed).toBe(true);
    
    // Verify target reached at 0 volume
    const targetReachedSteps = result.stepResults.filter(step => 
      step.actualValues.alarmState === 'TARGET_REACHED'
    );
    expect(targetReachedSteps.length).toBeGreaterThan(0);
  });

  test('should run all maritime scenarios successfully', async () => {
    const results = [];
    
    for (const scenario of MARITIME_TEST_SCENARIOS) {
      const result = await testRunner.runScenario(scenario);
      results.push(result);
    }
    
    // All scenarios should pass
    const passedScenarios = results.filter(r => r.passed);
    expect(passedScenarios).toHaveLength(MARITIME_TEST_SCENARIOS.length);
    
    // Calculate overall performance metrics
    const totalExecutionTime = results.reduce((sum, r) => sum + r.performanceMetrics.totalExecutionTime, 0);
    const averageExecutionTime = totalExecutionTime / results.length;
    
    expect(averageExecutionTime).toBeLessThan(5000); // Should complete within 5 seconds per scenario
  });

  test('should maintain configuration persistence across scenarios', async () => {
    // Modify configuration
    const customConfig = {
      ...configService.getConfiguration(),
      preAlarmPercentage: 15,
      audioVolume: 80,
      overshootWarningPercentage: 3
    };
    
    configService.saveConfiguration(customConfig);
    
    // Run scenario with custom configuration
    const scenario = MARITIME_TEST_SCENARIOS[0];
    const result = await testRunner.runScenario(scenario);
    
    expect(result.passed).toBe(true);
    
    // Verify configuration persisted
    const retrievedConfig = configService.getConfiguration();
    expect(retrievedConfig.preAlarmPercentage).toBe(15);
    expect(retrievedConfig.audioVolume).toBe(80);
    expect(retrievedConfig.overshootWarningPercentage).toBe(3);
  });

  test('should handle alarm acknowledgment correctly', async () => {
    // Trigger critical alarm
    const alarmStatus = alarmStateService.updateAlarmState(650, 'loading', 500, 100);
    expect(alarmStatus!.currentState).toBe('OVERSHOOT_ALARM');
    expect(alarmStatus!.requiresAcknowledgment).toBe(true);

    // Acknowledge alarm
    alarmStateService.acknowledgeAlarm('IntegrationTest');
    
    // Verify acknowledgment
    const acknowledgedStatus = alarmStateService.getCurrentStatus();
    expect(acknowledgedStatus!.requiresAcknowledgment).toBe(false);
    
    // Verify history
    const history = alarmStateService.getAlarmHistory();
    expect(history[0].acknowledged).toBe(true);
    expect(history[0].acknowledgedBy).toBe('IntegrationTest');
  });

  test('should handle audio alarm integration correctly', async () => {
    // Initialize audio
    const audioInitialized = await audioService.initializeAudio();
    expect(audioInitialized).toBe(true);

    // Test audio for different alarm states
    const audioTests = [
      { state: 'PRE_ALARM' as const, audioType: 'beep' as const },
      { state: 'TARGET_REACHED' as const, audioType: 'beep' as const },
      { state: 'OVERSHOOT_WARNING' as const, audioType: 'pattern' as const },
      { state: 'OVERSHOOT_ALARM' as const, audioType: 'continuous' as const }
    ];

    for (const test of audioTests) {
      const audioResult = await audioService.testAudio(test.audioType, 50);
      expect(audioResult).toBe(true);
    }
  });

  test('should validate alarm threshold calculations across scenarios', () => {
    const testCases = [
      { operation: 'loading' as OperationType, quantity: 500, initial: 100, expectedTarget: 600 },
      { operation: 'unloading' as OperationType, quantity: 300, initial: 800, expectedTarget: 500 },
      { operation: 'loading' as OperationType, quantity: 200, initial: 0, expectedTarget: 200 },
      { operation: 'unloading' as OperationType, quantity: 450, initial: 450, expectedTarget: 0 }
    ];

    testCases.forEach(testCase => {
      const thresholds = configService.calculateAlarmThresholds(
        testCase.operation,
        testCase.quantity,
        testCase.initial
      );
      
      expect(thresholds.targetVolume).toBe(testCase.expectedTarget);
      expect(thresholds.operationType).toBe(testCase.operation);
      expect(thresholds.operationQuantity).toBe(testCase.quantity);
      expect(thresholds.initialVolume).toBe(testCase.initial);
      
      // Verify threshold relationships
      if (testCase.operation === 'loading') {
        expect(thresholds.preAlarmVolume).toBeLessThan(thresholds.targetVolume);
        expect(thresholds.overshootWarningVolume).toBeGreaterThan(thresholds.targetVolume);
        expect(thresholds.overshootAlarmVolume).toBeGreaterThan(thresholds.overshootWarningVolume);
      } else {
        expect(thresholds.preAlarmVolume).toBeGreaterThan(thresholds.targetVolume);
        expect(thresholds.overshootWarningVolume).toBeLessThan(thresholds.targetVolume);
        expect(thresholds.overshootAlarmVolume).toBeLessThan(thresholds.overshootWarningVolume);
      }
    });
  });

  test('should handle rapid alarm state changes correctly', async () => {
    const volumes = [100, 300, 495, 550, 600, 620, 650, 600, 550];
    const expectedStates = ['NORMAL', 'NORMAL', 'PRE_ALARM', 'PRE_ALARM', 'TARGET_REACHED', 'OVERSHOOT_WARNING', 'OVERSHOOT_ALARM', 'TARGET_REACHED', 'PRE_ALARM'];
    
    for (let i = 0; i < volumes.length; i++) {
      const status = alarmStateService.updateAlarmState(volumes[i], 'loading', 500, 100);
      expect(status!.currentState).toBe(expectedStates[i]);
    }
    
    // Verify history contains all state changes
    const history = alarmStateService.getAlarmHistory();
    expect(history.length).toBeGreaterThan(0);
    
    // Verify unique states were recorded
    const uniqueStates = [...new Set(history.map(event => event.alarmState))];
    expect(uniqueStates).toContain('PRE_ALARM');
    expect(uniqueStates).toContain('TARGET_REACHED');
    expect(uniqueStates).toContain('OVERSHOOT_WARNING');
    expect(uniqueStates).toContain('OVERSHOOT_ALARM');
  });

  test('should validate performance requirements', async () => {
    const performanceTests = [];
    
    // Test response time for alarm state updates
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      alarmStateService.updateAlarmState(Math.random() * 1000, 'loading', 500, 100);
      const endTime = Date.now();
      performanceTests.push(endTime - startTime);
    }
    
    const averageResponseTime = performanceTests.reduce((sum, time) => sum + time, 0) / performanceTests.length;
    
    // Should respond within 10ms on average
    expect(averageResponseTime).toBeLessThan(10);
    
    // No single update should take more than 50ms
    const maxResponseTime = Math.max(...performanceTests);
    expect(maxResponseTime).toBeLessThan(50);
  });
});
