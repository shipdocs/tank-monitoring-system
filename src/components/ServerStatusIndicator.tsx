import React from 'react';
import { useServerStatus } from '../hooks/useServerStatus';
import { Server, Wifi, WifiOff, FileText, Cable, Database, Eye, RefreshCw } from 'lucide-react';

export const ServerStatusIndicator: React.FC = () => {
  const { status, config, isLoading, error, refresh } = useServerStatus();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        <span className="text-sm">Checking server...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm">Server offline</span>
        <button
          onClick={refresh}
          className="p-1 hover:bg-red-100 rounded transition-colors"
          title="Retry connection"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    );
  }

  if (!status || !config) {
    return null;
  }

  const getDataSourceIcon = () => {
    switch (config.dataFormat) {
      case 'csvfile':
        return config.csvFile.isVerticalFormat ? <FileText className="w-4 h-4" /> : <FileText className="w-4 h-4" />;
      case 'json':
        return <Database className="w-4 h-4" />;
      case 'csv':
      default:
        return status.selectedPort ? <Cable className="w-4 h-4" /> : <Eye className="w-4 h-4" />;
    }
  };

  const getDataSourceLabel = () => {
    if (config.dataFormat === 'csvfile') {
      const fileName = config.csvFile.filePath.split('/').pop() || config.csvFile.filePath;
      const formatType = config.csvFile.isVerticalFormat ? 'Vertical' : 'CSV';
      return `${formatType}: ${fileName}`;
    } else if (config.dataFormat === 'json') {
      const fileName = config.csvFile.filePath.split('/').pop() || config.csvFile.filePath;
      return `JSON: ${fileName}`;
    } else if (status.selectedPort) {
      return `Serial: ${status.selectedPort}`;
    } else {
      return 'No Data Source';
    }
  };

  const getStatusColor = () => {
    if (status.connected) {
      return 'text-green-600';
    } else {
      return 'text-yellow-600';
    }
  };

  return (
    <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
      <div className="flex items-center space-x-2">
        <Server className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Server</span>
      </div>
      
      <div className="w-px h-4 bg-gray-300"></div>
      
      <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
        {status.connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        <span className="text-sm font-medium">
          {status.connected ? 'Connected' : 'Configured'}
        </span>
      </div>
      
      <div className="w-px h-4 bg-gray-300"></div>
      
      <div className="flex items-center space-x-2 text-gray-600">
        {getDataSourceIcon()}
        <span className="text-sm" title={getDataSourceLabel()}>
          {getDataSourceLabel().length > 25 
            ? getDataSourceLabel().substring(0, 25) + '...' 
            : getDataSourceLabel()
          }
        </span>
      </div>

      {config.csvFile.isVerticalFormat && (
        <>
          <div className="w-px h-4 bg-gray-300"></div>
          <div className="flex items-center space-x-1 text-blue-600">
            <span className="text-xs bg-blue-100 px-2 py-1 rounded">
              {config.csvFile.linesPerRecord || 4} lines/record
            </span>
          </div>
        </>
      )}
      
      <button
        onClick={refresh}
        className="p-1 hover:bg-gray-100 rounded transition-colors"
        title="Refresh status"
      >
        <RefreshCw className="w-3 h-3 text-gray-400" />
      </button>
    </div>
  );
};
