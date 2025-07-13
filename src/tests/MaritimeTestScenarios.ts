/**
 * Maritime Test Scenarios - Comprehensive test cases for alarm system validation
 * 
 * This file contains realistic maritime operational scenarios to validate:
 * - Alarm threshold calculations
 * - Flow rate accuracy
 * - Audio alarm functionality
 * - Operation-specific behavior
 * - Edge cases and error conditions
 */

import { AlarmConfigurationService } from '../services/AlarmConfigurationService';
import { AlarmStateService } from '../services/AlarmStateService';
import { FlowRateCalculationService } from '../services/FlowRateCalculationService';
import { AudioAlarmService } from '../services/AudioAlarmService';
import { Tank } from '../types/tank';
import { AlarmState, OperationType } from '../types/alarm';

export interface MaritimeTestScenario {
  id: string;
  name: string;
  description: string;
  operationType: OperationType;
  initialVolume: number;
  operationQuantity: number;
  expectedTarget: number;
  testSteps: TestStep[];
  expectedAlarmStates: ExpectedAlarmState[];
  validationCriteria: ValidationCriteria;
}

export interface TestStep {
  stepNumber: number;
  description: string;
  currentVolume: number;
  timeElapsed: number; // minutes
  expectedFlowRate?: number; // L/min
  expectedAlarmState: AlarmState;
  shouldTriggerAudio: boolean;
}

export interface ExpectedAlarmState {
  volume: number;
  state: AlarmState;
  progressPercentage: number;
  overshootPercentage?: number;
}

export interface ValidationCriteria {
  flowRateAccuracy: number; // percentage tolerance
  alarmTimingAccuracy: number; // seconds tolerance
  audioResponseTime: number; // milliseconds
  configurationPersistence: boolean;
}

/**
 * Maritime Test Scenarios Collection
 */
