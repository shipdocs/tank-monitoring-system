import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'error';
  lastSync: Date;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, lastSync }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="w-5 h-5 text-gray-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'disconnected':
        return 'text-gray-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="flex items-center space-x-3 bg-white rounded-lg shadow-sm p-3">
      {getStatusIcon()}
      <div>
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>
    </div>
  );
};