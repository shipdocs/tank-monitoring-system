import { type Metric, onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  delta?: number;
  unit: string;
  timestamp: number;
  category: 'web-vitals' | 'custom' | 'websocket' | 'render' | 'tank-update';
  metadata?: Record<string, any>;
}

export interface TankUpdateMetric {
  tankId: string;
  updateLatency: number;
  renderTime: number;
  dataSize: number;
  timestamp: number;
}

export interface WebSocketMetric {
  connectionTime: number;
  messageLatency: number;
  reconnectionCount: number;
  messageCount: number;
  errorCount: number;
  lastMessageTimestamp: number;
}

export interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  propsSize: number;
  reRenderCount: number;
  timestamp: number;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private subscribers: ((metric: PerformanceMetric) => void)[] = [];
  private webSocketStartTime = 0;
  private webSocketMetrics: WebSocketMetric = {
    connectionTime: 0,
    messageLatency: 0,
    reconnectionCount: 0,
    messageCount: 0,
    errorCount: 0,
    lastMessageTimestamp: 0,
  };
  private tankUpdateMetrics = new Map<string, TankUpdateMetric[]>();
  private componentMetrics = new Map<string, ComponentRenderMetric[]>();
  private isEnabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebVitals();
      this.initializeMemoryMonitoring();
    }
  }

  private initializeWebVitals(): void {
    // Initialize Web Vitals monitoring
    onCLS((metric: Metric) => {
      this.addMetric({
        id: `cls-${Date.now()}`,
        name: 'Cumulative Layout Shift',
        value: metric.value,
        delta: metric.delta,
        unit: 'score',
        timestamp: Date.now(),
        category: 'web-vitals',
        metadata: {
          id: metric.id,
          navigationType: metric.navigationType,
        },
      });
    });

    // FID measurement using manual event listener (onFID not available in this web-vitals version)
    let firstInputDelay: number | null = null;
    let firstInputTime: number | null = null;

    const handleFirstInput = (event: Event) => {
      if (firstInputDelay === null) {
        firstInputTime = performance.now();
        requestAnimationFrame(() => {
          if (firstInputTime !== null) {
            firstInputDelay = performance.now() - firstInputTime;
            this.addMetric({
              id: `fid-${Date.now()}`,
              name: 'First Input Delay',
              value: firstInputDelay,
              delta: firstInputDelay,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'web-vitals',
              metadata: {
                id: `fid-${Date.now()}`,
                eventType: event.type,
              },
            });
            // Remove listeners after first input
            ['mousedown', 'keydown', 'touchstart', 'pointerdown'].forEach(type => {
              document.removeEventListener(type, handleFirstInput, { capture: true });
            });
          }
        });
      }
    };

    // Listen for first input events
    ['mousedown', 'keydown', 'touchstart', 'pointerdown'].forEach(type => {
      document.addEventListener(type, handleFirstInput, { capture: true, once: true });
    });

    onFCP((metric: Metric) => {
      this.addMetric({
        id: `fcp-${Date.now()}`,
        name: 'First Contentful Paint',
        value: metric.value,
        delta: metric.delta,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'web-vitals',
        metadata: {
          id: metric.id,
          navigationType: metric.navigationType,
        },
      });
    });

    onLCP((metric: Metric) => {
      this.addMetric({
        id: `lcp-${Date.now()}`,
        name: 'Largest Contentful Paint',
        value: metric.value,
        delta: metric.delta,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'web-vitals',
        metadata: {
          id: metric.id,
          navigationType: metric.navigationType,
        },
      });
    });

    onTTFB((metric: Metric) => {
      this.addMetric({
        id: `ttfb-${Date.now()}`,
        name: 'Time to First Byte',
        value: metric.value,
        delta: metric.delta,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'web-vitals',
        metadata: {
          id: metric.id,
          navigationType: metric.navigationType,
        },
      });
    });
  }

  private initializeMemoryMonitoring(): void {
    // Monitor memory usage every 30 seconds
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.addMetric({
          id: `memory-${Date.now()}`,
          name: 'Memory Usage',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          timestamp: Date.now(),
          category: 'custom',
          metadata: {
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
          },
        });
      }
    }, 30000);
  }

  // WebSocket Performance Tracking
  trackWebSocketConnection(): void {
    this.webSocketStartTime = performance.now();
  }

  trackWebSocketConnected(): void {
    const connectionTime = performance.now() - this.webSocketStartTime;
    this.webSocketMetrics.connectionTime = connectionTime;

    this.addMetric({
      id: `ws-connection-${Date.now()}`,
      name: 'WebSocket Connection Time',
      value: connectionTime,
      unit: 'ms',
      timestamp: Date.now(),
      category: 'websocket',
    });
  }

  trackWebSocketMessage(messageSize: number): void {
    const now = performance.now();
    const latency = this.webSocketMetrics.lastMessageTimestamp > 0
      ? now - this.webSocketMetrics.lastMessageTimestamp
      : 0;

    this.webSocketMetrics.messageCount++;
    this.webSocketMetrics.messageLatency = latency;
    this.webSocketMetrics.lastMessageTimestamp = now;

    if (this.webSocketMetrics.messageCount % 10 === 0) { // Report every 10 messages
      this.addMetric({
        id: `ws-message-${Date.now()}`,
        name: 'WebSocket Message Metrics',
        value: latency,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'websocket',
        metadata: {
          messageCount: this.webSocketMetrics.messageCount,
          averageLatency: this.webSocketMetrics.messageLatency,
          messageSize,
          throughput: this.webSocketMetrics.messageCount / ((now - this.webSocketStartTime) / 1000),
        },
      });
    }
  }

  trackWebSocketError(): void {
    this.webSocketMetrics.errorCount++;

    this.addMetric({
      id: `ws-error-${Date.now()}`,
      name: 'WebSocket Error',
      value: this.webSocketMetrics.errorCount,
      unit: 'count',
      timestamp: Date.now(),
      category: 'websocket',
    });
  }

  trackWebSocketReconnection(): void {
    this.webSocketMetrics.reconnectionCount++;

    this.addMetric({
      id: `ws-reconnection-${Date.now()}`,
      name: 'WebSocket Reconnection',
      value: this.webSocketMetrics.reconnectionCount,
      unit: 'count',
      timestamp: Date.now(),
      category: 'websocket',
    });
  }

  // Tank Update Performance Tracking
  trackTankUpdateStart(tankId: string): string {
    const measureId = `tank-update-${tankId}-${Date.now()}`;
    performance.mark(`${measureId}-start`);
    return measureId;
  }

  trackTankUpdateEnd(measureId: string, tankId: string, dataSize: number): void {
    const endMark = `${measureId}-end`;
    performance.mark(endMark);
    performance.measure(measureId, `${measureId}-start`, endMark);

    const measure = performance.getEntriesByName(measureId)[0];
    const updateLatency = measure.duration;

    // Track render time separately
    const renderMeasureId = `${measureId}-render`;
    requestAnimationFrame(() => {
      performance.mark(`${renderMeasureId}-end`);
      performance.measure(renderMeasureId, `${measureId}-start`, `${renderMeasureId}-end`);

      const renderMeasure = performance.getEntriesByName(renderMeasureId)[0];
      const renderTime = renderMeasure.duration;

      const metric: TankUpdateMetric = {
        tankId,
        updateLatency,
        renderTime,
        dataSize,
        timestamp: Date.now(),
      };

      // Store tank-specific metrics
      if (!this.tankUpdateMetrics.has(tankId)) {
        this.tankUpdateMetrics.set(tankId, []);
      }
      const tankMetrics = this.tankUpdateMetrics.get(tankId)!;
      tankMetrics.push(metric);

      // Keep only last 100 metrics per tank
      if (tankMetrics.length > 100) {
        tankMetrics.splice(0, tankMetrics.length - 100);
      }

      this.addMetric({
        id: `tank-update-${tankId}-${Date.now()}`,
        name: 'Tank Update Performance',
        value: updateLatency,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'tank-update',
        metadata: {
          tankId,
          renderTime,
          dataSize,
          updateLatency,
        },
      });

      // Clean up performance entries
      performance.clearMarks(`${measureId}-start`);
      performance.clearMarks(endMark);
      performance.clearMarks(`${renderMeasureId}-end`);
      performance.clearMeasures(measureId);
      performance.clearMeasures(renderMeasureId);
    });
  }

  // Component Render Performance Tracking
  trackComponentRender(componentName: string, propsSize: number = 0): () => void {
    const startTime = performance.now();
    const _markId = `component-${componentName}-${Date.now()}`;

    return () => {
      const renderTime = performance.now() - startTime;

      if (!this.componentMetrics.has(componentName)) {
        this.componentMetrics.set(componentName, []);
      }

      const componentMetricsList = this.componentMetrics.get(componentName)!;
      const reRenderCount = componentMetricsList.length + 1;

      const metric: ComponentRenderMetric = {
        componentName,
        renderTime,
        propsSize,
        reRenderCount,
        timestamp: Date.now(),
      };

      componentMetricsList.push(metric);

      // Keep only last 50 renders per component
      if (componentMetricsList.length > 50) {
        componentMetricsList.splice(0, componentMetricsList.length - 50);
      }

      // Only report slow renders (> 16ms for 60fps)
      if (renderTime > 16) {
        this.addMetric({
          id: `component-render-${componentName}-${Date.now()}`,
          name: 'Component Render Time',
          value: renderTime,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'render',
          metadata: {
            componentName,
            propsSize,
            reRenderCount,
            isSlowRender: renderTime > 16,
          },
        });
      }
    };
  }

  // Custom Performance Metrics
  addCustomMetric(name: string, value: number, unit: string, metadata?: Record<string, any>): void {
    this.addMetric({
      id: `custom-${Date.now()}`,
      name,
      value,
      unit,
      timestamp: Date.now(),
      category: 'custom',
      metadata,
    });
  }

  // Core metric management
  private addMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return;

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics.splice(0, this.metrics.length - 1000);
    }

    // Notify subscribers
    this.subscribers.forEach(callback => callback(metric));
  }

  // Public API
  getMetrics(category?: PerformanceMetric['category']): PerformanceMetric[] {
    if (category) {
      return this.metrics.filter(metric => metric.category === category);
    }
    return [...this.metrics];
  }

  getMetricsSummary(): {
    webVitals: Record<string, { latest: number; average: number; count: number }>;
    tankUpdates: Record<string, { averageLatency: number; averageRenderTime: number; count: number }>;
    webSocket: WebSocketMetric;
    components: Record<string, { averageRenderTime: number; reRenderCount: number }>;
    } {
    const webVitalsMetrics = this.getMetrics('web-vitals');
    const webVitals: Record<string, { latest: number; average: number; count: number }> = {};

    // Process Web Vitals
    webVitalsMetrics.forEach(metric => {
      if (!webVitals[metric.name]) {
        webVitals[metric.name] = { latest: 0, average: 0, count: 0 };
      }
      const summary = webVitals[metric.name];
      summary.latest = metric.value;
      summary.average = (summary.average * summary.count + metric.value) / (summary.count + 1);
      summary.count++;
    });

    // Process Tank Updates
    const tankUpdates: Record<string, { averageLatency: number; averageRenderTime: number; count: number }> = {};
    this.tankUpdateMetrics.forEach((metrics, tankId) => {
      const avgLatency = metrics.reduce((sum, m) => sum + m.updateLatency, 0) / metrics.length;
      const avgRenderTime = metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length;
      tankUpdates[tankId] = {
        averageLatency: avgLatency,
        averageRenderTime: avgRenderTime,
        count: metrics.length,
      };
    });

    // Process Components
    const components: Record<string, { averageRenderTime: number; reRenderCount: number }> = {};
    this.componentMetrics.forEach((metrics, componentName) => {
      const avgRenderTime = metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length;
      components[componentName] = {
        averageRenderTime: avgRenderTime,
        reRenderCount: metrics.length,
      };
    });

    return {
      webVitals,
      tankUpdates,
      webSocket: { ...this.webSocketMetrics },
      components,
    };
  }

  subscribe(callback: (metric: PerformanceMetric) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  clearMetrics(): void {
    this.metrics = [];
    this.tankUpdateMetrics.clear();
    this.componentMetrics.clear();
    this.webSocketMetrics = {
      connectionTime: 0,
      messageLatency: 0,
      reconnectionCount: 0,
      messageCount: 0,
      errorCount: 0,
      lastMessageTimestamp: 0,
    };
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }

  // Export metrics for external analysis
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      metrics: this.metrics,
      summary: this.getMetricsSummary(),
    }, null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitoringService();

