import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TankCard } from './TankCard';
import { Tank } from '../types/tank';
import {
  alarmThresholdTanks,
  createMockTank,
  createTankWithPercentage,
  edgeCaseTanks,
  mockTanks,
  trendTanks,
} from '../test/mockData';

describe('TankCard Component', () => {
  describe('Basic Rendering', () => {
    it('renders tank card with basic information', () => {
      const tank = mockTanks.normal;
      render(<TankCard tank={tank} />);

      // Check tank name
      expect(screen.getByText(tank.name)).toBeInTheDocument();

      // Check current level display
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('mm')).toBeInTheDocument();

      // Check percentage display
      expect(screen.getByText('50.0%')).toBeInTheDocument();

      // Check location
      expect(screen.getByText(tank.location)).toBeInTheDocument();

      // Check status indicator
      const statusText = screen.getByText('Normal');
      expect(statusText).toBeInTheDocument();
    });

    it('renders tank card with proper accessibility attributes', () => {
      const tank = mockTanks.normal;
      render(<TankCard tank={tank} />);

      // Check main article has proper attributes
      const article = screen.getByRole('region', { name: `Tank ${tank.name}` });
      expect(article).toHaveAttribute('aria-live', 'polite');
      expect(article).toHaveAttribute('aria-atomic', 'true');

      // Check progress bar
      const progressBar = screen.getByRole('progressbar', { name: 'Tank fill level' });
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');

      // Check status indicators have aria-labels
      expect(screen.getByLabelText('Status: Normal')).toBeInTheDocument();
      expect(screen.getByLabelText(/Current level: 500 millimeters/)).toBeInTheDocument();
    });

    it('renders temperature when available', () => {
      const tank = mockTanks.normal;
      render(<TankCard tank={tank} />);

      expect(screen.getByText('Temperature')).toBeInTheDocument();
      expect(screen.getByText('20.5°C')).toBeInTheDocument();
      expect(screen.getByLabelText(/Temperature: 20.5 degrees Celsius/)).toBeInTheDocument();
    });

    it('does not render temperature section when temperature is undefined', () => {
      const tank = mockTanks.noTemperature;
      render(<TankCard tank={tank} />);

      expect(screen.queryByText('Temperature')).not.toBeInTheDocument();
      expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
    });
  });

  describe('Status Display and Colors', () => {
    it('displays normal status correctly', () => {
      const tank = mockTanks.normal;
      render(<TankCard tank={tank} />);

      expect(screen.getByText('Normal')).toBeInTheDocument();
      const statusIndicator = screen.getByLabelText('Status: Normal');
      expect(statusIndicator).toHaveClass('bg-green-500');
    });

    it('displays low status correctly', () => {
      const tank = mockTanks.low;
      render(<TankCard tank={tank} />);

      expect(screen.getByText('Low Level')).toBeInTheDocument();
      const statusIndicator = screen.getByLabelText('Status: Low Level');
      expect(statusIndicator).toHaveClass('bg-yellow-500');
    });

    it('displays high status correctly', () => {
      const tank = mockTanks.high;
      render(<TankCard tank={tank} />);

      expect(screen.getByText('High Level')).toBeInTheDocument();
      const statusIndicator = screen.getByLabelText('Status: High Level');
      expect(statusIndicator).toHaveClass('bg-orange-500');
    });

    it('displays critical status correctly', () => {
      const tank = mockTanks.critical;
      render(<TankCard tank={tank} />);

      expect(screen.getByText('Critical')).toBeInTheDocument();
      const statusIndicator = screen.getByLabelText('Status: Critical');
      expect(statusIndicator).toHaveClass('bg-red-500');
    });
  });

  describe('Alarm States', () => {
    it('shows alarm indicator for low status', () => {
      const tank = mockTanks.low;
      render(<TankCard tank={tank} />);

      const article = screen.getByRole('region');
      expect(article).toHaveClass('border-red-300');
      expect(article).toHaveAttribute('aria-live', 'assertive');

      const alarmIndicator = screen.getByRole('alert');
      expect(alarmIndicator).toBeInTheDocument();
      expect(screen.getByText('Attention Required')).toBeInTheDocument();
      expect(screen.getByLabelText('Warning')).toBeInTheDocument();
    });

    it('shows alarm indicator for high status', () => {
      const tank = mockTanks.high;
      render(<TankCard tank={tank} />);

      const article = screen.getByRole('region');
      expect(article).toHaveClass('border-red-300');
      expect(article).toHaveAttribute('aria-live', 'assertive');

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Attention Required')).toBeInTheDocument();
    });

    it('shows alarm indicator for critical status', () => {
      const tank = mockTanks.critical;
      render(<TankCard tank={tank} />);

      const article = screen.getByRole('region');
      expect(article).toHaveClass('border-red-300');
      expect(article).toHaveAttribute('aria-live', 'assertive');

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Attention Required')).toBeInTheDocument();
    });

    it('does not show alarm indicator for normal status', () => {
      const tank = mockTanks.normal;
      render(<TankCard tank={tank} />);

      const article = screen.getByRole('region');
      expect(article).not.toHaveClass('border-red-300');
      expect(article).toHaveAttribute('aria-live', 'polite');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText('Attention Required')).not.toBeInTheDocument();
    });
  });

  describe('Level Display and Progress Bar', () => {
    it('displays correct percentage for various levels', () => {
      const testCases = [
        { level: 0, capacity: 1000, expected: '0.0%' },
        { level: 250, capacity: 1000, expected: '25.0%' },
        { level: 500, capacity: 1000, expected: '50.0%' },
        { level: 750, capacity: 1000, expected: '75.0%' },
        { level: 1000, capacity: 1000, expected: '100.0%' },
      ];

      testCases.forEach(({ level, capacity, expected }) => {
        const tank = createMockTank({
          currentLevel: level,
          maxCapacity: capacity,
        });

        const { unmount } = render(<TankCard tank={tank} />);
        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });

    it('handles edge cases correctly', () => {
      // Negative level (should be clamped to 0%)
      const negativeTank = edgeCaseTanks.negativeLevelClamped;
      const { unmount: unmount1 } = render(<TankCard tank={negativeTank} />);
      expect(screen.getByText('-50')).toBeInTheDocument(); // Shows actual value
      expect(screen.getByText('-5.0%')).toBeInTheDocument(); // But calculates percentage
      unmount1();

      // Overflow level (should be clamped to 100% in progress bar)
      const overflowTank = edgeCaseTanks.overflowClamped;
      const { unmount: unmount2 } = render(<TankCard tank={overflowTank} />);
      expect(screen.getByText('1200')).toBeInTheDocument(); // Shows actual value
      expect(screen.getByText('120.0%')).toBeInTheDocument(); // Shows calculated percentage
      unmount2();

      // Zero capacity
      const zeroCapacityTank = edgeCaseTanks.zeroCapacity;
      render(<TankCard tank={zeroCapacityTank} />);
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('progress bar width respects min/max constraints', () => {
      // Test that progress bar width is clamped between 0% and 100%
      const overflowTank = edgeCaseTanks.overflowClamped;
      render(<TankCard tank={overflowTank} />);

      const progressBar = screen.getByRole('progressbar');
      const progressFill = progressBar.querySelector('.h-full');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });
  });

  describe('Trend Display', () => {
    it('displays loading trend correctly', () => {
      const tank = trendTanks.normalLoading;
      render(<TankCard tank={tank} />);

      expect(screen.getByText('Loading')).toBeInTheDocument();
      expect(screen.getByText('+75 mm/min')).toBeInTheDocument();
      expect(screen.getByLabelText('Rising trend')).toBeInTheDocument();

      const trendContainer = screen.getByLabelText(/Trend: Loading.*speed: \+75 mm\/min/);
      expect(trendContainer).toHaveClass('text-green-600', 'bg-green-100');
    });

    it('displays unloading trend correctly', () => {
      const tank = trendTanks.normalUnloading;
      render(<TankCard tank={tank} />);

      expect(screen.getByText('Unloading')).toBeInTheDocument();
      expect(screen.getByText('-80 mm/min')).toBeInTheDocument();
      expect(screen.getByLabelText('Falling trend')).toBeInTheDocument();

      const trendContainer = screen.getByLabelText(/Trend: Unloading.*speed: -80 mm\/min/);
      expect(trendContainer).toHaveClass('text-red-600', 'bg-red-100');
    });

    it('displays stable trend correctly', () => {
      const tank = trendTanks.stableZero;
      render(<TankCard tank={tank} />);

      expect(screen.getByText('Stable')).toBeInTheDocument();
      expect(screen.getByLabelText('Stable')).toBeInTheDocument();

      const trendContainer = screen.getByLabelText('Trend: Stable');
      expect(trendContainer).toHaveClass('text-gray-600', 'bg-gray-50');
    });

    it('displays trend intensity based on speed', () => {
      // Slow trend
      const slowTank = trendTanks.slowLoading;
      const { unmount: unmount1 } = render(<TankCard tank={slowTank} />);
      const slowTrend = screen.getByLabelText(/Trend: Loading/);
      expect(slowTrend).toHaveClass('text-green-500', 'bg-green-50');
      unmount1();

      // Fast trend
      const fastTank = trendTanks.veryFastLoading;
      const { unmount: unmount2 } = render(<TankCard tank={fastTank} />);
      const fastTrend = screen.getByLabelText(/Trend: Loading/);
      expect(fastTrend).toHaveClass('text-green-700', 'bg-green-200');
      unmount2();
    });

    it('does not display trend section when trend is undefined', () => {
      const tank = createMockTank({ trend: undefined });
      render(<TankCard tank={tank} />);

      expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      expect(screen.queryByText('Unloading')).not.toBeInTheDocument();
      expect(screen.queryByText('Stable')).not.toBeInTheDocument();
    });

    it('handles trend without trendValue', () => {
      const tank = createMockTank({
        trend: 'loading',
        trendValue: undefined,
      });
      render(<TankCard tank={tank} />);

      expect(screen.getByText('Loading')).toBeInTheDocument();
      expect(screen.queryByText(/mm\/min/)).not.toBeInTheDocument();
    });
  });

  describe('Last Updated Display', () => {
    it('displays last updated time correctly', () => {
      const tank = createMockTank({
        lastUpdated: new Date('2024-01-01T14:30:00Z'),
      });
      render(<TankCard tank={tank} />);

      // The exact format depends on locale, but we can check for presence
      const timeElement = screen.getByLabelText(/Last updated:/);
      expect(timeElement).toBeInTheDocument();
    });

    it('updates time display for recent updates', () => {
      const recentTank = edgeCaseTanks.recentUpdate;
      render(<TankCard tank={recentTank} />);

      const timeElement = screen.getByLabelText(/Last updated:/);
      expect(timeElement).toBeInTheDocument();
    });
  });

  describe('Alarm Threshold Testing', () => {
    it('correctly identifies alarm states at various thresholds', () => {
      // Test tanks at specific alarm thresholds
      const testCases = [
        { tank: alarmThresholdTanks.belowLowAlarm, shouldHaveAlarm: true },
        { tank: alarmThresholdTanks.atLowAlarm, shouldHaveAlarm: true },
        { tank: alarmThresholdTanks.aboveLowAlarm, shouldHaveAlarm: false },
        { tank: alarmThresholdTanks.belowHighAlarm, shouldHaveAlarm: false },
        { tank: alarmThresholdTanks.atHighAlarm, shouldHaveAlarm: true },
        { tank: alarmThresholdTanks.aboveHighAlarm, shouldHaveAlarm: true },
        { tank: alarmThresholdTanks.belowCritical, shouldHaveAlarm: true },
        { tank: alarmThresholdTanks.atCritical, shouldHaveAlarm: true },
        { tank: alarmThresholdTanks.aboveCritical, shouldHaveAlarm: true },
      ];

      testCases.forEach(({ tank, shouldHaveAlarm }) => {
        const { unmount } = render(<TankCard tank={tank} />);

        if (shouldHaveAlarm) {
          expect(screen.queryByRole('alert')).toBeInTheDocument();
          const article = screen.getByRole('region');
          expect(article).toHaveAttribute('aria-live', 'assertive');
        } else {
          expect(screen.queryByRole('alert')).not.toBeInTheDocument();
          const article = screen.getByRole('region');
          expect(article).toHaveAttribute('aria-live', 'polite');
        }

        unmount();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles long tank names gracefully', () => {
      const tank = edgeCaseTanks.longName;
      render(<TankCard tank={tank} />);

      expect(screen.getByText(tank.name)).toBeInTheDocument();
    });

    it('handles special characters in names and locations', () => {
      const tank = edgeCaseTanks.specialCharacters;
      render(<TankCard tank={tank} />);

      expect(screen.getByText(tank.name)).toBeInTheDocument();
      expect(screen.getByText(tank.location)).toBeInTheDocument();
    });

    it('maintains consistent layout with varying content', () => {
      // Test that components maintain consistent structure
      const tanks = [
        mockTanks.normal,
        mockTanks.noTemperature,
        edgeCaseTanks.longName,
        trendTanks.veryFastLoading,
      ];

      tanks.forEach(tank => {
        const { unmount } = render(<TankCard tank={tank} />);

        // Should always have these basic elements
        expect(screen.getByRole('region')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByText(tank.name)).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('Component Structure and Layout', () => {
    it('maintains proper semantic structure', () => {
      const tank = mockTanks.normal;
      render(<TankCard tank={tank} />);

      // Check main article wrapper
      const article = screen.getByRole('region');
      expect(article).toBeInTheDocument();

      // Check heading structure
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent(tank.name);

      // Check status elements
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThan(0);

      // Check progressbar
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('applies hover effects and transitions', () => {
      const tank = mockTanks.normal;
      render(<TankCard tank={tank} />);

      const article = screen.getByRole('region');
      expect(article).toHaveClass('transition-all', 'duration-300', 'hover:shadow-xl', 'hover:scale-[1.02]');
    });
  });
});
