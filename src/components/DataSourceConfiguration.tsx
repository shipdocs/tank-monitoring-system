import React, { useState, useEffect, useCallback } from 'react';
import { DataSourceConfigurationService, DataSourceConfiguration } from '../services/DataSourceConfigurationService';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const DataSourceConfiguration: React.FC = () => {
  const [config, setConfig] = useState<DataSourceConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [serverStatus, setServerStatus] = useState<{ connected: boolean; filePath?: string; recordCount?: number } | null>(null);

  const service = DataSourceConfigurationService.getInstance();

  const loadServerStatus = useCallback(async () => {
    try {
      const status = await service.getServerStatus();
      setServerStatus(status);
    } catch (error) {
      console.warn('Failed to load server status:', error);
    }
  }, [service]);

  useEffect(() => {
    // Load current configuration
    const currentConfig = service.getConfiguration();
    setConfig(currentConfig);

    // Load server status
    loadServerStatus();
  }, [service, loadServerStatus]);

  const handleInputChange = (field: keyof DataSourceConfiguration, value: string | number | boolean) => {
    if (!config) return;
    
    setConfig({
      ...config,
      [field]: value
    });
  };

  const handleTestConnection = async () => {
    if (!config) return;
    
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const result = await service.testConnection(config);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!config) return;
    
    setIsLoading(true);
    
    try {
      const validation = service.validateConfiguration(config);
      if (!validation.valid) {
        setTestResult({
          success: false,
          message: `Validation failed: ${validation.errors.join(', ')}`
        });
        return;
      }

      const result = await service.applyConfiguration(config);
      setTestResult(result);
      
      if (result.success) {
        // Reload server status
        await loadServerStatus();
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowseFile = () => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && config) {
        // For now, just set the file name
        // In a real implementation, you'd want to get the full path
        handleInputChange('filePath', `./${file.name}`);
      }
    };
    input.click();
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset to default configuration? This will overwrite your current settings.')) {
      const defaultConfig = service.resetToDefault();
      setConfig(defaultConfig);
      setTestResult(null);
    }
  };

  if (!config) {
    return <div className="p-4">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Server Status */}
      {serverStatus && (
        <div className={`p-4 rounded-lg border ${
          serverStatus.connected 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {serverStatus.connected ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={`font-medium ${
              serverStatus.connected ? 'text-green-800' : 'text-red-800'
            }`}>
              {serverStatus.connected ? 'Data Source Connected' : 'No Data Source Connected'}
            </span>
          </div>
          {serverStatus.connected && (
            <div className="mt-2 text-sm text-gray-600">
              <div>File: {serverStatus.filePath}</div>
              <div>Records: {serverStatus.recordCount || 0}</div>
            </div>
          )}
        </div>
      )}

      {/* Configuration Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data File Path
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={config.filePath}
              onChange={(e) => handleInputChange('filePath', e.target.value)}
              placeholder="e.g., ./ExportReady.txt"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <button
              onClick={handleBrowseFile}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              title="Browse for file"
            >
              Browse
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Path to your tank data file (vertical format, max 12 records)
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Format
            </label>
            <select 
              value={config.format}
              onChange={(e) => handleInputChange('format', e.target.value as 'vertical' | 'csv')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="vertical">Vertical (4 lines per tank)</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Records
            </label>
            <input
              type="number"
              value={config.maxRecords}
              onChange={(e) => handleInputChange('maxRecords', parseInt(e.target.value) || 12)}
              min="1"
              max="24"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Vertical Format Options */}
        {config.format === 'vertical' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lines per Record
              </label>
              <input
                type="number"
                value={config.linesPerRecord}
                onChange={(e) => handleInputChange('linesPerRecord', parseInt(e.target.value) || 4)}
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Update Interval (ms)
              </label>
              <input
                type="number"
                value={config.importInterval}
                onChange={(e) => handleInputChange('importInterval', parseInt(e.target.value) || 3000)}
                min="1000"
                max="30000"
                step="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        )}
        
        {/* Test Result */}
        {testResult && (
          <div className={`p-3 rounded-lg border ${
            testResult.success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              {testResult.success ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">{testResult.message}</span>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button 
            onClick={handleTestConnection}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span>Test Connection</span>
          </button>
          
          <button 
            onClick={handleSaveConfiguration}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            Save Configuration
          </button>
        </div>

        <button 
          onClick={handleResetToDefault}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
};
