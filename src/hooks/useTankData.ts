import { useEffect, useRef, useState } from 'react';
import { type Tank, type TankData } from '../types/tank';
import authService from '../utils/auth';

// WebSocket configuration
const WS_URL = 'ws://localhost:3002';
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const RECONNECT_MULTIPLIER = 1.5;

// Helper function to calculate trend
const calculateTrend = (currentLevel: number, previousLevel: number): { trend: Tank['trend'], trendValue: number } => {
  const difference = currentLevel - previousLevel;
  const threshold = 3.0; // Minimum change to consider as trend (3mm to account for ship movement)

  if (Math.abs(difference) < threshold) {
    return { trend: 'stable', trendValue: 0 };
  }

  // Convert to rate per minute (assuming 3-second updates)
  const ratePerMinute = (difference / 3) * 60;

  return {
    trend: difference > 0 ? 'loading' : 'unloading',
    trendValue: Math.abs(ratePerMinute),
  };
};

export const useTankData = () => {
  const [tankData, setTankData] = useState<TankData>({
    tanks: [],
    lastSync: new Date(),
    connectionStatus: 'connecting',
    isLoading: true,
    loadingMessage: 'Initializing connection...',
  });

  // WebSocket refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    let fallbackInterval: NodeJS.Timeout | null = null;
    const abortController = new AbortController();

    // Process incoming tank data
    const processTankData = (data: Tank[]) => {
      // Only process if component is still mounted
      if (isUnmountedRef.current || abortController.signal.aborted) return;

      console.log('✅ Received tank data:', data.length, 'tanks');

      setTankData(prev => {
        // Calculate trends by comparing with previous data
        const tanksWithTrends = data.map((newTank: Tank) => {
          const prevTank = prev.tanks.find(t => t.id === newTank.id);
          const previousLevel = prevTank?.currentLevel || newTank.currentLevel;
          const { trend, trendValue } = calculateTrend(newTank.currentLevel, previousLevel);

          return {
            ...newTank,
            trend,
            trendValue,
            previousLevel,
          };
        });

        return {
          tanks: tanksWithTrends,
          lastSync: new Date(),
          connectionStatus: 'connected',
        };
      });
    };

    // Fallback HTTP polling function with abort support
    const fetchTankData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/tanks', {
          signal: abortController.signal,
          headers: {
            ...authService.getAuthHeaders(),
          },
        });
        if (response.ok) {
          const data = await response.json();
          processTankData(data);
        } else {
          throw new Error('Failed to fetch tank data from server');
        }
      } catch (error) {
        // Check if error is due to abort
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was aborted, this is expected during cleanup
          return;
        }

        // Only update state if component is still mounted
        if (!isUnmountedRef.current && !abortController.signal.aborted) {
          console.error('❌ Error fetching tank data:', error instanceof Error ? error.message : 'Unknown error');
          setTankData(prev => ({
            ...prev,
            connectionStatus: 'disconnected',
          }));
        }
      }
    };

    // WebSocket connection management
    const connectWebSocket = () => {
      if (isUnmountedRef.current) return;

      try {
        // Check authentication before connecting
        if (!authService.isAuthenticated()) {
          console.error('❌ Not authenticated, redirecting to login');
          window.location.href = '/login';
          return;
        }

        const wsUrl = authService.getWebSocketUrl(WS_URL);
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        setTankData(prev => ({
          ...prev,
          connectionStatus: 'connecting',
          isLoading: true,
          loadingMessage: 'Establishing WebSocket connection...',
        }));

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
          setTankData(prev => ({
            ...prev,
            connectionStatus: 'connected',
            isLoading: false,
            loadingMessage: undefined,
          }));

          // Stop fallback polling if running
          if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            // Handle different message types
            if (message.type === 'tankUpdate' && message.data) {
              processTankData(message.data);
            } else if (message.type === 'ping') {
              // Respond to ping if needed
              ws.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setTankData(prev => ({
            ...prev,
            connectionStatus: 'error',
            isLoading: false,
            loadingMessage: 'WebSocket connection error',
          }));
        };

        ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          wsRef.current = null;

          setTankData(prev => ({
            ...prev,
            connectionStatus: 'disconnected',
          }));

          // Start fallback polling
          if (!fallbackInterval && !isUnmountedRef.current) {
            console.log('📡 Starting fallback HTTP polling');
            fallbackInterval = setInterval(fetchTankData, 3000);
            fetchTankData(); // Initial fetch
          }

          // Reconnect with exponential backoff
          if (!isUnmountedRef.current && event.code !== 1000) { // 1000 = normal closure
            const delay = reconnectDelayRef.current;
            console.log(`⏱️ Reconnecting in ${delay}ms...`);

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectDelayRef.current = Math.min(
                delay * RECONNECT_MULTIPLIER,
                MAX_RECONNECT_DELAY,
              );
              connectWebSocket();
            }, delay);
          }
        };
      } catch (error) {
        console.error('❌ Error creating WebSocket:', error);

        // Fall back to HTTP polling
        if (!fallbackInterval && !isUnmountedRef.current) {
          console.log('📡 Starting fallback HTTP polling');
          fallbackInterval = setInterval(fetchTankData, 3000);
          fetchTankData();
        }
      }
    };

    // Initialize connection
    connectWebSocket();

    return () => {
      isUnmountedRef.current = true;

      // Abort any pending HTTP requests
      abortController.abort();

      // Clean up WebSocket
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Clear fallback interval
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, []); // Empty dependency array - run once on mount

  return tankData;
};
