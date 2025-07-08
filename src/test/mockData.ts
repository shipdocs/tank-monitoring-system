import { type Tank } from '../types/tank';

/**
 * Mock tank data factory for testing
 */
export const createMockTank = (overrides: Partial<Tank> = {}): Tank => ({
  id: 'tank-1',
  name: 'Test Tank',
  currentLevel: 500,
  maxCapacity: 1000,
  minLevel: 0,
  maxLevel: 950,
  unit: 'mm',
  status: 'normal',
  lastUpdated: new Date('2024-01-01T12:00:00Z'),
  location: 'Port',
  trend: 'stable',
  trendValue: 0,
  previousLevel: 500,
  position: 1,
  temperature: 20.5,
  group: 'BB',
  ...overrides,
});

/**
 * Collection of predefined tank states for testing
 */
export const mockTanks = {
  normal: createMockTank({
    id: 'normal-tank',
    name: 'Normal Tank',
    currentLevel: 500,
    maxCapacity: 1000,
    status: 'normal',
    trend: 'stable',
    trendValue: 0,
  }),

  low: createMockTank({
    id: 'low-tank',
    name: 'Low Level Tank',
    currentLevel: 100,
    maxCapacity: 1000,
    status: 'low',
    trend: 'unloading',
    trendValue: 25,
  }),

  high: createMockTank({
    id: 'high-tank',
    name: 'High Level Tank',
    currentLevel: 900,
    maxCapacity: 1000,
    status: 'high',
    trend: 'loading',
    trendValue: 15,
  }),

  critical: createMockTank({
    id: 'critical-tank',
    name: 'Critical Tank',
    currentLevel: 980,
    maxCapacity: 1000,
    status: 'critical',
    trend: 'loading',
    trendValue: 50,
  }),

  empty: createMockTank({
    id: 'empty-tank',
    name: 'Empty Tank',
    currentLevel: 0,
    maxCapacity: 1000,
    status: 'low',
    trend: 'stable',
    trendValue: 0,
  }),

  full: createMockTank({
    id: 'full-tank',
    name: 'Full Tank',
    currentLevel: 1000,
    maxCapacity: 1000,
    status: 'critical',
    trend: 'stable',
    trendValue: 0,
  }),

  loading: createMockTank({
    id: 'loading-tank',
    name: 'Loading Tank',
    currentLevel: 400,
    maxCapacity: 1000,
    status: 'normal',
    trend: 'loading',
    trendValue: 75,
  }),

  unloading: createMockTank({
    id: 'unloading-tank',
    name: 'Unloading Tank',
    currentLevel: 600,
    maxCapacity: 1000,
    status: 'normal',
    trend: 'unloading',
    trendValue: 100,
  }),

  fastLoading: createMockTank({
    id: 'fast-loading-tank',
    name: 'Fast Loading Tank',
    currentLevel: 300,
    maxCapacity: 1000,
    status: 'normal',
    trend: 'loading',
    trendValue: 200,
  }),

  noTemperature: createMockTank({
    id: 'no-temp-tank',
    name: 'No Temperature Tank',
    currentLevel: 400,
    maxCapacity: 1000,
    status: 'normal',
    temperature: undefined,
  }),

  starboard: createMockTank({
    id: 'starboard-tank',
    name: 'Starboard Tank',
    currentLevel: 350,
    maxCapacity: 800,
    status: 'normal',
    location: 'Starboard',
    group: 'SB',
  }),

  center: createMockTank({
    id: 'center-tank',
    name: 'Center Tank',
    currentLevel: 750,
    maxCapacity: 1200,
    status: 'high',
    location: 'Center',
    group: 'CENTER',
  }),
};

/**
 * Helper function to create tanks with specific percentages
 */
export const createTankWithPercentage = (percentage: number, overrides: Partial<Tank> = {}): Tank => {
  const maxCapacity = 1000;
  const currentLevel = (percentage / 100) * maxCapacity;

  let status: Tank['status'] = 'normal';
  if (percentage < 20) status = 'low';
  else if (percentage > 85) status = 'high';
  else if (percentage > 95) status = 'critical';

  return createMockTank({
    currentLevel,
    maxCapacity,
    status,
    ...overrides,
  });
};

/**
 * Helper function to create tanks at various alarm thresholds for testing
 */
export const alarmThresholdTanks = {
  belowLowAlarm: createTankWithPercentage(15, { name: 'Below Low Alarm' }),
  atLowAlarm: createTankWithPercentage(20, { name: 'At Low Alarm' }),
  aboveLowAlarm: createTankWithPercentage(25, { name: 'Above Low Alarm' }),
  belowHighAlarm: createTankWithPercentage(84, { name: 'Below High Alarm' }),
  atHighAlarm: createTankWithPercentage(86, { name: 'At High Alarm' }),
  aboveHighAlarm: createTankWithPercentage(88, { name: 'Above High Alarm' }),
  belowCritical: createTankWithPercentage(96, { name: 'Below Critical' }),
  atCritical: createTankWithPercentage(97.5, { name: 'At Critical' }),
  aboveCritical: createTankWithPercentage(99, { name: 'Above Critical' }),
};

/**
 * Helper function to create a tank with a specific trend and speed
 */
export const createTankWithTrend = (
  trend: Tank['trend'],
  speed: number = 0,
  overrides: Partial<Tank> = {},
): Tank => createMockTank({
  trend,
  trendValue: speed,
  ...overrides,
});

/**
 * Collection of tanks with different trend configurations
 */
export const trendTanks = {
  stableZero: createTankWithTrend('stable', 0),
  stableNoValue: createTankWithTrend('stable'),
  slowLoading: createTankWithTrend('loading', 25),
  normalLoading: createTankWithTrend('loading', 75),
  fastLoading: createTankWithTrend('loading', 150),
  veryFastLoading: createTankWithTrend('loading', 250),
  slowUnloading: createTankWithTrend('unloading', 20),
  normalUnloading: createTankWithTrend('unloading', 80),
  fastUnloading: createTankWithTrend('unloading', 160),
  veryFastUnloading: createTankWithTrend('unloading', 300),
};

/**
 * Collection of tanks for testing edge cases
 */
export const edgeCaseTanks = {
  negativeLevelClamped: createMockTank({
    currentLevel: -50,
    maxCapacity: 1000,
    name: 'Negative Level Tank',
  }),
  overflowClamped: createMockTank({
    currentLevel: 1200,
    maxCapacity: 1000,
    name: 'Overflow Tank',
  }),
  zeroCapacity: createMockTank({
    currentLevel: 0,
    maxCapacity: 0,
    name: 'Zero Capacity Tank',
  }),
  recentUpdate: createMockTank({
    lastUpdated: new Date(),
    name: 'Recently Updated Tank',
  }),
  oldUpdate: createMockTank({
    lastUpdated: new Date('2023-01-01T00:00:00Z'),
    name: 'Old Update Tank',
  }),
  longName: createMockTank({
    name: 'This is a very long tank name that should test text wrapping and truncation behavior',
  }),
  specialCharacters: createMockTank({
    name: 'Tank™ #1 (Test & Demo)',
    location: 'Port/Starboard',
  }),
};
