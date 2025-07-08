import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { PerformanceProvider } from './contexts/PerformanceContext';
import { errorMonitoring } from './services/errorMonitoring';
import { performanceMonitor } from './services/performanceMonitoring';
import './index.css';

// Initialize error monitoring
errorMonitoring.initialize({
  enabled: true,
  service: 'custom', // Change to 'sentry', 'logRocket', etc. when ready
  // apiKey: process.env.REACT_APP_ERROR_MONITORING_KEY,
  environment: process.env.NODE_ENV || 'development',
});

// Initialize performance monitoring
// Enable by default in development, configurable in production
const enablePerformanceMonitoring =
  process.env.NODE_ENV === 'development' ||
  localStorage.getItem('enablePerformanceMonitoring') === 'true';

if (enablePerformanceMonitoring) {
  performanceMonitor.enable();
  console.log('Performance monitoring enabled');
}

// Set up global error handlers
window.addEventListener('unhandledrejection', (event) => {
  errorMonitoring.reportError(
    new Error(`Unhandled Promise Rejection: ${event.reason}`),
    undefined,
    { source: 'unhandledrejection' },
  );
});

// Performance monitoring for global events
if (enablePerformanceMonitoring) {
  // Track page load performance
  window.addEventListener('load', () => {
    // Measure total page load time
    const loadTime = performance.now();
    performanceMonitor.addCustomMetric(
      'Page Load Time',
      loadTime,
      'ms',
      {
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    );
  });

  // Track navigation performance
  const lastNavigationTime = performance.now();
  window.addEventListener('beforeunload', () => {
    const sessionDuration = performance.now() - lastNavigationTime;
    performanceMonitor.addCustomMetric(
      'Session Duration',
      sessionDuration,
      'ms',
      { url: window.location.href },
    );
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PerformanceProvider enableByDefault={enablePerformanceMonitoring}>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </PerformanceProvider>
  </StrictMode>,
);
