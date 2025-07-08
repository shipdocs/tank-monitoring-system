import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type TankConfiguration,
  applyTankConfiguration,
  exportConfiguration,
  importConfiguration,
  loadTankConfiguration,
  saveTankConfiguration,
  updateTankName,
  updateTankPosition,
} from './tankConfig';
import { type Tank } from '../types/tank';

describe('Tank Configuration Utilities', () => {
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
      lastUpdated: new Date('2024-01-01'),
      location: 'Port',
      group: 'BB',
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
      lastUpdated: new Date('2024-01-01'),
      location: 'Starboard',
      group: 'SB',
    },
    {
      id: '3',
      name: 'Tank C',
      currentLevel: 3000,
      maxCapacity: 5000,
      minLevel: 100,
      maxLevel: 4500,
      unit: 'mm',
      status: 'normal',
      lastUpdated: new Date('2024-01-01'),
      location: 'Center',
      group: 'CENTER',
    },
  ];

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveTankConfiguration', () => {
    it('should save configuration to localStorage', () => {
      const config: TankConfiguration = {
        tanks: [
          { id: '1', position: 0, customName: 'Custom Tank 1' },
          { id: '2', position: 1 },
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      saveTankConfiguration(config);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'tank-monitoring-config',
        expect.any(String),
      );

      const savedData = JSON.parse((localStorage.setItem as any).mock.calls[0][1]);
      expect(savedData.tanks).toEqual(config.tanks);
      expect(savedData.version).toBe('1.0.0');
      expect(savedData.lastUpdated).toBeTruthy();

      expect(consoleLogSpy).toHaveBeenCalledWith('Tank configuration saved to localStorage');
      consoleLogSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (localStorage.setItem as any).mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const config: TankConfiguration = {
        tanks: [{ id: '1', position: 0 }],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      saveTankConfiguration(config);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save tank configuration:',
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('loadTankConfiguration', () => {
    it('should create default configuration when no stored config exists', () => {
      (localStorage.getItem as any).mockReturnValue(null);

      const config = loadTankConfiguration(mockTanks);

      expect(config.tanks).toHaveLength(3);
      expect(config.tanks[0]).toEqual({ id: '1', position: 0 });
      expect(config.tanks[1]).toEqual({ id: '2', position: 1 });
      expect(config.tanks[2]).toEqual({ id: '3', position: 2 });
      expect(config.version).toBe('1.0.0');
    });

    it('should load configuration from localStorage', () => {
      const storedConfig: TankConfiguration = {
        tanks: [
          { id: '2', position: 0, customName: 'Custom B' },
          { id: '1', position: 1, customName: 'Custom A' },
          { id: '3', position: 2 },
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      (localStorage.getItem as any).mockReturnValue(JSON.stringify(storedConfig));

      const config = loadTankConfiguration(mockTanks);

      expect(config.tanks).toEqual(storedConfig.tanks);
    });

    it('should handle version mismatch by creating new config', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const oldConfig = {
        tanks: [{ id: '1', position: 0 }],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '0.9.0', // Old version
      };

      (localStorage.getItem as any).mockReturnValue(JSON.stringify(oldConfig));

      const config = loadTankConfiguration(mockTanks);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Configuration version mismatch, creating new config',
      );
      expect(config.version).toBe('1.0.0');
      expect(config.tanks).toHaveLength(3);
      consoleWarnSpy.mockRestore();
    });

    it('should add missing tanks to configuration', () => {
      const storedConfig: TankConfiguration = {
        tanks: [
          { id: '1', position: 0 },
          { id: '2', position: 1 },
          // Tank 3 is missing
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      (localStorage.getItem as any).mockReturnValue(JSON.stringify(storedConfig));

      const config = loadTankConfiguration(mockTanks);

      expect(config.tanks).toHaveLength(3);
      expect(config.tanks.find(t => t.id === '3')).toEqual({ id: '3', position: 2 });
    });

    it('should remove tanks that no longer exist', () => {
      const storedConfig: TankConfiguration = {
        tanks: [
          { id: '1', position: 0 },
          { id: '2', position: 1 },
          { id: '3', position: 2 },
          { id: '99', position: 3 }, // Non-existent tank
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      (localStorage.getItem as any).mockReturnValue(JSON.stringify(storedConfig));

      const config = loadTankConfiguration(mockTanks);

      expect(config.tanks).toHaveLength(3);
      expect(config.tanks.find(t => t.id === 99)).toBeUndefined();
    });

    it('should handle corrupted localStorage data', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (localStorage.getItem as any).mockReturnValue('invalid json');

      const config = loadTankConfiguration(mockTanks);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load tank configuration:',
        expect.any(Error),
      );
      expect(config.tanks).toHaveLength(3);
      expect(config.version).toBe('1.0.0');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('applyTankConfiguration', () => {
    it('should apply custom names and positions to tanks', () => {
      const config: TankConfiguration = {
        tanks: [
          { id: '2', position: 0, customName: 'Primary Tank' },
          { id: '3', position: 1, customName: 'Secondary Tank' },
          { id: '1', position: 2 },
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const result = applyTankConfiguration(mockTanks, config);

      expect(result[0].id).toBe('2');
      expect(result[0].name).toBe('Primary Tank');
      expect(result[0].position).toBe(0);

      expect(result[1].id).toBe('3');
      expect(result[1].name).toBe('Secondary Tank');
      expect(result[1].position).toBe(1);

      expect(result[2].id).toBe('1');
      expect(result[2].name).toBe('Tank A'); // Original name
      expect(result[2].position).toBe(2);
    });

    it('should sort tanks by position', () => {
      const config: TankConfiguration = {
        tanks: [
          { id: '1', position: 2 },
          { id: '2', position: 0 },
          { id: '3', position: 1 },
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const result = applyTankConfiguration(mockTanks, config);

      expect(result[0].id).toBe('2'); // position 0
      expect(result[1].id).toBe('3'); // position 1
      expect(result[2].id).toBe('1'); // position 2
    });

    it('should handle tanks without configuration (assign position 999)', () => {
      const config: TankConfiguration = {
        tanks: [
          { id: '1', position: 0 },
          // Tanks 2 and 3 have no configuration
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const result = applyTankConfiguration(mockTanks, config);

      expect(result[0].id).toBe('1');
      expect(result[0].position).toBe(0);

      // Tanks without config should be at the end
      expect(result[1].position).toBe(999);
      expect(result[2].position).toBe(999);
    });

    it('should preserve original tank properties', () => {
      const config: TankConfiguration = {
        tanks: [{ id: '1', position: 0, customName: 'Custom Name' }],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const result = applyTankConfiguration([mockTanks[0]], config);

      expect(result[0]).toMatchObject({
        id: '1',
        currentLevel: 1000,
        maxCapacity: 5000,
        status: 'normal',
        location: 'Port',
        group: 'BB',
      });
      expect(result[0].name).toBe('Custom Name');
    });

    it('should handle position 0 correctly', () => {
      const config: TankConfiguration = {
        tanks: [
          { id: '1', position: 0 },
          { id: '2', position: 1 },
          { id: '3', position: 2 },
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const result = applyTankConfiguration(mockTanks, config);

      expect(result[0].id).toBe('1');
      expect(result[0].position).toBe(0);
    });
  });

  describe('updateTankPosition', () => {
    it('should update tank position', () => {
      const config: TankConfiguration = {
        tanks: [
          { id: '1', position: 0 },
          { id: '2', position: 1 },
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const updated = updateTankPosition(config, '1', 5);

      expect(updated.tanks.find(t => t.id === '1')?.position).toBe(5);
      expect(updated.tanks.find(t => t.id === '2')?.position).toBe(1);
      expect(updated.lastUpdated).not.toBe(config.lastUpdated);
    });

    it('should not modify original config', () => {
      const config: TankConfiguration = {
        tanks: [{ id: '1', position: 0 }],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const updated = updateTankPosition(config, '1', 5);

      expect(config.tanks[0].position).toBe(0);
      expect(updated.tanks[0].position).toBe(5);
    });
  });

  describe('updateTankName', () => {
    it('should update tank custom name', () => {
      const config: TankConfiguration = {
        tanks: [
          { id: '1', position: 0 },
          { id: '2', position: 1, customName: 'Old Name' },
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const updated = updateTankName(config, '2', 'New Name');

      expect(updated.tanks.find(t => t.id === '2')?.customName).toBe('New Name');
    });

    it('should trim whitespace from custom names', () => {
      const config: TankConfiguration = {
        tanks: [{ id: '1', position: 0 }],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const updated = updateTankName(config, '1', '  Trimmed Name  ');

      expect(updated.tanks[0].customName).toBe('Trimmed Name');
    });

    it('should remove customName if empty string provided', () => {
      const config: TankConfiguration = {
        tanks: [{ id: '1', position: 0, customName: 'Some Name' }],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const updated = updateTankName(config, '1', '');

      expect(updated.tanks[0].customName).toBeUndefined();
    });
  });

  describe('exportConfiguration', () => {
    it('should export configuration as JSON file', () => {
      const config: TankConfiguration = {
        tanks: [{ id: '1', position: 0 }],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Create a real anchor element for the test
      const mockLink = document.createElement('a');
      mockLink.click = vi.fn();

      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') {
          return mockLink;
        }
        return document.createElement(tagName);
      });

      exportConfiguration(config);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockLink.download).toMatch(/^tank-config-\d{4}-\d{2}-\d{2}\.json$/);
      expect(mockLink.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      expect(consoleLogSpy).toHaveBeenCalledWith('Configuration exported successfully');

      createElementSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should handle export errors gracefully', () => {
      const config: TankConfiguration = {
        tanks: [{ id: '1', position: 0 }],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const createElementSpy = vi.spyOn(document, 'createElement');
      createElementSpy.mockImplementation(() => {
        throw new Error('DOM error');
      });

      exportConfiguration(config);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to export configuration:',
        expect.any(Error),
      );

      createElementSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('importConfiguration', () => {
    it('should import valid configuration from file', async () => {
      const validConfig: TankConfiguration = {
        tanks: [
          { id: '1', position: 0, customName: 'Imported Tank' },
          { id: '2', position: 1 },
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        version: '0.9.0', // Different version
      };

      const file = new File([JSON.stringify(validConfig)], 'config.json', {
        type: 'application/json',
      });

      const result = await importConfiguration(file);

      expect(result.tanks).toEqual(validConfig.tanks);
      expect(result.version).toBe('1.0.0'); // Should update to current version
      expect(result.lastUpdated).not.toBe(validConfig.lastUpdated);
    });

    it('should reject invalid JSON files', async () => {
      const file = new File(['invalid json'], 'config.json', {
        type: 'application/json',
      });

      await expect(importConfiguration(file)).rejects.toThrow(
        'Failed to parse configuration file',
      );
    });

    it('should reject files without tanks array', async () => {
      const invalidConfig = {
        notTanks: [],
        version: '1.0.0',
      };

      const file = new File([JSON.stringify(invalidConfig)], 'config.json', {
        type: 'application/json',
      });

      await expect(importConfiguration(file)).rejects.toThrow(
        'Invalid configuration format',
      );
    });

    it('should reject files with invalid tanks structure', async () => {
      const invalidConfig = {
        tanks: 'not an array',
        version: '1.0.0',
      };

      const file = new File([JSON.stringify(invalidConfig)], 'config.json', {
        type: 'application/json',
      });

      await expect(importConfiguration(file)).rejects.toThrow(
        'Invalid configuration format',
      );
    });

    it('should handle file read errors', async () => {
      const file = new File(['content'], 'config.json');

      // Mock FileReader to simulate error
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        readAsText() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event('error'));
            }
          }, 0);
        }
        onerror: ((event: Event) => void) | null = null;
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      } as any;

      await expect(importConfiguration(file)).rejects.toThrow('Failed to read file');

      global.FileReader = originalFileReader;
    });
  });
});
