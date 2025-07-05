import { useState, useEffect } from 'react';
import { getServerStatus, getServerConfig } from '../utils/serverConfig';

interface ServerStatus {
  connected: boolean;
  selectedPort?: string;
  csvFileEnabled: boolean;
  csvFilePath?: string;
  dataSource: string;
  lastSync: Date;
}

interface ServerConfig {
  dataFormat: string;
  csvFile: {
    enabled: boolean;
    filePath: string;
    importInterval: number;
    hasHeaders: boolean;
    delimiter: string;
    isVerticalFormat?: boolean;
    linesPerRecord?: number;
    lineMapping?: Record<number, string>;
  };
}

export const useServerStatus = () => {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const [statusData, configData] = await Promise.all([
        getServerStatus(),
        getServerConfig()
      ]);

      if (statusData) {
        setStatus(statusData);
      }
      
      if (configData) {
        setConfig(configData);
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch server status');
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = () => {
    setIsLoading(true);
    fetchStatus();
  };

  useEffect(() => {
    fetchStatus();
    
    // Poll server status every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    status,
    config,
    isLoading,
    error,
    refresh
  };
};
