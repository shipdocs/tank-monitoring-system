/**
 * ASTM54BService - Implementation of ASTM 54B maritime formula for Volume Correction Factor (VCF) calculations
 * 
 * This service implements the industry-standard ASTM 54B formula used in maritime operations
 * for calculating Volume Correction Factors to account for temperature variations in fuel density.
 * 
 * CRITICAL: This is PRODUCTION CODE for ship operations. Accuracy is paramount.
 */

/**
 * Service class for ASTM 54B Volume Correction Factor calculations
 */
export class ASTM54BService {
  /**
   * Minimum valid density in kg/m³
   */
  private static readonly MIN_DENSITY = 600;

  /**
   * Maximum valid density in kg/m³
   */
  private static readonly MAX_DENSITY = 1100;

  /**
   * Minimum valid temperature in °C
   */
  private static readonly MIN_TEMPERATURE = -50;

  /**
   * Maximum valid temperature in °C
   */
  private static readonly MAX_TEMPERATURE = 150;

  /**
   * Reference temperature in °C
   */
  private static readonly REFERENCE_TEMPERATURE = 15.0;

  /**
   * Vacuum to air density conversion factor
   */
  private static readonly VACUUM_TO_AIR_FACTOR = 0.0011;

  /**
   * Calculate the Volume Correction Factor (VCF) using ASTM 54B formula
   * 
   * VCF = e^(-ALPHA * dT * (1 + 0.8 * ALPHA * dT))
   * 
   * @param density15c - Density at 15°C in kg/m³
   * @param observedTemp - Observed temperature in °C
   * @returns Volume Correction Factor (dimensionless)
   * @throws Error if inputs are invalid or out of range
   */
  public static calculateVCF(density15c: number, observedTemp: number): number {
    // Input validation
    this.validateDensity(density15c);
    this.validateTemperature(observedTemp);

    // Calculate temperature difference from reference (15°C)
    const dT = observedTemp - this.REFERENCE_TEMPERATURE;

    // Calculate thermal expansion coefficient
    const alpha = this.calculateAlpha(density15c);

    // Apply ASTM 54B formula: VCF = e^(-ALPHA * dT * (1 + 0.8 * ALPHA * dT))
    const exponent = -alpha * dT * (1 + 0.8 * alpha * dT);
    const vcf = Math.exp(exponent);

    // Validate result
    if (!isFinite(vcf) || vcf <= 0 || vcf > 2) {
      throw new Error(`Invalid VCF calculation result: ${vcf}. Please check input values.`);
    }

    // Round to 5 decimal places for consistency
    return Math.round(vcf * 100000) / 100000;
  }

  /**
   * Calculate the thermal expansion coefficient (ALPHA) based on density
   * 
   * Uses different formulas for different density ranges as per ASTM 54B standard
   * 
   * @param density - Density at 15°C in kg/m³
   * @returns Thermal expansion coefficient (1/°C)
   * @throws Error if density is invalid
   */
  public static calculateAlpha(density: number): number {
    this.validateDensity(density);

    let alpha: number;

    if (density <= 770) {
      // Range 1: density <= 770 kg/m³
      alpha = (346.42278 + 0.43884 * density) / (density * density);
    } else if (density > 770 && density < 778) {
      // Range 2: 770 < density < 778 kg/m³
      alpha = -0.0033612 + 2680.32 / (density * density);
    } else if (density >= 778 && density < 839) {
      // Range 3: 778 <= density < 839 kg/m³
      alpha = 594.5418 / (density * density);
    } else if (density >= 839) {
      // Range 4: density >= 839 kg/m³
      alpha = (186.9696 + 0.48618 * density) / (density * density);
    } else {
      // This should never happen due to validation, but included for completeness
      throw new Error(`Unexpected density value: ${density}`);
    }

    // Validate alpha result
    if (!isFinite(alpha) || alpha <= 0 || alpha > 0.01) {
      throw new Error(`Invalid alpha calculation result: ${alpha} for density ${density}`);
    }

    return alpha;
  }

  /**
   * Convert density from vacuum to air conditions
   * 
   * @param densityVacuum - Density in vacuum conditions (kg/m³)
   * @returns Density in air conditions (kg/m³)
   * @throws Error if input is invalid
   */
  public static convertVacuumToAir(densityVacuum: number): number {
    if (!isFinite(densityVacuum) || densityVacuum <= 0) {
      throw new Error(`Invalid vacuum density: ${densityVacuum}. Must be a positive number.`);
    }

    const densityAir = densityVacuum - this.VACUUM_TO_AIR_FACTOR;

    if (densityAir <= 0) {
      throw new Error(`Invalid air density result: ${densityAir}. Vacuum density too low.`);
    }

    return densityAir;
  }

