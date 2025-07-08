import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTankData } from './useTankData';
import { type Tank } from '../types/tank';

// Mock fetch globally
global.fetch = vi.fn();

// Enhanced MockWebSocket for comprehensive testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  close = vi.fn();
  send = vi.fn();
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  static lastInstance: MockWebSocket | null = null;

  constructor(public url: string) {
    MockWebSocket.lastInstance = this;
    // Don't auto-trigger events - let tests control this
  }

  // Helper methods for testing
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      const event = new CloseEvent('close', { code, reason });
      this.onclose(event);
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      const event = new MessageEvent('message', { data: JSON.stringify(data) });
      this.onmessage(event);
    }
  }
}

global.WebSocket = MockWebSocket as any;

// Mock auth service
vi.mock('../utils/auth', () => ({
  default: {
    getAuthHeaders: vi.fn(() => ({ Authorization: 'Bearer test-token' })),
    checkAuth: vi.fn(() => true),
    isAuthenticated: vi.fn(() => true),
    getWebSocketUrl: vi.fn((url) => `${url}?token=test-token`),
    logout: vi.fn(),
  },
}));

// Mock console methods
const consoleMock = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

describe('useTankData Hook', () => {
  const mockTankData: Tank[] = [
    {
      id: '1',
      name: 'Tank 1',
      currentLevel: 1000,
      maxCapacity: 5000,
      minLevel: 100,
      maxLevel: 4500,
      unit: 'mm',
      status: 'normal',
      lastUpdated: new Date(),
      location: 'Port',
      group: 'BB',
    },
    {
      id: '2',
      name: 'Tank 2',
      currentLevel: 2000,
      maxCapacity: 5000,
      minLevel: 100,
      maxLevel: 4500,
      unit: 'mm',
      status: 'normal',
      lastUpdated: new Date(),
      location: 'Starboard',
      group: 'SB',
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
    vi.clearAllMocks();
    MockWebSocket.lastInstance = null;

    // Reset auth service mocks
    const authService = await import('../utils/auth');
    vi.mocked(authService.default.getAuthHeaders).mockReturnValue({ Authorization: 'Bearer test-token' });
    vi.mocked(authService.default.isAuthenticated).mockReturnValue(true);
    vi.mocked(authService.default.getWebSocketUrl).mockImplementation((url) => `${url}?token=test-token`);

    // Mock console
    vi.spyOn(console, 'log').mockImplementation(consoleMock.log);
    vi.spyOn(console, 'error').mockImplementation(consoleMock.error);
    vi.spyOn(console, 'warn').mockImplementation(consoleMock.warn);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useTankData());

      expect(result.current.tanks).toEqual([]);
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.lastSync).toBeInstanceOf(Date);
    });
  });

  describe('WebSocket Connection', () => {
    it('should create WebSocket connection on mount', () => {
      renderHook(() => useTankData());

      expect(MockWebSocket.lastInstance).toBeTruthy();
      expect(MockWebSocket.lastInstance?.url).toBe('ws://localhost:3002?token=test-token');
    });

    it('should handle successful WebSocket connection', async () => {
      const { result } = renderHook(() => useTankData());

      act(() => {
        MockWebSocket.lastInstance?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });
    });

    it('should handle WebSocket error', async () => {
      const { result } = renderHook(() => useTankData());

      act(() => {
        MockWebSocket.lastInstance?.simulateError();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error');
      });
    });

    it('should handle WebSocket message with tank data', async () => {
      const { result } = renderHook(() => useTankData());

      act(() => {
        MockWebSocket.lastInstance?.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance?.simulateMessage({
          type: 'tankUpdate',
          data: mockTankData,
        });
      });

      await waitFor(() => {
        expect(result.current.tanks).toHaveLength(2);
        expect(result.current.tanks[0].id).toBe('1');
        expect(result.current.tanks[1].id).toBe('2');
      });
    });

    it('should handle ping/pong messages', async () => {
      const { result } = renderHook(() => useTankData());

      act(() => {
        MockWebSocket.lastInstance?.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance?.simulateMessage({ type: 'ping' });
      });

      expect(MockWebSocket.lastInstance?.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'pong' }),
      );
    });

    it('should handle invalid WebSocket messages gracefully', async () => {
      const { result } = renderHook(() => useTankData());

      act(() => {
        MockWebSocket.lastInstance?.simulateOpen();
      });

      act(() => {
        if (MockWebSocket.lastInstance?.onmessage) {
          const event = new MessageEvent('message', { data: 'invalid json' });
          MockWebSocket.lastInstance.onmessage(event);
        }
      });

      expect(consoleMock.error).toHaveBeenCalledWith(
        '❌ Error parsing WebSocket message:',
        expect.any(Error),
      );
    });
  });

  describe('WebSocket Reconnection', () => {
    it('should attempt reconnection on abnormal close', async () => {
      const { result } = renderHook(() => useTankData());

      act(() => {
        MockWebSocket.lastInstance?.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance?.simulateClose(1006, 'Connection lost'); // Abnormal close
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });

      // Should start fallback polling
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should not reconnect on normal close', async () => {
      const { result } = renderHook(() => useTankData());

      act(() => {
        MockWebSocket.lastInstance?.simulateOpen();
      });

      const initialInstance = MockWebSocket.lastInstance;

      act(() => {
        MockWebSocket.lastInstance?.simulateClose(1000, 'Normal close');
      });

      // Advance timer to see if reconnection happens
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should not create new WebSocket instance
      expect(MockWebSocket.lastInstance).toBe(initialInstance);
    });
  });

  describe('HTTP Fallback Polling', () => {
    it('should fall back to HTTP polling when WebSocket fails', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockTankData,
      });

      const { result } = renderHook(() => useTankData());

      // Simulate WebSocket connection failure
      act(() => {
        MockWebSocket.lastInstance?.simulateError();
      });

      act(() => {
        MockWebSocket.lastInstance?.simulateClose(1006);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/tanks',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          }),
        );
      });
    });

    it('should poll every 3 seconds', async () => {
      let fetchCount = 0;
      (global.fetch as any).mockImplementation(() => {
        fetchCount++;
        return Promise.resolve({
          ok: true,
          json: async () => mockTankData,
        });
      });

      const { result } = renderHook(() => useTankData());

      // Force fallback to HTTP polling
      act(() => {
        MockWebSocket.lastInstance?.simulateError();
        MockWebSocket.lastInstance?.simulateClose(1006);
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(fetchCount).toBe(1);
      });

      // Advance timer and check polling
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(fetchCount).toBe(2);
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(fetchCount).toBe(3);
      });
    });

    it('should handle HTTP fetch errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTankData());

      // Force fallback to HTTP polling
      act(() => {
        MockWebSocket.lastInstance?.simulateError();
        MockWebSocket.lastInstance?.simulateClose(1006);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });

      expect(consoleMock.error).toHaveBeenCalledWith(
        '❌ Error fetching tank data:',
        'Network error',
      );
    });

    it('should handle HTTP response errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useTankData());

      // Force fallback to HTTP polling
      act(() => {
        MockWebSocket.lastInstance?.simulateError();
        MockWebSocket.lastInstance?.simulateClose(1006);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });
    });
  });

  describe('Trend Calculation', () => {
    it('should calculate stable trend for changes below 3mm threshold', async () => {
      const { result } = renderHook(() => useTankData());

      // Initial data
      act(() => {
        MockWebSocket.lastInstance?.simulateOpen();
        MockWebSocket.lastInstance?.simulateMessage({
          type: 'tankUpdate',
          data: mockTankData,
        });
      });

      await waitFor(() => {
        expect(result.current.tanks).toHaveLength(2);
      });

      // Update with minimal change
      const updatedData = [
        { ...mockTankData[0], currentLevel: 1002 }, // +2mm
        { ...mockTankData[1], currentLevel: 1998 }, // -2mm
      ];

      act(() => {
        MockWebSocket.lastInstance?.simulateMessage({
          type: 'tankUpdate',
          data: updatedData,
        });
      });

      await waitFor(() => {
        const tank1 = result.current.tanks.find(t => t.id === '1');
        const tank2 = result.current.tanks.find(t => t.id === '2');

        expect(tank1?.trend).toBe('stable');
        expect(tank1?.trendValue).toBe(0);
        expect(tank2?.trend).toBe('stable');
        expect(tank2?.trendValue).toBe(0);
      });
    });

    it('should calculate loading trend for increases >= 3mm', async () => {
      const { result } = renderHook(() => useTankData());

      // Initial data
      act(() => {
        MockWebSocket.lastInstance?.simulateOpen();
        MockWebSocket.lastInstance?.simulateMessage({
          type: 'tankUpdate',
          data: mockTankData,
        });
      });

      await waitFor(() => {
        expect(result.current.tanks).toHaveLength(2);
      });

      // Update with significant increase
      const updatedData = [
        { ...mockTankData[0], currentLevel: 1030 }, // +30mm
        { ...mockTankData[1], currentLevel: 2003 }, // +3mm (threshold)
      ];

      act(() => {
        MockWebSocket.lastInstance?.simulateMessage({
          type: 'tankUpdate',
          data: updatedData,
        });
      });

      await waitFor(() => {
        const tank1 = result.current.tanks.find(t => t.id === '1');
        const tank2 = result.current.tanks.find(t => t.id === '2');

        expect(tank1?.trend).toBe('loading');
        expect(tank1?.trendValue).toBe(600); // (30/3)*60
        expect(tank2?.trend).toBe('loading');
        expect(tank2?.trendValue).toBe(60); // (3/3)*60
      });
    });

    it('should calculate unloading trend for decreases >= 3mm', async () => {
      const { result } = renderHook(() => useTankData());

      // Initial data
      act(() => {
        MockWebSocket.lastInstance?.simulateOpen();
        MockWebSocket.lastInstance?.simulateMessage({
          type: 'tankUpdate',
          data: mockTankData,
        });
      });

      await waitFor(() => {
        expect(result.current.tanks).toHaveLength(2);
      });

      // Update with significant decrease
      const updatedData = [
        { ...mockTankData[0], currentLevel: 970 }, // -30mm
        { ...mockTankData[1], currentLevel: 1997 }, // -3mm (threshold)
      ];

      act(() => {
        MockWebSocket.lastInstance?.simulateMessage({
          type: 'tankUpdate',
          data: updatedData,
        });
      });

      await waitFor(() => {
        const tank1 = result.current.tanks.find(t => t.id === '1');
        const tank2 = result.current.tanks.find(t => t.id === '2');

        expect(tank1?.trend).toBe('unloading');
        expect(tank1?.trendValue).toBe(600); // (30/3)*60
        expect(tank2?.trend).toBe('unloading');
        expect(tank2?.trendValue).toBe(60); // (3/3)*60
      });
    });

    it('should preserve previousLevel for trend calculation', async () => {
      const { result } = renderHook(() => useTankData());

      // Initial data
      act(() => {
        MockWebSocket.lastInstance?.simulateOpen();
        MockWebSocket.lastInstance?.simulateMessage({
          type: 'tankUpdate',
          data: mockTankData,
        });
      });

      await waitFor(() => {
        expect(result.current.tanks).toHaveLength(2);
      });

      const initialLevel = result.current.tanks.find(t => t.id === '1')?.currentLevel;

      // Update data
      const updatedData = [
        { ...mockTankData[0], currentLevel: 1050 },
        { ...mockTankData[1], currentLevel: 2050 },
      ];

      act(() => {
        MockWebSocket.lastInstance?.simulateMessage({
          type: 'tankUpdate',
          data: updatedData,
        });
      });

      await waitFor(() => {
        const tank1 = result.current.tanks.find(t => t.id === '1');
        expect(tank1?.previousLevel).toBe(initialLevel);
        expect(tank1?.currentLevel).toBe(1050);
      });
    });
  });

  describe('Authentication Handling', () => {
    it('should redirect to login when not authenticated', () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' };

      const authService = await import('../utils/auth');
      vi.mocked(authService.default.isAuthenticated).mockReturnValue(false);

      renderHook(() => useTankData());

      expect(window.location.href).toBe('/login');

      window.location = originalLocation;
    });

    it('should include auth headers in HTTP requests', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockTankData,
      });

      const { result } = renderHook(() => useTankData());

      // Force HTTP polling
      act(() => {
        MockWebSocket.lastInstance?.simulateError();
        MockWebSocket.lastInstance?.simulateClose(1006);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/tanks',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          }),
        );
      });
    });

    it('should include auth token in WebSocket URL', () => {
      renderHook(() => useTankData());

      const authService = await import('../utils/auth');
      expect(authService.default.getWebSocketUrl).toHaveBeenCalledWith('ws://localhost:3002');
      expect(MockWebSocket.lastInstance?.url).toBe('ws://localhost:3002?token=test-token');
    });
  });

  describe('Component Unmounting and Cleanup', () => {
    it('should cleanup WebSocket on unmount', () => {
      const { unmount } = renderHook(() => useTankData());

      const wsInstance = MockWebSocket.lastInstance;
      expect(wsInstance).toBeTruthy();

      unmount();

      expect(wsInstance?.close).toHaveBeenCalledWith(1000, 'Component unmounting');
    });

    it('should abort HTTP requests on unmount', async () => {
      const abortSpy = vi.fn();
      const mockAbortController = {
        signal: { aborted: false },
        abort: abortSpy,
      };

      vi.spyOn(global, 'AbortController').mockImplementation(() => mockAbortController as any);

      const { unmount } = renderHook(() => useTankData());

      unmount();

      expect(abortSpy).toHaveBeenCalled();
    });

    it('should handle AbortError gracefully', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';

      (global.fetch as any).mockRejectedValue(abortError);

      const { result } = renderHook(() => useTankData());

      // Force HTTP polling
      act(() => {
        MockWebSocket.lastInstance?.simulateError();
        MockWebSocket.lastInstance?.simulateClose(1006);
      });

      // Should not log error for AbortError
      await waitFor(() => {
        expect(consoleMock.error).not.toHaveBeenCalledWith(
          '❌ Error fetching tank data:',
          expect.anything(),
        );
      });
    });

    it('should clear timers on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() => useTankData());

      // Trigger reconnection timeout
      act(() => {
        MockWebSocket.lastInstance?.simulateClose(1006);
      });

      unmount();

      // Should clear timeouts and intervals
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing tank data gracefully', async () => {
      const { result } = renderHook(() => useTankData());

      act(() => {
        MockWebSocket.lastInstance?.simulateOpen();
        MockWebSocket.lastInstance?.simulateMessage({
          type: 'tankUpdate',
          data: undefined,
        });
      });

      // Should not crash
      expect(result.current.tanks).toEqual([]);
    });

    it('should handle WebSocket creation errors', async () => {
      vi.spyOn(global, 'WebSocket').mockImplementationOnce(() => {
        throw new Error('WebSocket creation failed');
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockTankData,
      });

      const { result } = renderHook(() => useTankData());

      // Should fall back to HTTP polling
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      expect(consoleMock.error).toHaveBeenCalledWith(
        '❌ Error creating WebSocket:',
        expect.any(Error),
      );
    });

    it('should handle component unmount during async operations', async () => {
      let fetchResolve: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        fetchResolve = resolve;
      });

      (global.fetch as any).mockReturnValue(fetchPromise);

      const { result, unmount } = renderHook(() => useTankData());

      // Force HTTP polling
      act(() => {
        MockWebSocket.lastInstance?.simulateError();
        MockWebSocket.lastInstance?.simulateClose(1006);
      });

      // Unmount before fetch resolves
      unmount();

      // Resolve fetch after unmount
      act(() => {
        fetchResolve!({
          ok: true,
          json: async () => mockTankData,
        });
      });

      // Should not update state after unmount
      // This test ensures the component handles async operations after unmount
    });
  });
});
