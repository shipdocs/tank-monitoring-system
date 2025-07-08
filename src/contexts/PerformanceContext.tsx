import React, { createContext, useContext, useEffect, useState } from 'react';
import { type PerformanceMetric, performanceMonitor } from '../services/performanceMonitoring';

interface PerformanceContextType {
  isMonitoringEnabled: boolean;
  toggleMonitoring: () => void;
  showDashboard: boolean;
  openDashboard: () => void;
  closeDashboard: () => void;
  metrics: PerformanceMetric[];
  summary: ReturnType<typeof performanceMonitor.getMetricsSummary>;
  clearMetrics: () => void;
  exportMetrics: () => string;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

interface PerformanceProviderProps {
  children: React.ReactNode;
  enableByDefault?: boolean;
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
  enableByDefault = true,
}) => {
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState(enableByDefault);
  const [showDashboard, setShowDashboard] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [summary, setSummary] = useState(performanceMonitor.getMetricsSummary());

  useEffect(() => {
    // Initialize monitoring state
    if (enableByDefault) {
      performanceMonitor.enable();
    } else {
      performanceMonitor.disable();
    }

    // Subscribe to performance metrics
    const unsubscribe = performanceMonitor.subscribe((metric) => {
      setMetrics(prev => [...prev.slice(-99), metric]); // Keep last 100 metrics
      setSummary(performanceMonitor.getMetricsSummary());
    });

    // Initial load
    setMetrics(performanceMonitor.getMetrics().slice(-100));
    setSummary(performanceMonitor.getMetricsSummary());

    return () => {
      unsubscribe();
    };
  }, [enableByDefault]);

  const toggleMonitoring = () => {
    const newState = !isMonitoringEnabled;
    setIsMonitoringEnabled(newState);

    if (newState) {
      performanceMonitor.enable();
    } else {
      performanceMonitor.disable();
    }
  };

  const openDashboard = () => setShowDashboard(true);
  const closeDashboard = () => setShowDashboard(false);

  const clearMetrics = () => {
    performanceMonitor.clearMetrics();
    setMetrics([]);
    setSummary(performanceMonitor.getMetricsSummary());
  };

  const exportMetrics = () => performanceMonitor.exportMetrics();

  const contextValue: PerformanceContextType = {
    isMonitoringEnabled,
    toggleMonitoring,
    showDashboard,
    openDashboard,
    closeDashboard,
    metrics,
    summary,
    clearMetrics,
    exportMetrics,
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformanceContext = (): PerformanceContextType => {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformanceContext must be used within a PerformanceProvider');
  }
  return context;
};

// Performance debugging utilities
export const PerformanceDebugger: React.FC = () => {
  const { metrics, summary, isMonitoringEnabled } = usePerformanceContext();

  if (process.env.NODE_ENV !== 'development' || !isMonitoringEnabled) {
    return null;
  }

  const recentMetrics = metrics.slice(-5);
  const hasSlowRenders = recentMetrics.some(m =>
    m.category === 'render' && m.value > 16,
  );
  const hasSlowTankUpdates = recentMetrics.some(m =>
    m.category === 'tank-update' && m.value > 100,
  );

  if (!hasSlowRenders && !hasSlowTankUpdates) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 rounded-lg p-3 max-w-sm text-sm">
      <div className="font-medium text-yellow-800 mb-1">Performance Warning</div>
      {hasSlowRenders && (
        <div className="text-yellow-700">Slow component renders detected</div>
      )}
      {hasSlowTankUpdates && (
        <div className="text-yellow-700">Slow tank updates detected</div>
      )}
      <div className="mt-2">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('openPerformanceDashboard'))}
          className="text-yellow-800 underline hover:no-underline"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default PerformanceContext;
