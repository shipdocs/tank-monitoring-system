import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { ErrorSeverity, errorMonitoring } from '../services/errorMonitoring';

interface Props {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<ErrorBoundaryState & { resetError: () => void }>;
  onError?: (error: Error, _errorInfo: ErrorInfo) => void;
  isolate?: boolean;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  showDetails: boolean;
}


export class ErrorBoundary extends Component<Props, ErrorBoundaryState> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, componentName } = this.props;
    const { errorCount } = this.state;

    // Update error count
    this.setState({
      errorInfo,
      errorCount: errorCount + 1,
    });

    // Log error with context
    const context = {
      componentName: componentName || 'Unknown',
      errorCount: errorCount + 1,
      timestamp: new Date().toISOString(),
      isolate: this.props.isolate || false,
    };

    // Report to error monitoring service
    const severity = this.props.isolate ? ErrorSeverity.MEDIUM : ErrorSeverity.HIGH;
    errorMonitoring.reportError(error, errorInfo, context, severity);

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Prevent error loops - if too many errors, stop catching
    if (errorCount > 5) {
      console.error('Too many errors in ErrorBoundary, stopping error catching to prevent loops');
      throw error;
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      // Don't reset errorCount to track total errors in session
    });
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  render() {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { children, fallbackComponent: FallbackComponent, isolate, componentName } = this.props;

    if (hasError && error) {
      // Use custom fallback component if provided
      if (FallbackComponent) {
        return <FallbackComponent {...this.state} resetError={this.resetError} />;
      }

      // Default error UI
      return (
        <div className={`${isolate ? '' : 'min-h-screen'} flex items-center justify-center p-4`}>
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-lg shadow-xl p-6 md:p-8">
              {/* Error Header */}
              <div className="flex items-start space-x-4 mb-6">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {isolate ? `Error in ${componentName || 'Component'}` : 'Something went wrong'}
                  </h1>
                  <p className="text-gray-600">
                    {isolate
                      ? 'This component encountered an error and cannot be displayed.'
                      : 'An unexpected error occurred in the application. The error has been logged and our team has been notified.'}
                  </p>
                </div>
              </div>

              {/* Error Details Toggle */}
              <div className="mb-6">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{showDetails ? 'Hide' : 'Show'} technical details</span>
                </button>
              </div>

              {/* Technical Details */}
              {showDetails && (
                <div className="mb-6 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Error Message</h3>
                    <pre className="text-xs text-red-600 overflow-x-auto whitespace-pre-wrap">
                      {error.message}
                    </pre>
                  </div>

                  {error.stack && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Stack Trace</h3>
                      <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {errorInfo?.componentStack && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Component Stack</h3>
                      <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.resetError}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>

                {!isolate && (
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Reload Page
                  </button>
                )}
              </div>

              {/* Error Count Warning */}
              {this.state.errorCount > 2 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This error has occurred {this.state.errorCount} times.
                    If the problem persists, please contact support.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for easier wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Custom hook for error reporting
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    const context = {
      componentName: 'Manual Error Report',
      source: 'useErrorHandler',
    };

    errorMonitoring.reportError(
      error,
      errorInfo || { componentStack: '' },
      context,
      ErrorSeverity.MEDIUM,
    );
  };
}
