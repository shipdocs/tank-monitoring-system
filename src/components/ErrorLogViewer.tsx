import React, { useEffect, useState } from 'react';
import { errorMonitoring } from '../services/errorMonitoring';
import { AlertCircle, ChevronDown, ChevronUp, Download, RefreshCw, Trash2 } from 'lucide-react';

export const ErrorLogViewer: React.FC = () => {
  const [errors, setErrors] = useState<any[]>([]);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  const loadErrors = () => {
    const storedErrors = errorMonitoring.getStoredErrors();
    setErrors(storedErrors.reverse()); // Show newest first
  };

  useEffect(() => {
    loadErrors();
  }, []);

  const clearErrors = () => {
    if (window.confirm('Are you sure you want to clear all error logs?')) {
      errorMonitoring.clearStoredErrors();
      setErrors([]);
    }
  };

  const toggleError = (index: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedErrors(newExpanded);
  };

  const downloadErrors = () => {
    const dataStr = JSON.stringify(errors, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const exportFileDefaultName = `tankmon-errors-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (errors.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Errors Logged</h3>
        <p className="text-gray-500">When errors occur, they will appear here.</p>
        <button
          onClick={loadErrors}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            Error Log ({errors.length} {errors.length === 1 ? 'error' : 'errors'})
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadErrors}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={downloadErrors}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={clearErrors}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error List */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {errors.map((error, index) => {
          const isExpanded = expandedErrors.has(index);

          return (
            <div key={index} className="p-4 hover:bg-gray-50">
              {/* Error Summary */}
              <div
                className="cursor-pointer"
                onClick={() => toggleError(index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSeverityColor(error.severity)}`}>
                        {error.severity || 'medium'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(error.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-medium text-sm text-gray-900">
                      {error.message}
                    </p>
                    {error.context?.componentName && (
                      <p className="text-xs text-gray-600 mt-1">
                        Component: {error.context.componentName}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {isExpanded && (
                <div className="mt-4 space-y-3">
                  {/* Stack Trace */}
                  {error.stack && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">Stack Trace:</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {/* Component Stack */}
                  {error.componentStack && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">Component Stack:</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {error.componentStack}
                      </pre>
                    </div>
                  )}

                  {/* Context */}
                  {error.context && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">Context:</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(error.context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
