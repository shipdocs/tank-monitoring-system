import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface AppErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
}

const AppErrorFallback: React.FC<AppErrorFallbackProps> = ({ error, resetError }) => (
  <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
    <div className="max-w-2xl w-full">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
        {/* Error Icon and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Application Error
          </h1>
          <p className="text-lg text-gray-600">
              Tank Monitoring System encountered a critical error
          </p>
        </div>

        {/* Error Message */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-red-800 font-mono">
            {error?.message || 'An unexpected error occurred'}
          </p>
        </div>

        {/* Recovery Options */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
              What you can do:
          </h2>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-gray-700">
                  <strong>Try recovering:</strong> Click the button below to attempt recovery
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-gray-700">
                  <strong>Clear browser data:</strong> If the error persists, try clearing your browser's local storage
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-gray-700">
                  <strong>Contact support:</strong> If nothing works, please contact your system administrator
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            onClick={resetError}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Attempt Recovery</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('This will clear all local data and reload the page. Continue?')) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }
            }}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            <span>Reset Application</span>
          </button>
        </div>

        {/* Debug Info */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">Debug Information</summary>
            <div className="mt-2 space-y-1">
              <p>Time: {new Date().toLocaleString()}</p>
              <p>User Agent: {navigator.userAgent}</p>
              <p>Page: {window.location.pathname}</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  </div>
);

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

export const AppErrorBoundary: React.FC<AppErrorBoundaryProps> = ({ children }) => (
  <ErrorBoundary
    fallbackComponent={AppErrorFallback}
    onError={(error, errorInfo) => {
      // Additional app-level error handling
      console.error('App-level error:', error);

      // You can add app-specific error handling here
      // For example: clear corrupted state, reset user session, etc.
    }}
    componentName="TankMonitoringApp"
  >
    {children}
  </ErrorBoundary>
);
