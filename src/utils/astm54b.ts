import { ASTM54BTable, ASTM54BEntry } from '../types/tankTable';

// Standard ASTM 54B correction factors for petroleum products
// These are simplified tables - in production, you'd want complete tables
const CRUDE_OIL_TABLE: ASTM54BEntry[] = [
  { temperature: -20, correctionFactor: 1.0160 },
  { temperature: -15, correctionFactor: 1.0140 },
  { temperature: -10, correctionFactor: 1.0120 },
  { temperature: -5, correctionFactor: 1.0100 },
  { temperature: 0, correctionFactor: 1.0080 },
  { temperature: 5, correctionFactor: 1.0060 },
  { temperature: 10, correctionFactor: 1.0040 },
  { temperature: 15, correctionFactor: 1.0020 },
  { temperature: 20, correctionFactor: 1.0000 }, // Reference temperature
  { temperature: 25, correctionFactor: 0.9980 },
  { temperature: 30, correctionFactor: 0.9960 },
  { temperature: 35, correctionFactor: 0.9940 },
  { temperature: 40, correctionFactor: 0.9920 },
  { temperature: 45, correctionFactor: 0.9900 },
  { temperature: 50, correctionFactor: 0.9880 },
  { temperature: 55, correctionFactor: 0.9860 },
  { temperature: 60, correctionFactor: 0.9840 },
  { temperature: 65, correctionFactor: 0.9820 },
  { temperature: 70, correctionFactor: 0.9800 },
  { temperature: 75, correctionFactor: 0.9780 },
  { temperature: 80, correctionFactor: 0.9760 }
];

const DIESEL_TABLE: ASTM54BEntry[] = [
  { temperature: -20, correctionFactor: 1.0140 },
  { temperature: -15, correctionFactor: 1.0125 },
  { temperature: -10, correctionFactor: 1.0110 },
  { temperature: -5, correctionFactor: 1.0095 },
  { temperature: 0, correctionFactor: 1.0080 },
  { temperature: 5, correctionFactor: 1.0065 },
  { temperature: 10, correctionFactor: 1.0050 },
  { temperature: 15, correctionFactor: 1.0035 },
  { temperature: 20, correctionFactor: 1.0020 },
  { temperature: 25, correctionFactor: 1.0005 },
  { temperature: 30, correctionFactor: 0.9990 },
  { temperature: 35, correctionFactor: 0.9975 },
  { temperature: 40, correctionFactor: 0.9960 },
  { temperature: 45, correctionFactor: 0.9945 },
  { temperature: 50, correctionFactor: 0.9930 },
  { temperature: 55, correctionFactor: 0.9915 },
  { temperature: 60, correctionFactor: 0.9900 },
  { temperature: 65, correctionFactor: 0.9885 },
  { temperature: 70, correctionFactor: 0.9870 },
  { temperature: 75, correctionFactor: 0.9855 },
  { temperature: 80, correctionFactor: 0.9840 }
];

const GASOLINE_TABLE: ASTM54BEntry[] = [
  { temperature: -20, correctionFactor: 1.0200 },
  { temperature: -15, correctionFactor: 1.0175 },
  { temperature: -10, correctionFactor: 1.0150 },
  { temperature: -5, correctionFactor: 1.0125 },
  { temperature: 0, correctionFactor: 1.0100 },
  { temperature: 5, correctionFactor: 1.0075 },
  { temperature: 10, correctionFactor: 1.0050 },
  { temperature: 15, correctionFactor: 1.0025 },
  { temperature: 20, correctionFactor: 1.0000 },
  { temperature: 25, correctionFactor: 0.9975 },
  { temperature: 30, correctionFactor: 0.9950 },
  { temperature: 35, correctionFactor: 0.9925 },
  { temperature: 40, correctionFactor: 0.9900 },
  { temperature: 45, correctionFactor: 0.9875 },
  { temperature: 50, correctionFactor: 0.9850 },
  { temperature: 55, correctionFactor: 0.9825 },
  { temperature: 60, correctionFactor: 0.9800 },
  { temperature: 65, correctionFactor: 0.9775 },
  { temperature: 70, correctionFactor: 0.9750 },
  { temperature: 75, correctionFactor: 0.9725 },
  { temperature: 80, correctionFactor: 0.9700 }
];

