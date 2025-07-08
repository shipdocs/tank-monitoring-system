import React, { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { useErrorHandler } from './ErrorBoundary';
import { AlertCircle, AlertTriangle, Bug, Zap } from 'lucide-react';

// Component that throws an error
const BuggyComponent: React.FC<{ shouldError: boolean }> = ({ shouldError }) => {
  if (shouldError) {
    throw new Error('This is a test error from BuggyComponent!');
  }

  return (
    <div className="p-4 bg-green-100 rounded-lg">
      <p className="text-green-800">Component is working fine!</p>
    </div>
  );
};

// Component that throws async error
const AsyncBuggyComponent: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const triggerAsyncError = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    throw new Error('Async operation failed!');
  };

  return (
    <div className="p-4 bg-blue-100 rounded-lg">
      <button
        onClick={triggerAsyncError}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Trigger Async Error'}
      </button>
    </div>
  );
};

export const ErrorBoundaryDemo: React.FC = () => {
  const [showError, setShowError] = useState(false);
  const [showMultipleErrors, setShowMultipleErrors] = useState(false);
  const reportError = useErrorHandler();

  const handleManualError = () => {
    const error = new Error('Manually reported error');
    reportError(error);
    alert('Error has been reported! Check console and localStorage.');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Bug className="w-6 h-6 mr-2" />
          Error Boundary Demo
        </h2>

        <div className="space-y-4">
          {/* Basic Error Demo */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
              Basic Error Boundary
            </h3>
            <p className="text-gray-600 mb-3">
              Click the button to trigger an error that will be caught by the error boundary.
            </p>

            <ErrorBoundary
              componentName="DemoComponent"
              isolate={true}
            >
              <BuggyComponent shouldError={showError} />
            </ErrorBoundary>

            <button
              onClick={() => setShowError(!showError)}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              {showError ? 'Fix Component' : 'Break Component'}
            </button>
          </div>

          {/* Multiple Isolated Errors */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-500" />
              Multiple Isolated Error Boundaries
            </h3>
            <p className="text-gray-600 mb-3">
              Each component has its own error boundary, so one failure doesn't affect others.
            </p>

            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((num) => (
                <ErrorBoundary
                  key={num}
                  componentName={`Component${num}`}
                  isolate={true}
                >
                  <BuggyComponent shouldError={showMultipleErrors && num === 2} />
                </ErrorBoundary>
              ))}
            </div>

            <button
              onClick={() => setShowMultipleErrors(!showMultipleErrors)}
              className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              {showMultipleErrors ? 'Fix Middle Component' : 'Break Middle Component'}
            </button>
          </div>

          {/* Async Error Demo */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-purple-500" />
              Async Error Handling
            </h3>
            <p className="text-gray-600 mb-3">
              Demonstrates handling of async errors (requires proper async error handling).
            </p>

            <ErrorBoundary
              componentName="AsyncComponent"
              isolate={true}
            >
              <AsyncBuggyComponent />
            </ErrorBoundary>
          </div>

          {/* Manual Error Reporting */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Manual Error Reporting</h3>
            <p className="text-gray-600 mb-3">
              Use the error reporting hook to manually report errors.
            </p>

            <button
              onClick={handleManualError}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Report Error Manually
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold mb-2">How to Use Error Boundaries in Your App:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Wrap your entire app with <code className="bg-gray-200 px-1 rounded">AppErrorBoundary</code></li>
          <li>Wrap critical sections with <code className="bg-gray-200 px-1 rounded">ErrorBoundary</code></li>
          <li>Use <code className="bg-gray-200 px-1 rounded">TankErrorBoundary</code> for individual tank components</li>
          <li>Set <code className="bg-gray-200 px-1 rounded">isolate={true}</code> to prevent error propagation</li>
          <li>Use <code className="bg-gray-200 px-1 rounded">useErrorHandler()</code> hook for manual error reporting</li>
        </ol>
      </div>
    </div>
  );
};