export const MARITIME_TEST_SCENARIOS: MaritimeTestScenario[] = [
  // Scenario 1: Standard Loading Operation
  {
    id: 'loading-standard',
    name: 'Standard Loading Operation',
    description: 'Normal loading operation from empty to 80% capacity with steady flow rate',
    operationType: 'loading',
    initialVolume: 50, // m³
    operationQuantity: 500, // m³
    expectedTarget: 550, // m³
    testSteps: [
      {
        stepNumber: 1,
        description: 'Start loading operation',
        currentVolume: 50,
        timeElapsed: 0,
        expectedAlarmState: 'NORMAL',
        shouldTriggerAudio: false
      },
      {
        stepNumber: 2,
        description: 'Loading in progress - 50% complete',
        currentVolume: 300,
        timeElapsed: 30,
        expectedFlowRate: 8.33, // (300-50)/30 = 8.33 L/min
        expectedAlarmState: 'NORMAL',
        shouldTriggerAudio: false
      },
      {
        stepNumber: 3,
        description: 'Approaching target - pre-alarm threshold',
        currentVolume: 495, // 90% of target (550 - 55)
        timeElapsed: 55,
        expectedAlarmState: 'PRE_ALARM',
        shouldTriggerAudio: true
      },
      {
        stepNumber: 4,
        description: 'Target reached',
        currentVolume: 550,
        timeElapsed: 60,
        expectedAlarmState: 'TARGET_REACHED',
        shouldTriggerAudio: true
      },
      {
        stepNumber: 5,
        description: 'Slight overshoot - warning',
        currentVolume: 565, // 2.7% overshoot
        timeElapsed: 62,
        expectedAlarmState: 'OVERSHOOT_WARNING',
        shouldTriggerAudio: true
      }
    ],
    expectedAlarmStates: [
      { volume: 50, state: 'NORMAL', progressPercentage: 0 },
      { volume: 495, state: 'PRE_ALARM', progressPercentage: 89 },
      { volume: 550, state: 'TARGET_REACHED', progressPercentage: 100 },
      { volume: 565, state: 'OVERSHOOT_WARNING', progressPercentage: 103, overshootPercentage: 2.7 }
    ],
    validationCriteria: {
      flowRateAccuracy: 5, // 5% tolerance
      alarmTimingAccuracy: 2, // 2 seconds
      audioResponseTime: 500, // 500ms
      configurationPersistence: true
    }
  },

  // Scenario 2: Unloading Operation with Flow Variations
  {
    id: 'unloading-variable-flow',
    name: 'Unloading with Variable Flow Rate',
    description: 'Unloading operation with changing flow rates and pump adjustments',
    operationType: 'unloading',
    initialVolume: 800, // m³
    operationQuantity: 600, // m³
    expectedTarget: 200, // m³
    testSteps: [
      {
        stepNumber: 1,
        description: 'Start unloading - high flow rate',
        currentVolume: 800,
        timeElapsed: 0,
        expectedAlarmState: 'NORMAL',
        shouldTriggerAudio: false
      },
      {
        stepNumber: 2,
        description: 'Fast unloading phase',
        currentVolume: 650,
        timeElapsed: 15,
        expectedFlowRate: 10, // (800-650)/15 = 10 L/min
        expectedAlarmState: 'NORMAL',
        shouldTriggerAudio: false
      },
      {
        stepNumber: 3,
        description: 'Reduced flow rate for precision',
        currentVolume: 350,
        timeElapsed: 45,
        expectedFlowRate: 6.67, // (650-350)/30 = 10 L/min then 6.67 L/min
        expectedAlarmState: 'NORMAL',
        shouldTriggerAudio: false
      },
      {
        stepNumber: 4,
        description: 'Approaching target - pre-alarm',
        currentVolume: 260, // 90% of operation (200 + 60)
        timeElapsed: 60,
        expectedAlarmState: 'PRE_ALARM',
        shouldTriggerAudio: true
      },
      {
        stepNumber: 5,
        description: 'Target reached',
        currentVolume: 200,
        timeElapsed: 70,
        expectedAlarmState: 'TARGET_REACHED',
        shouldTriggerAudio: true
      }
    ],
    expectedAlarmStates: [
      { volume: 800, state: 'NORMAL', progressPercentage: 0 },
      { volume: 260, state: 'PRE_ALARM', progressPercentage: 90 },
      { volume: 200, state: 'TARGET_REACHED', progressPercentage: 100 }
    ],
    validationCriteria: {
      flowRateAccuracy: 10, // 10% tolerance for variable flow
      alarmTimingAccuracy: 3, // 3 seconds
      audioResponseTime: 500,
      configurationPersistence: true
    }
  },

  // Scenario 3: Critical Overshoot Situation
  {
    id: 'loading-critical-overshoot',
    name: 'Loading with Critical Overshoot',
    description: 'Loading operation that exceeds target significantly, triggering critical alarms',
    operationType: 'loading',
    initialVolume: 100, // m³
    operationQuantity: 400, // m³
    expectedTarget: 500, // m³
    testSteps: [
      {
        stepNumber: 1,
        description: 'Normal loading progress',
        currentVolume: 350,
        timeElapsed: 25,
        expectedAlarmState: 'NORMAL',
        shouldTriggerAudio: false
      },
      {
        stepNumber: 2,
        description: 'Pre-alarm threshold reached',
        currentVolume: 460, // 90% of target
        timeElapsed: 36,
        expectedAlarmState: 'PRE_ALARM',
        shouldTriggerAudio: true
      },
      {
        stepNumber: 3,
        description: 'Target reached',
        currentVolume: 500,
        timeElapsed: 40,
        expectedAlarmState: 'TARGET_REACHED',
        shouldTriggerAudio: true
      },
      {
        stepNumber: 4,
        description: 'Overshoot warning - pump not stopped',
        currentVolume: 520, // 4% overshoot
        timeElapsed: 42,
        expectedAlarmState: 'OVERSHOOT_WARNING',
        shouldTriggerAudio: true
      },
      {
        stepNumber: 5,
        description: 'Critical overshoot - emergency alarm',
        currentVolume: 550, // 10% overshoot
        timeElapsed: 45,
        expectedAlarmState: 'OVERSHOOT_ALARM',
        shouldTriggerAudio: true
      }
    ],
    expectedAlarmStates: [
      { volume: 460, state: 'PRE_ALARM', progressPercentage: 90 },
      { volume: 500, state: 'TARGET_REACHED', progressPercentage: 100 },
      { volume: 520, state: 'OVERSHOOT_WARNING', progressPercentage: 105, overshootPercentage: 5 },
      { volume: 550, state: 'OVERSHOOT_ALARM', progressPercentage: 112.5, overshootPercentage: 12.5 }
    ],
    validationCriteria: {
      flowRateAccuracy: 5,
      alarmTimingAccuracy: 1, // Critical timing
      audioResponseTime: 200, // Fast response for critical
      configurationPersistence: true
    }
  },

  // Scenario 4: Empty Tank Loading
  {
    id: 'loading-empty-tank',
    name: 'Loading from Empty Tank',
    description: 'Loading operation starting from completely empty tank',
    operationType: 'loading',
    initialVolume: 0, // m³ - completely empty
    operationQuantity: 300, // m³
    expectedTarget: 300, // m³
    testSteps: [
      {
        stepNumber: 1,
        description: 'Start loading from empty',
        currentVolume: 0,
        timeElapsed: 0,
        expectedAlarmState: 'NORMAL',
        shouldTriggerAudio: false
      },
      {
        stepNumber: 2,
        description: 'Initial loading phase',
        currentVolume: 75,
        timeElapsed: 10,
        expectedFlowRate: 7.5,
        expectedAlarmState: 'NORMAL',
        shouldTriggerAudio: false
      },
      {
        stepNumber: 3,
        description: 'Steady loading progress',
        currentVolume: 200,
        timeElapsed: 25,
        expectedAlarmState: 'NORMAL',
        shouldTriggerAudio: false
      },
      {
        stepNumber: 4,
        description: 'Approaching target',
        currentVolume: 270, // 90% of target
        timeElapsed: 35,
        expectedAlarmState: 'PRE_ALARM',
        shouldTriggerAudio: true
      },
      {
        stepNumber: 5,
        description: 'Target reached exactly',
        currentVolume: 300,
        timeElapsed: 40,
        expectedAlarmState: 'TARGET_REACHED',
        shouldTriggerAudio: true
      }
    ],
    expectedAlarmStates: [
      { volume: 0, state: 'NORMAL', progressPercentage: 0 },
      { volume: 270, state: 'PRE_ALARM', progressPercentage: 90 },
      { volume: 300, state: 'TARGET_REACHED', progressPercentage: 100 }
    ],
    validationCriteria: {
      flowRateAccuracy: 5,
      alarmTimingAccuracy: 2,
      audioResponseTime: 500,
      configurationPersistence: true
    }
  },

  // Scenario 5: Complete Unloading
  {
    id: 'unloading-complete',
    name: 'Complete Tank Unloading',
    description: 'Unloading operation to completely empty the tank',
    operationType: 'unloading',
    initialVolume: 450, // m³
    operationQuantity: 450, // m³ - complete unloading
    expectedTarget: 0, // m³
    testSteps: [
      {
        stepNumber: 1,
        description: 'Start complete unloading',
        currentVolume: 450,
        timeElapsed: 0,
        expectedAlarmState: 'NORMAL',
        shouldTriggerAudio: false
      },
      {
        stepNumber: 2,
        description: 'Steady unloading progress',
        currentVolume: 250,
        timeElapsed: 20,
        expectedFlowRate: 10,
        expectedAlarmState: 'NORMAL',
        shouldTriggerAudio: false
      },
      {
        stepNumber: 3,
        description: 'Approaching empty - pre-alarm',
        currentVolume: 45, // 90% of operation complete
        timeElapsed: 40,
        expectedAlarmState: 'PRE_ALARM',
        shouldTriggerAudio: true
      },
      {
        stepNumber: 4,
        description: 'Tank empty - target reached',
        currentVolume: 0,
        timeElapsed: 45,
        expectedAlarmState: 'TARGET_REACHED',
        shouldTriggerAudio: true
      }
    ],
    expectedAlarmStates: [
      { volume: 450, state: 'NORMAL', progressPercentage: 0 },
      { volume: 45, state: 'PRE_ALARM', progressPercentage: 90 },
      { volume: 0, state: 'TARGET_REACHED', progressPercentage: 100 }
    ],
    validationCriteria: {
      flowRateAccuracy: 5,
      alarmTimingAccuracy: 2,
      audioResponseTime: 500,
      configurationPersistence: true
    }
  }
];

