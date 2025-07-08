import { useCallback, useEffect, useRef } from 'react';
import { type Tank } from '../types/tank';

interface UseTankAccessibilityOptions {
  tank: Tank;
  onActivate?: (tank: Tank) => void;
  onDetails?: (tank: Tank) => void;
  enableFocus?: boolean;
  enableKeyboardNavigation?: boolean;
}

export const useTankAccessibility = (options: UseTankAccessibilityOptions) => {
  const { tank, onActivate, onDetails, enableFocus = true, enableKeyboardNavigation = true } = options;
  const containerRef = useRef<HTMLElement>(null);

  // Generate comprehensive ARIA descriptions
  const getAriaDescription = useCallback(() => {
    const percentage = ((tank.currentLevel / tank.maxCapacity) * 100);
    const parts = [
      `Tank ${tank.name}`,
      `Level: ${tank.currentLevel.toFixed(0)} millimeters`,
      `${percentage.toFixed(1)} percent full`,
      `Status: ${tank.status}`,
      `Location: ${tank.location}`,
    ];

    if (tank.temperature !== undefined) {
      parts.push(`Temperature: ${tank.temperature.toFixed(1)} degrees Celsius`);
    }

    if (tank.trend) {
      let trendText = `Trend: ${tank.trend}`;
      if (tank.trendValue && tank.trendValue > 0) {
        trendText += ` at ${tank.trendValue.toFixed(1)} millimeters per minute`;
      }
      parts.push(trendText);
    }

    parts.push(`Last updated: ${new Date(tank.lastUpdated).toLocaleTimeString()}`);

    return parts.join(', ');
  }, [tank]);

  // Generate live region content for dynamic updates
  const getLiveRegionContent = useCallback(() => {
    const percentage = ((tank.currentLevel / tank.maxCapacity) * 100);
    const isAlarm = tank.status === 'high' || tank.status === 'critical' || tank.status === 'low';

    if (isAlarm) {
      return `Alert: Tank ${tank.name} requires attention. Status: ${tank.status}. Level: ${percentage.toFixed(1)} percent.`;
    }

    return `Tank ${tank.name} updated. Level: ${percentage.toFixed(1)} percent. Status: ${tank.status}.`;
  }, [tank]);

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableKeyboardNavigation || !containerRef.current) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onActivate) {
          onActivate(tank);
        }
        break;
      case 'i':
      case 'I':
        event.preventDefault();
        if (onDetails) {
          onDetails(tank);
        }
        break;
      case 'Escape':
        event.preventDefault();
        // Remove focus if focused
        if (document.activeElement === containerRef.current) {
          (document.activeElement as HTMLElement).blur();
        }
        break;
    }
  }, [tank, onActivate, onDetails, enableKeyboardNavigation]);

  // Set up keyboard event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enableKeyboardNavigation) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enableKeyboardNavigation]);

  // Focus management
  const focusContainer = useCallback(() => {
    if (containerRef.current && enableFocus) {
      containerRef.current.focus();
    }
  }, [enableFocus]);

  // Get comprehensive ARIA attributes
  const getAriaAttributes = useCallback(() => {
    const percentage = ((tank.currentLevel / tank.maxCapacity) * 100);
    const isAlarm = tank.status === 'high' || tank.status === 'critical' || tank.status === 'low';

    return {
      'aria-label': `Tank ${tank.name}`,
      'aria-description': getAriaDescription(),
      'aria-live': isAlarm ? 'assertive' as const : 'polite' as const,
      'aria-atomic': true,
      'role': 'region' as const,
      'tabIndex': enableFocus ? 0 : -1,
      'aria-expanded': false,
      'aria-selected': false,
      'data-tank-id': tank.id,
      'data-tank-status': tank.status,
      'data-tank-percentage': percentage.toFixed(1),
    };
  }, [tank, getAriaDescription, enableFocus]);

  // Get progress bar ARIA attributes
  const getProgressAriaAttributes = useCallback(() => {
    const percentage = ((tank.currentLevel / tank.maxCapacity) * 100);

    return {
      'role': 'progressbar' as const,
      'aria-valuenow': Math.max(0, Math.min(percentage, 100)),
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuetext': `${percentage.toFixed(1)} percent full`,
      'aria-label': `Tank ${tank.name} fill level`,
    };
  }, [tank]);

  // Get status indicator ARIA attributes
  const getStatusAriaAttributes = useCallback(() => ({
    'role': 'status' as const,
    'aria-label': `Tank status: ${tank.status}`,
    'aria-live': 'polite' as const,
  }), [tank.status]);

  // Get trend indicator ARIA attributes
  const getTrendAriaAttributes = useCallback(() => {
    if (!tank.trend) return null;

    let trendText = `Trend: ${tank.trend}`;
    if (tank.trendValue && tank.trendValue > 0) {
      trendText += ` at ${tank.trendValue.toFixed(1)} millimeters per minute`;
    }

    return {
      'role': 'status' as const,
      'aria-label': trendText,
      'aria-live': 'polite' as const,
    };
  }, [tank.trend, tank.trendValue]);

  return {
    containerRef,
    getAriaAttributes,
    getProgressAriaAttributes,
    getStatusAriaAttributes,
    getTrendAriaAttributes,
    getAriaDescription,
    getLiveRegionContent,
    focusContainer,
    isAlarmState: tank.status === 'high' || tank.status === 'critical' || tank.status === 'low',
  };
};
