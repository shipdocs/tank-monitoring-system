/**
 * Test setup file for Vitest
 * Configures global mocks and test environment
 */

import { vi } from 'vitest';

// Mock global window object for node environment
global.window = global.window || {};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(global.window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(global.window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock Web Audio API
const mockAudioContext = {
  createOscillator: vi.fn(() => ({
    type: 'sine',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), value: 0.5 },
    connect: vi.fn(),
  })),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn(),
  close: vi.fn(),
};

Object.defineProperty(global.window, 'AudioContext', {
  value: vi.fn(() => mockAudioContext),
  writable: true,
});

Object.defineProperty(global.window, 'webkitAudioContext', {
  value: vi.fn(() => mockAudioContext),
  writable: true,
});

// Mock Speech Synthesis API
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => []),
};

Object.defineProperty(global.window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
});

Object.defineProperty(global.window, 'SpeechSynthesisUtterance', {
  value: vi.fn(() => ({
    text: '',
    volume: 1,
    rate: 1,
    pitch: 1,
    onend: null,
    onerror: null,
  })),
  writable: true,
});

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});
