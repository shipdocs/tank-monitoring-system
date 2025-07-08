import { useEffect, useState } from 'react';
import { getServerConfig, getServerStatus } from '../utils/serverConfig';

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Create AbortController for cleanup
    const abortController = new AbortController();
    let intervalId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const [statusData, configData] = await Promise.all([
          getServerStatus(abortController.signal),
          getServerConfig(abortController.signal),
        ]);

        // Only update state if component is still mounted
        if (isMounted && !abortController.signal.aborted) {
          if (statusData) {
            setStatus(statusData);
          }

          if (configData) {
            setConfig(configData);
          }

          setError(null);
        }
      } catch (err) {
        // Only update error state if component is still mounted
        if (isMounted && !abortController.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch server status');
        }
      } finally {
        // Only update loading state if component is still mounted
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll server status every 10 seconds
    intervalId = setInterval(() => {
      if (!abortController.signal.aborted) {
        fetchStatus();
      }
    }, 10000);

    // Cleanup function
    return () => {
      isMounted = false;
      abortController.abort();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refreshTrigger]);

  const refresh = () => {
    setIsLoading(true);
    setError(null);
    // Trigger a new effect run which will abort the old one and start fresh
    setRefreshTrigger(prev => prev + 1);
  };

  return {
    status,
    config,
    isLoading,
    error,
    refresh,
  };
};