  /**
   * Calculate mass in metric tons from volume, density, and temperature
   * 
   * Mass = Volume × Density × VCF
   * 
   * @param volumeLiters - Volume in liters
   * @param density15c - Density at 15°C in kg/m³
   * @param temperature - Observed temperature in °C
   * @returns Mass in metric tons
   * @throws Error if inputs are invalid
   */
  public static calculateMetricTons(
    volumeLiters: number,
    density15c: number,
    temperature: number
  ): number {
    // Validate inputs
    if (!isFinite(volumeLiters) || volumeLiters < 0) {
      throw new Error(`Invalid volume: ${volumeLiters}. Must be a non-negative number.`);
    }

    this.validateDensity(density15c);
    this.validateTemperature(temperature);

    // Calculate VCF
    const vcf = this.calculateVCF(density15c, temperature);

    // Convert volume from liters to m³
    const volumeM3 = volumeLiters / 1000;

    // Calculate mass in kg
    const massKg = volumeM3 * density15c * vcf;

    // Convert to metric tons
    const metricTons = massKg / 1000;

    // Validate result
    if (!isFinite(metricTons) || metricTons < 0) {
      throw new Error(`Invalid mass calculation result: ${metricTons} metric tons`);
    }

    // Round to 3 decimal places for practical use
    return Math.round(metricTons * 1000) / 1000;
  }

  /**
   * Validate density value
   * 
   * @param density - Density value to validate (kg/m³)
   * @throws Error if density is invalid or out of range
   */
  private static validateDensity(density: number): void {
    if (!isFinite(density)) {
      throw new Error(`Invalid density: ${density}. Must be a finite number.`);
    }

    if (density < this.MIN_DENSITY || density > this.MAX_DENSITY) {
      throw new Error(
        `Density ${density} kg/m³ out of valid range [${this.MIN_DENSITY}, ${this.MAX_DENSITY}]`
      );
    }
  }

  /**
   * Validate temperature value
   * 
   * @param temperature - Temperature value to validate (°C)
   * @throws Error if temperature is invalid or out of range
   */
  private static validateTemperature(temperature: number): void {
    if (!isFinite(temperature)) {
      throw new Error(`Invalid temperature: ${temperature}. Must be a finite number.`);
    }

    if (temperature < this.MIN_TEMPERATURE || temperature > this.MAX_TEMPERATURE) {
      throw new Error(
        `Temperature ${temperature}°C out of valid range [${this.MIN_TEMPERATURE}, ${this.MAX_TEMPERATURE}]`
      );
    }
  }

  /**
   * Self-test method to validate the implementation
   * 
   * Critical test case: density=839, temp=32.5 should give VCF=0.98515 (±0.00001)
   * 
   * @returns true if all tests pass
   * @throws Error if any test fails
   */
  public static selfTest(): boolean {
    // Critical test case from specification
    const testDensity = 839;
    const testTemp = 32.5;
    const expectedVCF = 0.98515;
    const tolerance = 0.00001;

    const calculatedVCF = this.calculateVCF(testDensity, testTemp);
    const difference = Math.abs(calculatedVCF - expectedVCF);

    if (difference > tolerance) {
      throw new Error(
        `Self-test failed: density=${testDensity}, temp=${testTemp} ` +
        `expected VCF=${expectedVCF} but got ${calculatedVCF} ` +
        `(difference=${difference}, tolerance=${tolerance})`
      );
    }

    // Additional boundary tests
    const boundaryTests = [
      { density: 770, temp: 15, expectedRange: [0.999, 1.001] },
      { density: 778, temp: 15, expectedRange: [0.999, 1.001] },
      { density: 839, temp: 15, expectedRange: [0.999, 1.001] },
      { density: 900, temp: 25, expectedRange: [0.990, 0.995] },
      { density: 700, temp: 5, expectedRange: [1.005, 1.010] }
    ];

    for (const test of boundaryTests) {
      const vcf = this.calculateVCF(test.density, test.temp);
      if (vcf < test.expectedRange[0] || vcf > test.expectedRange[1]) {
        throw new Error(
          `Boundary test failed: density=${test.density}, temp=${test.temp} ` +
          `VCF=${vcf} outside expected range [${test.expectedRange[0]}, ${test.expectedRange[1]}]`
        );
      }
    }

    return true;
  }
}

// Run self-test on module load in development
if (process.env.NODE_ENV !== 'production') {
  try {
    ASTM54BService.selfTest();
    console.log('ASTM54BService self-test passed ✓');
  } catch (error) {
    console.error('ASTM54BService self-test failed:', error);
  }
}