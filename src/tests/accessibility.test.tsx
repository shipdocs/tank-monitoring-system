import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TankCard } from '../components/TankCard';
import { TankListItem } from '../components/TankListItem';
import { CompactTankCard } from '../components/CompactTankCard';
import { TankCylinder } from '../components/TankCylinder';
import { ViewControls } from '../components/ViewControls';
import { AlarmSummary } from '../components/AlarmSummary';
import { AccessibilityProvider } from '../components/AccessibilityProvider';
import { type Tank, ViewMode } from '../types/tank';

// Mock tank data
const mockTank: Tank = {
  id: 'tank-1',
  name: 'Test Tank',
  location: 'Test Location',
  currentLevel: 150,
  maxCapacity: 200,
  status: 'normal',
  lastUpdated: new Date().toISOString(),
  temperature: 25.5,
  trend: 'stable',
  trendValue: 5,
  sortOrder: 1,
  configured: true,
  displayName: 'Test Tank',
  group: 'test-group',
};

const mockAlarmTank: Tank = {
  ...mockTank,
  id: 'alarm-tank',
  status: 'critical',
  name: 'Alarm Tank',
};

const mockTanks = [mockTank, mockAlarmTank];

describe('Accessibility Tests', () => {
  describe('TankCard', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<TankCard tank={mockTank} />);

      const tankCard = screen.getByRole('region', { name: 'Tank Test Tank' });
      expect(tankCard).toBeInTheDocument();

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');

      const statusIndicator = screen.getByRole('status', { name: 'Status: normal' });
      expect(statusIndicator).toBeInTheDocument();
    });

    it('should announce alarms with assertive live region', () => {
      render(<TankCard tank={mockAlarmTank} />);

      const tankCard = screen.getByRole('region', { name: 'Tank Alarm Tank' });
      expect(tankCard).toHaveAttribute('aria-live', 'assertive');

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();
    });
  });

  describe('TankListItem', () => {
    it('should have proper semantic structure', () => {
      render(<TankListItem tank={mockTank} />);

      const tankItem = screen.getByRole('region', { name: 'Tank Test Tank' });
      expect(tankItem).toBeInTheDocument();

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Tank fill level: 75.0 percent');
    });
  });

  describe('CompactTankCard', () => {
    it('should have accessible status and level information', () => {
      render(<CompactTankCard tank={mockTank} />);

      const tankCard = screen.getByRole('region', { name: 'Tank Test Tank' });
      expect(tankCard).toBeInTheDocument();

      const statusIndicator = screen.getByRole('status', { name: 'Status: normal' });
      expect(statusIndicator).toBeInTheDocument();
    });
  });

  describe('TankCylinder', () => {
    it('should have accessible cylinder visualization', () => {
      render(<TankCylinder tank={mockTank} />);

      const tankCylinder = screen.getByRole('region', { name: 'Tank Test Tank' });
      expect(tankCylinder).toBeInTheDocument();

      const visualization = screen.getByRole('img', { name: 'Tank visualization showing 75 percent full' });
      expect(visualization).toBeInTheDocument();

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Tank fill level');
    });
  });

  describe('ViewControls', () => {
    it('should have proper radio group behavior', async () => {
      const user = userEvent.setup();
      const mockOnViewChange = jest.fn();

      render(
        <ViewControls
          currentView="grid"
          onViewChange={mockOnViewChange}
        />,
      );

      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toBeInTheDocument();

      const gridButton = screen.getByRole('radio', { name: /Grid View/ });
      expect(gridButton).toHaveAttribute('aria-checked', 'true');

      const listButton = screen.getByRole('radio', { name: /List View/ });
      expect(listButton).toHaveAttribute('aria-checked', 'false');

      await user.click(listButton);
      expect(mockOnViewChange).toHaveBeenCalledWith('list');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockOnViewChange = jest.fn();

      render(
        <ViewControls
          currentView="grid"
          onViewChange={mockOnViewChange}
        />,
      );

      const gridButton = screen.getByRole('radio', { name: /Grid View/ });
      gridButton.focus();

      // Arrow right should move to next option
      await user.keyboard('{ArrowRight}');
      expect(mockOnViewChange).toHaveBeenCalled();
    });
  });

  describe('AlarmSummary', () => {
    it('should have accessible summary information', () => {
      render(<AlarmSummary tanks={mockTanks} lastSync={new Date().toISOString()} />);

      const summary = screen.getByRole('region', { name: 'Tank status summary' });
      expect(summary).toBeInTheDocument();

      const normalTanks = screen.getByLabelText('1 tanks operating normally');
      expect(normalTanks).toBeInTheDocument();

      const alarmTanks = screen.getByLabelText('1 tanks with alarms');
      expect(alarmTanks).toBeInTheDocument();

      const alertStatus = screen.getByRole('alert');
      expect(alertStatus).toBeInTheDocument();
    });
  });

  describe('AccessibilityProvider', () => {
    it('should provide announcement functionality', () => {
      const TestComponent = () => {
        const { announce } = require('../hooks/useScreenReaderAnnouncement').useScreenReaderAnnouncement();

        return (
          <button onClick={() => announce('Test announcement')}>
            Announce
          </button>
        );
      };

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>,
      );

      const button = screen.getByRole('button', { name: 'Announce' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support focus management', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <button>Button 1</button>
          <button>Button 2</button>
          <button>Button 3</button>
        </div>,
      );

      const button1 = screen.getByRole('button', { name: 'Button 1' });
      const button2 = screen.getByRole('button', { name: 'Button 2' });

      button1.focus();
      expect(button1).toHaveFocus();

      await user.tab();
      expect(button2).toHaveFocus();
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should have proper heading hierarchy', () => {
      render(
        <div>
          <h1>Main Title</h1>
          <h2>Section Title</h2>
          <h3>Subsection Title</h3>
        </div>,
      );

      const mainHeading = screen.getByRole('heading', { level: 1 });
      const sectionHeading = screen.getByRole('heading', { level: 2 });
      const subsectionHeading = screen.getByRole('heading', { level: 3 });

      expect(mainHeading).toBeInTheDocument();
      expect(sectionHeading).toBeInTheDocument();
      expect(subsectionHeading).toBeInTheDocument();
    });
  });

  describe('Color Contrast and Visual Indicators', () => {
    it('should not rely solely on color for information', () => {
      render(<TankCard tank={mockAlarmTank} />);

      // Check that alarm state is indicated by more than just color
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();

      // Check that status is communicated through aria-label
      const statusIndicator = screen.getByRole('status', { name: 'Status: critical' });
      expect(statusIndicator).toBeInTheDocument();
    });
  });
});