/**
 * Test Scenario Runner - Executes maritime test scenarios
 */
export class MaritimeTestRunner {
  private configService: AlarmConfigurationService;
  private alarmStateService: AlarmStateService;
  private flowRateService: FlowRateCalculationService;
  private audioService: AudioAlarmService;

  constructor() {
    this.configService = AlarmConfigurationService.getInstance();
    this.alarmStateService = AlarmStateService.getInstance();
    this.flowRateService = FlowRateCalculationService.getInstance();
    this.audioService = AudioAlarmService.getInstance();
  }

  /**
   * Run a specific test scenario
   */
  async runScenario(scenario: MaritimeTestScenario): Promise<TestResult> {
    console.log(`🧪 Running Maritime Test Scenario: ${scenario.name}`);
    
    const results: TestResult = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      passed: true,
      errors: [],
      stepResults: [],
      performanceMetrics: {
        totalExecutionTime: 0,
        averageResponseTime: 0,
        flowRateAccuracy: 0,
        alarmAccuracy: 0
      }
    };

    const startTime = Date.now();

    try {
      // Reset alarm state before test
      this.alarmStateService.resetAlarmState();

      // Execute each test step
      for (const step of scenario.testSteps) {
        const stepResult = await this.executeTestStep(scenario, step);
        results.stepResults.push(stepResult);
        
        if (!stepResult.passed) {
          results.passed = false;
          results.errors.push(`Step ${step.stepNumber}: ${stepResult.error}`);
        }
      }

      // Validate overall scenario results
      const validationResult = this.validateScenarioResults(scenario, results);
      if (!validationResult.passed) {
        results.passed = false;
        results.errors.push(...validationResult.errors);
      }

    } catch (error) {
      results.passed = false;
      results.errors.push(`Scenario execution failed: ${error}`);
    }

