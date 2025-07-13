/**
 * AudioAlarmService - Cross-platform Web Audio API alarm system
 * 
 * This service provides maritime-grade audio alarms using Web Audio API:
 * - Cross-platform compatibility (Windows, Linux, Web)
 * - Multiple alarm types (beep, continuous, pattern, voice)
 * - Configurable volume and frequency
 * - Professional maritime alarm patterns
 */

import { AlarmAudioType, AlarmState } from '../types/alarm';

export interface AudioAlarmConfig {
  enabled: boolean;
  volume: number; // 0-100
  audioType: AlarmAudioType;
  frequency: number; // Hz for tone generation
  beepDuration: number; // milliseconds
  beepInterval: number; // milliseconds between beeps
  patternRepeat: number; // number of pattern repetitions
}

export interface AudioAlarmContext {
  context: AudioContext | null;
  gainNode: GainNode | null;
  oscillator: OscillatorNode | null;
  isPlaying: boolean;
  currentPattern: number | null;
}

export class AudioAlarmService {
  private static instance: AudioAlarmService;
  private audioContext: AudioAlarmContext;
  private defaultConfig: AudioAlarmConfig;

  private constructor() {
    this.audioContext = {
      context: null,
      gainNode: null,
      oscillator: null,
      isPlaying: false,
      currentPattern: null
    };

    this.defaultConfig = {
      enabled: true,
      volume: 75,
      audioType: 'beep',
      frequency: 800, // Maritime standard frequency
      beepDuration: 200,
      beepInterval: 500,
      patternRepeat: 3
    };
  }

  static getInstance(): AudioAlarmService {
    if (!AudioAlarmService.instance) {
      AudioAlarmService.instance = new AudioAlarmService();
    }
    return AudioAlarmService.instance;
  }

  /**
   * Initialize Web Audio API context
   */
  async initializeAudio(): Promise<boolean> {
    try {
      // Create AudioContext (cross-platform)
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported in this browser');
        return false;
      }

      this.audioContext.context = new AudioContextClass();
      
      // Create gain node for volume control
      this.audioContext.gainNode = this.audioContext.context.createGain();
      this.audioContext.gainNode.connect(this.audioContext.context.destination);

      // Resume context if suspended (required by some browsers)
      if (this.audioContext.context.state === 'suspended') {
        await this.audioContext.context.resume();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      return false;
    }
  }

  /**
   * Play alarm sound based on alarm state
   */
  async playAlarmForState(alarmState: AlarmState, config?: Partial<AudioAlarmConfig>): Promise<void> {
    const audioConfig = { ...this.defaultConfig, ...config };

    if (!audioConfig.enabled) {
      return;
    }

    // Initialize audio if not already done
    if (!this.audioContext.context) {
      const initialized = await this.initializeAudio();
      if (!initialized) {
        return;
      }
    }

    // Stop any currently playing alarm
    this.stopAlarm();

    // Play appropriate alarm for state
    switch (alarmState) {
      case 'PRE_ALARM':
        await this.playBeepPattern(audioConfig, 2); // 2 beeps
        break;
      case 'TARGET_REACHED':
        await this.playBeepPattern(audioConfig, 1); // Single beep
        break;
      case 'OVERSHOOT_WARNING':
        await this.playBeepPattern(audioConfig, 3); // 3 beeps
        break;
      case 'OVERSHOOT_ALARM':
        await this.playContinuousAlarm(audioConfig); // Continuous alarm
        break;
      default:
        // No sound for NORMAL state
        break;
    }
  }

  /**
   * Play specific audio type
   */
  async playAudioType(audioType: AlarmAudioType, config?: Partial<AudioAlarmConfig>): Promise<void> {
    const audioConfig = { ...this.defaultConfig, ...config };

    if (!audioConfig.enabled) {
      return;
    }

    // Initialize audio if not already done
    if (!this.audioContext.context) {
      const initialized = await this.initializeAudio();
      if (!initialized) {
        return;
      }
    }

    this.stopAlarm();

    switch (audioType) {
      case 'beep':
        await this.playBeepPattern(audioConfig, 1);
        break;
      case 'continuous':
        await this.playContinuousAlarm(audioConfig);
        break;
      case 'pattern':
        await this.playPatternAlarm(audioConfig);
        break;
      case 'voice':
        await this.playVoiceAlarm(audioConfig);
        break;
    }
  }

  /**
   * Play single beep
   */
  async playBeep(config?: Partial<AudioAlarmConfig>): Promise<void> {
    const audioConfig = { ...this.defaultConfig, ...config };
    
    if (!this.audioContext.context || !this.audioContext.gainNode) {
      return;
    }

    const oscillator = this.audioContext.context.createOscillator();
    const gainNode = this.audioContext.context.createGain();

    // Configure oscillator
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(audioConfig.frequency, this.audioContext.context.currentTime);

    // Configure volume
    const volume = audioConfig.volume / 100;
    gainNode.gain.setValueAtTime(volume, this.audioContext.context.currentTime);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.gainNode);

