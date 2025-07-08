import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTankConfiguration } from './useTankConfiguration';
import { type Tank } from '../types/tank';
import { type TankConfiguration } from '../utils/tankConfig';

// Mock the tankConfig utils
vi.mock('../utils/tankConfig', () => ({
  loadTankConfiguration: vi.fn(),
  saveTankConfiguration: vi.fn(),
  applyTankConfiguration: vi.fn(),
  updateTankName: vi.fn(),
  exportConfiguration: vi.fn(),
  importConfiguration: vi.fn(),
}));

// Mock console methods
const consoleMock = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

describe('useTankConfiguration Hook', () => {
  const mockTanks: Tank[] = [
    {
      id: '1',
      name: 'Tank A',
      currentLevel: 1000,
      maxCapacity: 5000,
      minLevel: 100,
      maxLevel: 4500,
      unit: 'mm',
      status: 'normal',
      lastUpdated: new Date(),
      location: 'Port Forward',
      group: 'BB',
      position: 0,
    },
    {
      id: '2',
      name: 'Tank B',
      currentLevel: 2000,
      maxCapacity: 5000,
      minLevel: 100,
      maxLevel: 4500,
      unit: 'mm',
      status: 'normal',
      lastUpdated: new Date(),
      location: 'Port Aft',
      group: 'BB',
      position: 1,
    },
    {
      id: '3',
      name: 'Tank C',
      currentLevel: 1500,
      maxCapacity: 5000,
      minLevel: 100,
      maxLevel: 4500,
      unit: 'mm',
      status: 'normal',
      lastUpdated: new Date(),
      location: 'Starboard Forward',
      group: 'SB',
      position: 2,
    },
  ];

  const mockConfiguration: TankConfiguration = {
    tanks: [
      { id: '1', customName: 'Forward Port', position: 0 },
      { id: '2', customName: 'Aft Port', position: 1 },
      { id: '3', customName: 'Forward Starboard', position: 2 },
    ],
    lastUpdated: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
    tankConfigUtils.loadTankConfiguration.mockReturnValue(mockConfiguration);
    tankConfigUtils.saveTankConfiguration.mockImplementation(() => {});
    tankConfigUtils.applyTankConfiguration.mockImplementation((tanks, config) =>
      // Simple mock implementation that applies custom names and positions
      tanks
        .map(tank => {
          const tankConfig = config.tanks.find(tc => tc.id === tank.id);
          return {
            ...tank,
            name: tankConfig?.customName || tank.name,
            position: tankConfig?.position ?? tank.position,
          };
        })
        .sort((a, b) => (a.position || 0) - (b.position || 0)),
    );
    tankConfigUtils.updateTankName.mockImplementation((config, tankId, newName) => ({
      ...config,
      tanks: config.tanks.map(tc =>
        tc.id === tankId ? { ...tc, customName: newName } : tc,
      ),
      lastUpdated: new Date().toISOString(),
    }));
    tankConfigUtils.exportConfiguration.mockImplementation(() => {});
    tankConfigUtils.importConfiguration.mockImplementation(async () => mockConfiguration);

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(consoleMock.log);
    vi.spyOn(console, 'error').mockImplementation(consoleMock.error);
    vi.spyOn(console, 'warn').mockImplementation(consoleMock.warn);

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with configured tanks when original tanks are provided', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuredTanks).toHaveLength(3);
        expect(result.current.configuration).toEqual(mockConfiguration);
      });

      const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
      expect(tankConfigUtils.loadTankConfiguration).toHaveBeenCalledWith(mockTanks);
      expect(tankConfigUtils.applyTankConfiguration).toHaveBeenCalledWith(mockTanks, mockConfiguration);
    });

    it('should handle empty tanks array', () => {
      const { result } = renderHook(() => useTankConfiguration([]));

      expect(result.current.configuredTanks).toEqual([]);
      expect(result.current.configuration).toBeNull();
    });

    it('should save configuration when it changes', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuration).toEqual(mockConfiguration);
      });

      const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
      expect(tankConfigUtils.saveTankConfiguration).toHaveBeenCalledWith(mockConfiguration);
    });
  });

  describe('Tank Reordering', () => {
    it('should reorder tanks correctly', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuration).toEqual(mockConfiguration);
      });

      act(() => {
        result.current.reorderTanks(0, 2); // Move first tank to third position
      });

      expect(result.current.configuration?.tanks).toEqual([
        { id: '2', customName: 'Aft Port', position: 0 },
        { id: '3', customName: 'Forward Starboard', position: 1 },
        { id: '1', customName: 'Forward Port', position: 2 },
      ]);
    });

    it('should handle invalid indices gracefully', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuration).toEqual(mockConfiguration);
      });

      const originalConfig = result.current.configuration;

      act(() => {
        result.current.reorderTanks(-1, 0); // Invalid old index
      });

      expect(result.current.configuration).toEqual(originalConfig);
      expect(consoleMock.error).toHaveBeenCalledWith(
        'Invalid indices!',
        expect.objectContaining({
          oldIndex: -1,
          newIndex: 0,
          totalTanks: 3,
        }),
      );
    });

    it('should handle out of bounds indices', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuration).toEqual(mockConfiguration);
      });

      const originalConfig = result.current.configuration;

      act(() => {
        result.current.reorderTanks(0, 5); // Out of bounds new index
      });

      expect(result.current.configuration).toEqual(originalConfig);
      expect(consoleMock.error).toHaveBeenCalledWith(
        'Invalid indices!',
        expect.objectContaining({
          oldIndex: 0,
          newIndex: 5,
          totalTanks: 3,
        }),
      );
    });

    it('should handle reordering to first position', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuration).toEqual(mockConfiguration);
      });

      act(() => {
        result.current.reorderTanks(2, 0); // Move last tank to first position
      });

      expect(consoleMock.log).toHaveBeenCalledWith('🚨 SPECIAL CASE: Moving to FIRST position');
      expect(result.current.configuration?.tanks[0]).toEqual(
        expect.objectContaining({ id: '3', position: 0 }),
      );
    });

    it('should preserve custom names during reordering', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuration).toEqual(mockConfiguration);
      });

      act(() => {
        result.current.reorderTanks(0, 1);
      });

      // Check that custom names are preserved
      const reorderedConfig = result.current.configuration;
      expect(reorderedConfig?.tanks.find(tc => tc.id === '1')?.customName).toBe('Forward Port');
      expect(reorderedConfig?.tanks.find(tc => tc.id === '2')?.customName).toBe('Aft Port');
      expect(reorderedConfig?.tanks.find(tc => tc.id === '3')?.customName).toBe('Forward Starboard');
    });

    it('should not reorder if configuration is null', async () => {
      const { result } = renderHook(() => useTankConfiguration([]));

      expect(result.current.configuration).toBeNull();

      act(() => {
        result.current.reorderTanks(0, 1);
      });

      expect(result.current.configuration).toBeNull();
    });
  });

  describe('Tank Renaming', () => {
    it('should rename tank correctly', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuration).toEqual(mockConfiguration);
      });

      act(() => {
        result.current.renameTank('1', 'New Tank Name');
      });

      const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
      expect(tankConfigUtils.updateTankName).toHaveBeenCalledWith(
        mockConfiguration,
        '1',
        'New Tank Name',
      );
    });

    it('should not rename if configuration is null', async () => {
      const { result } = renderHook(() => useTankConfiguration([]));

      expect(result.current.configuration).toBeNull();

      act(() => {
        result.current.renameTank('1', 'New Name');
      });

      const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
      expect(tankConfigUtils.updateTankName).not.toHaveBeenCalled();
    });

    it('should log debug information when renaming', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuration).toEqual(mockConfiguration);
      });

      act(() => {
        result.current.renameTank('1', 'New Name');
      });

      expect(consoleMock.log).toHaveBeenCalledWith('=== AFTER CONFIGURATION UPDATE ===');
      expect(consoleMock.log).toHaveBeenCalledWith('New configuration will trigger applyTankConfiguration effect');
    });
  });

  describe('Configuration Export/Import', () => {
    it('should export configuration', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuration).toEqual(mockConfiguration);
      });

      act(() => {
        result.current.exportConfig();
      });

      const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
      expect(tankConfigUtils.exportConfiguration).toHaveBeenCalledWith(mockConfiguration);
    });

    it('should not export if configuration is null', async () => {
      const { result } = renderHook(() => useTankConfiguration([]));

      expect(result.current.configuration).toBeNull();

      act(() => {
        result.current.exportConfig();
      });

      const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
      expect(tankConfigUtils.exportConfiguration).not.toHaveBeenCalled();
    });

    it('should import configuration successfully', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      const mockFile = new File(['{}'], 'config.json', { type: 'application/json' });
      let importResult;

      await act(async () => {
        importResult = await result.current.importConfig(mockFile);
      });

      expect(importResult).toBe(true);
      const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
      expect(tankConfigUtils.importConfiguration).toHaveBeenCalledWith(mockFile);
    });

    it('should handle import errors gracefully', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
      tankConfigUtils.importConfiguration.mockRejectedValue(new Error('Import failed'));

      const mockFile = new File(['{}'], 'config.json', { type: 'application/json' });
      let importResult;

      await act(async () => {
        importResult = await result.current.importConfig(mockFile);
      });

      expect(importResult).toBe(false);
      expect(consoleMock.error).toHaveBeenCalledWith(
        'Failed to import configuration:',
        expect.any(Error),
      );
    });
  });

  describe('Configuration Reset', () => {
    it('should reset configuration to default', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuration).toEqual(mockConfiguration);
      });

      act(() => {
        result.current.resetConfiguration();
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('tank-monitoring-config');

      const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
      expect(tankConfigUtils.loadTankConfiguration).toHaveBeenCalledTimes(2); // Once on mount, once on reset
    });

    it('should not reset if no original tanks', async () => {
      const { result } = renderHook(() => useTankConfiguration([]));

      act(() => {
        result.current.resetConfiguration();
      });

      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Updates', () => {
    it('should reapply configuration when original tanks change', async () => {
      const { result, rerender } = renderHook(
        ({ tanks }) => useTankConfiguration(tanks),
        { initialProps: { tanks: mockTanks } },
      );

      await waitFor(() => {
        expect(result.current.configuration).toEqual(mockConfiguration);
      });

      const newTanks = [
        ...mockTanks,
        {
          id: '4',
          name: 'Tank D',
          currentLevel: 800,
          maxCapacity: 5000,
          minLevel: 100,
          maxLevel: 4500,
          unit: 'mm',
          status: 'normal',
          lastUpdated: new Date(),
          location: 'Center',
          group: 'CENTER',
          position: 3,
        },
      ];

      rerender({ tanks: newTanks });

      const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
      expect(tankConfigUtils.applyTankConfiguration).toHaveBeenCalledWith(
        newTanks,
        mockConfiguration,
      );
    });

    it('should handle configuration changes properly', async () => {
      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuration).toEqual(mockConfiguration);
      });

      // Simulate a configuration change
      act(() => {
        result.current.renameTank('1', 'Updated Name');
      });

      const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
      expect(tankConfigUtils.saveTankConfiguration).toHaveBeenCalledTimes(2); // Once on mount, once on rename
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing tank in configuration', async () => {
      const partialConfig: TankConfiguration = {
        tanks: [
          { id: '1', customName: 'Only Tank', position: 0 },
          // Missing tank '2' and '3'
        ],
        lastUpdated: new Date().toISOString(),
      };

      const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
      tankConfigUtils.loadTankConfiguration.mockReturnValue(partialConfig);

      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuration).toEqual(partialConfig);
      });

      // Should still work with partial configuration
      expect(result.current.configuredTanks).toHaveLength(3);
    });

    it('should handle configuration with extra tanks', async () => {
      const extendedConfig: TankConfiguration = {
        tanks: [
          { id: '1', customName: 'Tank 1', position: 0 },
          { id: '2', customName: 'Tank 2', position: 1 },
          { id: '3', customName: 'Tank 3', position: 2 },
          { id: '4', customName: 'Extra Tank', position: 3 }, // Extra tank not in original
        ],
        lastUpdated: new Date().toISOString(),
      };

      const tankConfigUtils = vi.mocked(await import('../utils/tankConfig'));
      tankConfigUtils.loadTankConfiguration.mockReturnValue(extendedConfig);

      const { result } = renderHook(() => useTankConfiguration(mockTanks));

      await waitFor(() => {
        expect(result.current.configuration).toEqual(extendedConfig);
      });

      // Should handle extra configuration gracefully
      expect(result.current.configuredTanks).toHaveLength(3);
    });
  });
});
