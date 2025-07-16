/**
 * FlowRateConfigurationService - Single source of truth for flow rate settings
 * 
 * Centralizes all flow rate related configuration including:
 * - Stability thresholds
 * - Display units
 * - Calculation parameters
 */

export interface FlowRateConfiguration {
  /** Stability threshold in m³/h - below this is considered stable */
  stabilityThreshold: number;
  
  /** Number of decimal places for display */
  displayPrecision: number;
  
  /** Minimum confidence level to show flow rate (0-1) */
  minimumConfidence: number;
  
  /** Number of historical readings to keep for calculations */
  historySize: number;
  
  /** Time tolerance for interval consistency (as percentage) */
  timingTolerance: number;
}

export class FlowRateConfigurationService {
  private static instance: FlowRateConfigurationService;
  private config: FlowRateConfiguration;

  private constructor() {
    // Default configuration - all values in m³/h
    this.config = {
      stabilityThreshold: 0.03, // 0.03 m³/h = 0.5 L/min (converted for consistency)
      displayPrecision: 1,
      minimumConfidence: 0.3,
      historySize: 10,
      timingTolerance: 0.5 // 50%
    };
  }

  static getInstance(): FlowRateConfigurationService {
    if (!FlowRateConfigurationService.instance) {
      FlowRateConfigurationService.instance = new FlowRateConfigurationService();
    }
    return FlowRateConfigurationService.instance;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): FlowRateConfiguration {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfiguration(updates: Partial<FlowRateConfiguration>): void {
    this.config = { ...this.config, ...updates };
    
    // Validate configuration
    this.validateConfiguration();
    
    // Save to localStorage for persistence
    this.saveConfiguration();
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = {
      stabilityThreshold: 0.03,
      displayPrecision: 1,
      minimumConfidence: 0.3,
      historySize: 10,
      timingTolerance: 0.5
    };
    this.saveConfiguration();
  }

  /**
   * Load configuration from localStorage
   */
  loadConfiguration(): void {
    try {
      const saved = localStorage.getItem('flowRateConfiguration');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { ...this.config, ...parsed };
        this.validateConfiguration();
      }
    } catch (error) {
      console.warn('Failed to load flow rate configuration, using defaults:', error);
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfiguration(): void {
    try {
      localStorage.setItem('flowRateConfiguration', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save flow rate configuration:', error);
    }
  }

  /**
   * Validate configuration values
   */
  private validateConfiguration(): void {
    // Ensure stability threshold is positive
    if (this.config.stabilityThreshold < 0) {
      this.config.stabilityThreshold = 0.03;
    }

    // Ensure display precision is reasonable
    if (this.config.displayPrecision < 0 || this.config.displayPrecision > 3) {
      this.config.displayPrecision = 1;
    }

    // Ensure confidence is between 0 and 1
    if (this.config.minimumConfidence < 0 || this.config.minimumConfidence > 1) {
      this.config.minimumConfidence = 0.3;
    }

    // Ensure history size is reasonable
    if (this.config.historySize < 2 || this.config.historySize > 50) {
      this.config.historySize = 10;
    }

    // Ensure timing tolerance is reasonable
    if (this.config.timingTolerance < 0.1 || this.config.timingTolerance > 2.0) {
      this.config.timingTolerance = 0.5;
    }
  }

  /**
   * Format flow rate for display using configured precision
   */
  formatFlowRate(flowRateM3PerHour: number): string {
    const threshold = this.config.stabilityThreshold;
    
    if (Math.abs(flowRateM3PerHour) < threshold) {
      return '0.0 m³/h';
    }
    
    const sign = flowRateM3PerHour >= 0 ? '+' : '';
    return `${sign}${flowRateM3PerHour.toFixed(this.config.displayPrecision)} m³/h`;
  }

  /**
   * Determine if flow rate should be considered stable
   */
  isStable(flowRateM3PerHour: number): boolean {
    return Math.abs(flowRateM3PerHour) < this.config.stabilityThreshold;
  }

  /**
   * Determine trend from flow rate
   */
  getTrend(flowRateM3PerHour: number): 'loading' | 'unloading' | 'stable' {
    if (this.isStable(flowRateM3PerHour)) {
      return 'stable';
    }
    return flowRateM3PerHour > 0 ? 'loading' : 'unloading';
  }

  /**
   * Check if confidence level is acceptable for display
   */
  isConfidenceAcceptable(confidence: number): boolean {
    return confidence >= this.config.minimumConfidence;
  }

  /**
   * Convert L/min to m³/h
   */
  static convertLPerMinToM3PerHour(lPerMin: number): number {
    return (lPerMin * 60) / 1000;
  }

  /**
   * Convert m³/h to L/min
   */
  static convertM3PerHourToLPerMin(m3PerHour: number): number {
    return (m3PerHour * 1000) / 60;
  }
}

// Initialize and load configuration on module load
const configService = FlowRateConfigurationService.getInstance();
configService.loadConfiguration();