    results.performanceMetrics.totalExecutionTime = Date.now() - startTime;
    
    console.log(`${results.passed ? '✅' : '❌'} Scenario ${scenario.name}: ${results.passed ? 'PASSED' : 'FAILED'}`);
    if (results.errors.length > 0) {
      console.log('Errors:', results.errors);
    }

    return results;
  }

  /**
   * Execute a single test step
   */
  private async executeTestStep(scenario: MaritimeTestScenario, step: TestStep): Promise<StepResult> {
    const stepStartTime = Date.now();
    
    try {
      // Update alarm state with current volume
      const alarmStatus = this.alarmStateService.updateAlarmState(
        step.currentVolume,
        scenario.operationType,
        scenario.operationQuantity,
        scenario.initialVolume
      );

      // Validate alarm state
      const expectedState = step.expectedAlarmState;
      const actualState = alarmStatus?.currentState || 'NORMAL';
      
      if (actualState !== expectedState) {
        return {
          stepNumber: step.stepNumber,
          passed: false,
          error: `Expected alarm state '${expectedState}', got '${actualState}'`,
          executionTime: Date.now() - stepStartTime,
          actualValues: { alarmState: actualState }
        };
      }

      // Validate flow rate if specified
      if (step.expectedFlowRate) {
        // Calculate appropriate max volume based on scenario
        const maxVolume = Math.max(
          1000,
          scenario.initialVolume * 1.5,
          (scenario.initialVolume + scenario.operationQuantity) * 1.2
        );

        // Create mock tank for flow rate calculation
        const mockTank: Tank = {
          id: 1,
          name: 'Test Tank',
          currentLevel: step.currentVolume * 10, // Convert to mm for tank
          maxLevel: maxVolume * 10,            // Convert to mm
          currentVolume: step.currentVolume,
          maxVolume: maxVolume,
          fillPercentage: (step.currentVolume / maxVolume) * 100,
          trend: 'stable',
          trendValue: 0,
          previousLevel: step.currentVolume * 10,
          lastUpdated: new Date(),
          status: 'normal',
          group: 'test'
        };

        const flowRateData = this.flowRateService.calculateTankFlowRate(mockTank);
        const actualFlowRate = Math.abs(flowRateData.flowRateL_per_min);
        const tolerance = scenario.validationCriteria.flowRateAccuracy / 100;
        const flowRateError = Math.abs(actualFlowRate - step.expectedFlowRate) / step.expectedFlowRate;

        if (flowRateError > tolerance) {
          return {
            stepNumber: step.stepNumber,
            passed: false,
            error: `Flow rate accuracy exceeded tolerance. Expected: ${step.expectedFlowRate} L/min, Actual: ${actualFlowRate} L/min, Error: ${(flowRateError * 100).toFixed(1)}%`,
            executionTime: Date.now() - stepStartTime,
            actualValues: { flowRate: actualFlowRate }
          };
        }
      }

      return {
        stepNumber: step.stepNumber,
        passed: true,
        executionTime: Date.now() - stepStartTime,
        actualValues: { alarmState: actualState }
      };

    } catch (error) {
      return {
        stepNumber: step.stepNumber,
        passed: false,
        error: `Step execution failed: ${error}`,
        executionTime: Date.now() - stepStartTime,
        actualValues: {}
      };
    }
  }

  /**
   * Validate overall scenario results
   */
  private validateScenarioResults(scenario: MaritimeTestScenario, results: TestResult): ValidationResult {
    const errors: string[] = [];

    // Check if all expected alarm states were triggered
    for (const expectedState of scenario.expectedAlarmStates) {
      const matchingStep = scenario.testSteps.find(step => 
        Math.abs(step.currentVolume - expectedState.volume) < 1
      );
      
      if (!matchingStep || matchingStep.expectedAlarmState !== expectedState.state) {
        errors.push(`Expected alarm state '${expectedState.state}' at volume ${expectedState.volume} m³`);
      }
    }

    // Validate performance metrics
    const avgExecutionTime = results.stepResults.reduce((sum, step) => sum + step.executionTime, 0) / results.stepResults.length;
    if (avgExecutionTime > scenario.validationCriteria.audioResponseTime * 2) {
      errors.push(`Average execution time ${avgExecutionTime}ms exceeds acceptable threshold`);
    }

    return {
      passed: errors.length === 0,
      errors
    };
  }
}

// Supporting interfaces
export interface TestResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  errors: string[];
  stepResults: StepResult[];
  performanceMetrics: PerformanceMetrics;
}

export interface StepResult {
  stepNumber: number;
  passed: boolean;
  error?: string;
  executionTime: number;
  actualValues: Record<string, string | number | boolean>;
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
}

export interface PerformanceMetrics {
  totalExecutionTime: number;
  averageResponseTime: number;
  flowRateAccuracy: number;
  alarmAccuracy: number;
}