    // Play beep
    oscillator.start();
    oscillator.stop(this.audioContext.context.currentTime + (audioConfig.beepDuration / 1000));

    this.audioContext.isPlaying = true;

    // Clean up after beep
    setTimeout(() => {
      this.audioContext.isPlaying = false;
    }, audioConfig.beepDuration);
  }

  /**
   * Play beep pattern (multiple beeps)
   */
  private async playBeepPattern(config: AudioAlarmConfig, beepCount: number): Promise<void> {
    for (let i = 0; i < beepCount; i++) {
      await this.playBeep(config);
      
      // Wait between beeps (except for last beep)
      if (i < beepCount - 1) {
        await this.delay(config.beepInterval);
      }
    }
  }

  /**
   * Play continuous alarm
   */
  private async playContinuousAlarm(config: AudioAlarmConfig): Promise<void> {
    if (!this.audioContext.context || !this.audioContext.gainNode) {
      return;
    }

    const oscillator = this.audioContext.context.createOscillator();
    const gainNode = this.audioContext.context.createGain();

    // Configure oscillator for continuous tone
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.context.currentTime);

    // Configure volume
    const volume = config.volume / 100;
    gainNode.gain.setValueAtTime(volume, this.audioContext.context.currentTime);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.gainNode);

    // Store oscillator for stopping
    this.audioContext.oscillator = oscillator;
    this.audioContext.isPlaying = true;

    // Start continuous tone
    oscillator.start();
  }

  /**
   * Play pattern alarm (maritime standard pattern)
   */
  private async playPatternAlarm(config: AudioAlarmConfig): Promise<void> {
    // Maritime pattern: 3 short beeps, pause, repeat
    const playPattern = async () => {
      for (let i = 0; i < 3; i++) {
        await this.playBeep({ ...config, beepDuration: 150 });
        if (i < 2) {
          await this.delay(150);
        }
      }
      await this.delay(1000); // Longer pause between pattern repetitions
    };

    // Play pattern multiple times
    for (let i = 0; i < config.patternRepeat; i++) {
      await playPattern();
    }
  }

  /**
   * Play voice alarm (text-to-speech)
   */
  private async playVoiceAlarm(config: AudioAlarmConfig): Promise<void> {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Alarm activated');
      utterance.volume = config.volume / 100;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      speechSynthesis.speak(utterance);
      this.audioContext.isPlaying = true;

      // Mark as not playing when speech ends
      utterance.onend = () => {
        this.audioContext.isPlaying = false;
      };
    } else {
      console.warn('Speech synthesis not supported, falling back to beep');
      await this.playBeep(config);
    }
  }

  /**
   * Stop all alarm sounds
   */
  stopAlarm(): void {
    // Stop oscillator if playing
    if (this.audioContext.oscillator) {
      try {
        this.audioContext.oscillator.stop();
      } catch (error) {
        console.warn('Failed to stop oscillator. It might already be stopped.', error);
      }
      this.audioContext.oscillator = null;
    }

    // Clear any pattern timers
    if (this.audioContext.currentPattern) {
      clearTimeout(this.audioContext.currentPattern);
      this.audioContext.currentPattern = null;
    }

    // Stop speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    this.audioContext.isPlaying = false;
  }

  /**
   * Test audio functionality
   */
  async testAudio(audioType: AlarmAudioType = 'beep', volume: number = 50): Promise<boolean> {
    try {
      await this.playAudioType(audioType, { volume, enabled: true });
      return true;
    } catch (error) {
      console.error('Audio test failed:', error);
      return false;
    }
  }

  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean {
    return this.audioContext.isPlaying;
  }

  /**
   * Get audio context state
   */
  getAudioState(): string {
    return this.audioContext.context?.state || 'not-initialized';
  }

  /**
   * Utility: delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    if (this.audioContext.gainNode) {
      const normalizedVolume = Math.max(0, Math.min(100, volume)) / 100;
      this.audioContext.gainNode.gain.setValueAtTime(
        normalizedVolume,
        this.audioContext.context?.currentTime || 0
      );
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    if (this.audioContext.gainNode) {
      return this.audioContext.gainNode.gain.value * 100;
    }
    return this.defaultConfig.volume;
  }

  /**
   * Check if Web Audio API is supported
   */
  isAudioSupported(): boolean {
    return !!(window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  }

  /**
   * Cleanup audio resources
   */
  dispose(): void {
    this.stopAlarm();

    if (this.audioContext.context) {
      this.audioContext.context.close();
      this.audioContext.context = null;
    }

    this.audioContext.gainNode = null;
  }
}
