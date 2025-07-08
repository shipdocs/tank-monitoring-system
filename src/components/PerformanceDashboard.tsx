import React, { useEffect, useState } from 'react';
import { type PerformanceMetric, usePerformanceMetrics } from '../services/performanceMonitoring';
import { Activity, AlertTriangle, CheckCircle, Clock, Download, Monitor, Wifi, XCircle } from 'lucide-react';

interface PerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ isOpen, onClose }) => {
  const { metrics, summary, clearMetrics, exportMetrics, isEnabled } = usePerformanceMetrics();
  const [selectedCategory, setSelectedCategory] = useState<PerformanceMetric['category'] | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const filteredMetrics = selectedCategory === 'all'
    ? metrics
    : metrics.filter(m => m.category === selectedCategory);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Force a re-render to update the display
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatValue = (value: number, unit: string): string => {
    if (unit === 'ms') {
      return value < 1000 ? `${value.toFixed(2)}ms` : `${(value / 1000).toFixed(2)}s`;
    }
    if (unit === 'bytes') {
      if (value < 1024) return `${value}B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)}KB`;
      return `${(value / (1024 * 1024)).toFixed(2)}MB`;
    }
    return `${value.toFixed(2)}${unit}`;
  };

  const getPerformanceStatus = (metric: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds: Record<string, { good: number; poor: number }> = {
      'Largest Contentful Paint': { good: 2500, poor: 4000 },
      'First Input Delay': { good: 100, poor: 300 },
      'Cumulative Layout Shift': { good: 0.1, poor: 0.25 },
      'First Contentful Paint': { good: 1800, poor: 3000 },
      'Time to First Byte': { good: 800, poor: 1800 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const getStatusIcon = (status: 'good' | 'needs-improvement' | 'poor') => {
    switch (status) {
      case 'good': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'needs-improvement': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'poor': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'good' | 'needs-improvement' | 'poor') => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
    }
  };

  const handleExport = () => {
    const data = exportMetrics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Performance Dashboard</h2>
            <span className={`px-2 py-1 rounded text-xs ${isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {isEnabled ? 'Monitoring Active' : 'Monitoring Disabled'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-1 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span>Auto-refresh</span>
            </label>
            <button
              onClick={handleExport}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={clearMetrics}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex h-full">
          {/* Categories Sidebar */}
          <div className="w-48 bg-gray-50 border-r border-gray-200 p-4">
            <h3 className="font-medium text-gray-700 mb-3">Categories</h3>
            <div className="space-y-1">
              {[
                { key: 'all', label: 'All Metrics', icon: Activity },
                { key: 'web-vitals', label: 'Web Vitals', icon: Monitor },
                { key: 'websocket', label: 'WebSocket', icon: Wifi },
                { key: 'tank-update', label: 'Tank Updates', icon: Activity },
                { key: 'render', label: 'Render Times', icon: Clock },
                { key: 'custom', label: 'Custom', icon: Activity },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key as any)}
                  className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 text-sm ${
                    selectedCategory === key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  <span className="ml-auto bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-xs">
                    {key === 'all' ? metrics.length : metrics.filter(m => m.category === key).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Web Vitals Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                  <Monitor className="w-4 h-4 mr-2" />
                  Web Vitals
                </h3>
                <div className="space-y-2">
                  {Object.entries(summary.webVitals).map(([name, data]) => {
                    const status = getPerformanceStatus(name, data.latest);
                    return (
                      <div key={name} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 truncate">{name}</span>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(status)}
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(status)}`}>
                            {formatValue(data.latest, name.includes('Layout') ? 'score' : 'ms')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* WebSocket Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                  <Wifi className="w-4 h-4 mr-2" />
                  WebSocket
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Connection Time</span>
                    <span className="text-sm font-medium">{formatValue(summary.webSocket.connectionTime, 'ms')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Messages</span>
                    <span className="text-sm font-medium">{summary.webSocket.messageCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Errors</span>
                    <span className="text-sm font-medium text-red-600">{summary.webSocket.errorCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reconnections</span>
                    <span className="text-sm font-medium text-yellow-600">{summary.webSocket.reconnectionCount}</span>
                  </div>
                </div>
              </div>

              {/* Tank Updates Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Tank Updates
                </h3>
                <div className="space-y-2">
                  {Object.entries(summary.tankUpdates).slice(0, 3).map(([tankId, data]) => (
                    <div key={tankId} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 truncate">{tankId}</span>
                        <span className="text-xs text-gray-500">{data.count} updates</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Avg Latency</span>
                        <span className="text-xs font-medium">{formatValue(data.averageLatency, 'ms')}</span>
                      </div>
                    </div>
                  ))}
                  {Object.keys(summary.tankUpdates).length > 3 && (
                    <div className="text-xs text-gray-500 text-center pt-1">
                      +{Object.keys(summary.tankUpdates).length - 3} more tanks
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Metrics Table */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-700">
                  Recent Metrics ({filteredMetrics.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredMetrics.slice(-50).reverse().map((metric, index) => {
                      const status = metric.category === 'web-vitals'
                        ? getPerformanceStatus(metric.name, metric.value)
                        : 'good';

                      return (
                        <tr key={metric.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(metric.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              {
                                'web-vitals': 'bg-blue-100 text-blue-800',
                                'websocket': 'bg-green-100 text-green-800',
                                'tank-update': 'bg-purple-100 text-purple-800',
                                'render': 'bg-orange-100 text-orange-800',
                                'custom': 'bg-gray-100 text-gray-800',
                              }[metric.category]
                            }`}>
                              {metric.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{metric.name}</td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {formatValue(metric.value, metric.unit)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(status)}
                              <span className={`text-xs px-2 py-1 rounded ${getStatusColor(status)}`}>
                                {status.replace('-', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {metric.metadata && (
                              <details className="cursor-pointer">
                                <summary>View</summary>
                                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded max-w-xs overflow-auto">
                                  {JSON.stringify(metric.metadata, null, 2)}
                                </pre>
                              </details>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredMetrics.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No metrics found for the selected category.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