// React hook for accessing performance metrics
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = React.useState<PerformanceMetric[]>([]);
  const [summary, setSummary] = React.useState(performanceMonitor.getMetricsSummary());

  React.useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe((metric) => {
      setMetrics(prev => [...prev.slice(-99), metric]); // Keep last 100 metrics
      setSummary(performanceMonitor.getMetricsSummary());
    });

    // Initial load
    setMetrics(performanceMonitor.getMetrics().slice(-100));
    setSummary(performanceMonitor.getMetricsSummary());

    return unsubscribe;
  }, []);

  return {
    metrics,
    summary,
    clearMetrics: () => {
      performanceMonitor.clearMetrics();
      setMetrics([]);
      setSummary(performanceMonitor.getMetricsSummary());
    },
    exportMetrics: performanceMonitor.exportMetrics.bind(performanceMonitor),
    isEnabled: performanceMonitor.isMonitoringEnabled(),
  };
}

// HOC for tracking component performance
export function withPerformanceTracking<T extends Record<string, any>>(
  WrappedComponent: React.ComponentType<T>,
  componentName?: string,
): React.ComponentType<T> {
  return React.memo((props: T) => {
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'UnknownComponent';
    const propsSize = JSON.stringify(props).length;

    const endTracking = React.useMemo(() => performanceMonitor.trackComponentRender(name, propsSize), [name, propsSize]);

    React.useEffect(() => {
      endTracking();
    });

    return React.createElement(WrappedComponent, props);
  });
}

export default performanceMonitor;
