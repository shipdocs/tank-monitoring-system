import { type Tank } from '../types/tank';

// Helper function to calculate trend
export const calculateTrend = (currentLevel: number, previousLevel: number): { trend: Tank['trend'], trendValue: number } => {
  const difference = currentLevel - previousLevel;
  const threshold = 3.0; // Minimum change to consider as trend (3mm to account for ship movement)

  if (Math.abs(difference) < threshold) {
    return { trend: 'stable', trendValue: 0 };
  }

  // Convert to rate per minute (assuming 3-second updates)
  const ratePerMinute = (difference / 3) * 60;

  return {
    trend: difference > 0 ? 'loading' : 'unloading',
    trendValue: Math.abs(ratePerMinute),
  };
};