// Standard ASTM 54B tables
export const STANDARD_ASTM_TABLES: ASTM54BTable[] = [
  {
    id: 'astm-54b-crude',
    name: 'ASTM 54B - Crude Oil',
    description: 'Standard ASTM 54B temperature correction table for crude oil',
    entries: CRUDE_OIL_TABLE,
    temperatureRange: { min: -20, max: 80 }
  },
  {
    id: 'astm-54b-diesel',
    name: 'ASTM 54B - Diesel',
    description: 'Standard ASTM 54B temperature correction table for diesel fuel',
    entries: DIESEL_TABLE,
    temperatureRange: { min: -20, max: 80 }
  },
  {
    id: 'astm-54b-gasoline',
    name: 'ASTM 54B - Gasoline',
    description: 'Standard ASTM 54B temperature correction table for gasoline',
    entries: GASOLINE_TABLE,
    temperatureRange: { min: -20, max: 80 }
  }
];

/**
 * Get temperature correction factor from ASTM 54B table
 */
export function getTemperatureCorrectionFactor(
  temperature: number,
  astmTable: ASTM54BTable
): number {
  const { entries, temperatureRange } = astmTable;
  
  // Check if temperature is within range
  if (temperature < temperatureRange.min || temperature > temperatureRange.max) {
    console.warn(`Temperature ${temperature}°C is outside ASTM table range (${temperatureRange.min}°C to ${temperatureRange.max}°C)`);
  }
  
  // Find exact match
  const exactMatch = entries.find(entry => entry.temperature === temperature);
  if (exactMatch) {
    return exactMatch.correctionFactor;
  }
  
  // Find surrounding entries for interpolation
  const sortedEntries = entries.sort((a, b) => a.temperature - b.temperature);
  
  // Handle edge cases
  if (temperature <= sortedEntries[0].temperature) {
    return sortedEntries[0].correctionFactor;
  }
  if (temperature >= sortedEntries[sortedEntries.length - 1].temperature) {
    return sortedEntries[sortedEntries.length - 1].correctionFactor;
  }
  
  // Linear interpolation
  for (let i = 0; i < sortedEntries.length - 1; i++) {
    const lower = sortedEntries[i];
    const upper = sortedEntries[i + 1];
    
    if (temperature >= lower.temperature && temperature <= upper.temperature) {
      const ratio = (temperature - lower.temperature) / (upper.temperature - lower.temperature);
      return lower.correctionFactor + ratio * (upper.correctionFactor - lower.correctionFactor);
    }
  }
  
  // Fallback (should not reach here)
  return 1.0;
}

/**
 * Calculate temperature-corrected density
 */
export function calculateCorrectedDensity(
  baseDensity: number,
  temperature: number,
  astmTableId: string
): { correctedDensity: number; correctionFactor: number; applied: boolean } {
  const astmTable = STANDARD_ASTM_TABLES.find(table => table.id === astmTableId);
  
  if (!astmTable) {
    console.warn(`ASTM table ${astmTableId} not found`);
    return {
      correctedDensity: baseDensity,
      correctionFactor: 1.0,
      applied: false
    };
  }
  
  const correctionFactor = getTemperatureCorrectionFactor(temperature, astmTable);
  const correctedDensity = baseDensity * correctionFactor;
  
  return {
    correctedDensity,
    correctionFactor,
    applied: true
  };
}

/**
 * Get ASTM table by ID
 */
export function getASTMTable(id: string): ASTM54BTable | null {
  return STANDARD_ASTM_TABLES.find(table => table.id === id) || null;
}

/**
 * Get all available ASTM tables
 */
export function getAllASTMTables(): ASTM54BTable[] {
  return STANDARD_ASTM_TABLES;
}

/**
 * Validate temperature against ASTM table range
 */
export function validateTemperatureRange(
  temperature: number,
  astmTableId: string
): { valid: boolean; message?: string } {
  const table = getASTMTable(astmTableId);
  
  if (!table) {
    return { valid: false, message: `ASTM table ${astmTableId} not found` };
  }
  
  const { min, max } = table.temperatureRange;
  
  if (temperature < min) {
    return { 
      valid: false, 
      message: `Temperature ${temperature}°C is below minimum range (${min}°C)` 
    };
  }
  
  if (temperature > max) {
    return { 
      valid: false, 
      message: `Temperature ${temperature}°C is above maximum range (${max}°C)` 
    };
  }
  
  return { valid: true };
}
