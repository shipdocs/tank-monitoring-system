import { describe, expect, it } from 'vitest';
import { calculateTrend } from './trendCalculator';

describe('calculateTrend', () => {
  it('should return stable trend for changes below 3mm threshold', () => {
    expect(calculateTrend(1000, 1002)).toEqual({ trend: 'stable', trendValue: 0 });
    expect(calculateTrend(1000, 998)).toEqual({ trend: 'stable', trendValue: 0 });
    expect(calculateTrend(1000, 1000)).toEqual({ trend: 'stable', trendValue: 0 });
    expect(calculateTrend(1000, 1002.9)).toEqual({ trend: 'stable', trendValue: 0 });
    expect(calculateTrend(1000, 997.1)).toEqual({ trend: 'stable', trendValue: 0 });
  });

  it('should return loading trend for increases >= 3mm', () => {
    expect(calculateTrend(1000, 997)).toEqual({ trend: 'loading', trendValue: 60 });
    expect(calculateTrend(1010, 1000)).toEqual({ trend: 'loading', trendValue: 200 });
    expect(calculateTrend(1003, 1000)).toEqual({ trend: 'loading', trendValue: 60 });
  });

  it('should return unloading trend for decreases >= 3mm', () => {
    expect(calculateTrend(997, 1000)).toEqual({ trend: 'unloading', trendValue: 60 });
    expect(calculateTrend(990, 1000)).toEqual({ trend: 'unloading', trendValue: 200 });
    expect(calculateTrend(1000, 1003)).toEqual({ trend: 'unloading', trendValue: 60 });
  });

  it('should calculate correct rate per minute', () => {
    // 30mm in 3 seconds = 600mm per minute
    expect(calculateTrend(1030, 1000)).toEqual({ trend: 'loading', trendValue: 600 });
    expect(calculateTrend(970, 1000)).toEqual({ trend: 'unloading', trendValue: 600 });

    // 6mm in 3 seconds = 120mm per minute
    expect(calculateTrend(1006, 1000)).toEqual({ trend: 'loading', trendValue: 120 });
    expect(calculateTrend(994, 1000)).toEqual({ trend: 'unloading', trendValue: 120 });
  });

  it('should handle edge case of exactly 3mm threshold', () => {
    expect(calculateTrend(1003, 1000)).toEqual({ trend: 'loading', trendValue: 60 });
    expect(calculateTrend(997, 1000)).toEqual({ trend: 'unloading', trendValue: 60 });
  });

  it('should handle floating point levels', () => {
    const result1 = calculateTrend(1000.5, 997.4);
    expect(result1.trend).toBe('loading');
    expect(result1.trendValue).toBeCloseTo(62, 1);

    const result2 = calculateTrend(997.2, 1000.5);
    expect(result2.trend).toBe('unloading');
    expect(result2.trendValue).toBeCloseTo(66, 1);
  });

  it('should handle negative levels', () => {
    expect(calculateTrend(-100, -103)).toEqual({ trend: 'loading', trendValue: 60 });
    expect(calculateTrend(-103, -100)).toEqual({ trend: 'unloading', trendValue: 60 });
  });

  it('should handle very large differences', () => {
    expect(calculateTrend(2000, 1000)).toEqual({ trend: 'loading', trendValue: 20000 });
    expect(calculateTrend(1000, 2000)).toEqual({ trend: 'unloading', trendValue: 20000 });
  });
});
