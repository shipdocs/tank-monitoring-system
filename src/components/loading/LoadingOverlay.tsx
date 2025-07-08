import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  transparent?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  transparent = false,
  size = 'lg',
  className = '',
}) => {
  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        transparent ? 'bg-black bg-opacity-30' : 'bg-white bg-opacity-90'
      } ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={message}
    >
      <div className="flex flex-col items-center space-y-4 p-8 bg-white rounded-lg shadow-lg">
        <LoadingSpinner size={size} />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
};
