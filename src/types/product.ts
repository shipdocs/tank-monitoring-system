/**
 * Type definitions for the maritime tank monitoring system
 * Critical for vessel operations and cargo management
 */

/**
 * Represents a product stored in maritime tanks
 * Products have specific density characteristics critical for volume/mass calculations
 */
export interface Product {
  /** Unique identifier for the product */
  id: string;
  
  /** Product name (e.g., "Marine Gas Oil", "Heavy Fuel Oil") */
  name: string;
  
  /** 
   * Density at 15°C in vacuum conditions (kg/m³)
   * Standard reference density used in maritime calculations
   */
  density_15c_vacuum: number;
  
  /** 
   * Optional product classification (e.g., "fuel", "lubricant", "cargo")
   * Used for categorization and reporting
   */
  product_type?: string;
  
  /** Timestamp when the product was created in the system */
  created_at: Date;
  
  /** Timestamp when the product was last updated */
  updated_at: Date;
}

/**
 * Real-time operational data for tank monitoring
 * Used for current state assessment and flow calculations
 */
export interface TankOperationalData {
  /** 
   * Current temperature of the product in the tank (°C)
   * Critical for volume correction calculations
   */
  temperature: number;
  
  /** 
   * Target volume setpoint in liters
   * The desired volume to reach during filling/emptying operations
   */
  setpoint: number;
  
  /** 
   * Current flow rate in liters per minute (L/min)
   * Positive values indicate filling, negative values indicate emptying
   * Zero indicates no active transfer
   */
  flowRate: number;
}

/**
 * Results from product volume and mass calculations
 * Incorporates temperature corrections and density adjustments
 */
export interface CalculationResult {
  /** 
   * Volume Correction Factor
   * Adjusts volume from observed temperature to standard 15°C
   * Typically ranges from 0.95 to 1.05
   */
  vcf: number;
  
  /** 
   * Thermal expansion coefficient (1/°C)
   * Product-specific value used in VCF calculations
   */
  alpha: number;
  
  /** 
   * Density in air at current temperature (kg/m³)
   * Adjusted from vacuum density for buoyancy effects
   */
  densityInAir: number;
  
  /** 
   * Total mass in metric tons
   * Calculated from corrected volume and density
   */
  metricTons: number;
  
  /** 
   * Estimated minutes to reach setpoint volume
   * null if no active transfer or setpoint already reached
   */
  remainingTime: number | null;
  
  /** 
   * Estimated minutes until tank is empty at current flow rate
   * null if not emptying or flow rate is zero
   */
  timeToEmpty: number | null;
  
  /** 
   * Estimated minutes until tank is full at current flow rate
   * null if not filling or flow rate is zero
   */
  timeToFull: number | null;
}

/**
 * Entry for time-based tank operations overview
 * Used for scheduling and monitoring multiple tank operations
 */
export interface TimeTableEntry {
  /** Unique identifier of the tank */
  tankId: string;
  
  /** Display name of the tank (e.g., "Port Tank 3") */
  tankName: string;
  
  /** Current volume in the tank (liters) */
  currentVolume: number;
  
  /** Target volume setpoint (liters) */
  setpoint: number;
  
  /** 
   * Active flow rate (L/min)
   * Positive for filling, negative for emptying
   */
  flowRate: number;
  
  /** 
   * Predicted time when operation will complete
   * null if no active operation or unable to calculate
   */
  estimatedCompletionTime: Date | null;
  
  /** 
   * Minutes remaining until completion
   * null if no active operation
   */
  minutesRemaining: number | null;
}