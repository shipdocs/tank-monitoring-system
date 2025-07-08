import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface TankErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
  tankId?: string;
  tankName?: string;
}

const TankErrorFallback: React.FC<TankErrorFallbackProps> = ({
  error,
  resetError,
  tankId,
  tankName,
}) => (
  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 h-full flex flex-col items-center justify-center text-center">
    <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
    <h3 className="text-sm font-semibold text-red-800 mb-1">
        Tank Display Error
    </h3>
    <p className="text-xs text-red-600 mb-3">
      {tankName ? `Tank "${tankName}"` : tankId ? `Tank #${tankId}` : 'This tank'} cannot be displayed
    </p>
    <button
      onClick={resetError}
      className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
    >
      <RefreshCw className="w-3 h-3" />
      <span>Retry</span>
    </button>
  </div>
);

interface TankErrorBoundaryProps {
  children: React.ReactNode;
  tankId?: string;
  tankName?: string;
}

export const TankErrorBoundary: React.FC<TankErrorBoundaryProps> = ({
  children,
  tankId,
  tankName,
}) => (
  <ErrorBoundary
    fallbackComponent={(props) => (
      <TankErrorFallback {...props} tankId={tankId} tankName={tankName} />
    )}
    isolate={true}
    componentName={`Tank-${tankId || 'Unknown'}`}
    onError={(error, errorInfo) => {
      console.error(`Error in tank component ${tankId || 'Unknown'}:`, error);
    }}
  >
    {children}
  </ErrorBoundary>
);
