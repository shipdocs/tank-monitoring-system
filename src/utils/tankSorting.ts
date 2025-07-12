import { Tank } from '../types/tank';

/**
 * Natural sorting utility for tank names
 * Handles tank names like BB1, BB2, BB10, SB1, SB2, etc.
 * Sorts by prefix first (BB, SB), then by numeric value
 */

export interface TankNameParts {
  prefix: string;
  number: number;
  originalName: string;
}

/**
 * Parses a tank name into prefix and numeric parts
 * Examples: "BB1" -> {prefix: "BB", number: 1}, "SB10" -> {prefix: "SB", number: 10}
 */
export function parseTankName(tankName: string): TankNameParts {
  const match = tankName.match(/^([A-Za-z]+)(\d+)$/);
  
  if (match) {
    return {
      prefix: match[1].toUpperCase(),
      number: parseInt(match[2], 10),
      originalName: tankName
    };
  }
  
  // Fallback for non-standard names
  return {
    prefix: tankName.toUpperCase(),
    number: 0,
    originalName: tankName
  };
}

/**
 * Natural sort comparison function for tank names
 * Sorts by prefix first (alphabetically), then by number (numerically)
 */
export function compareTankNames(nameA: string, nameB: string): number {
  const partsA = parseTankName(nameA);
  const partsB = parseTankName(nameB);
  
  // First compare prefixes alphabetically
  const prefixComparison = partsA.prefix.localeCompare(partsB.prefix);
  if (prefixComparison !== 0) {
    return prefixComparison;
  }
  
  // If prefixes are the same, compare numbers numerically
  return partsA.number - partsB.number;
}

/**
 * Sorts tanks using natural sorting
 * Groups by prefix (BB, SB) and sorts numerically within each group
 */
export function sortTanksNaturally(tanks: Tank[]): Tank[] {
  return [...tanks].sort((a, b) => compareTankNames(a.name, b.name));
}

/**
 * Sorts tanks with custom group priority
 * BB (Port) tanks first, then SB (Starboard) tanks, then others
 */
export function sortTanksWithGroupPriority(tanks: Tank[]): Tank[] {
  const groupPriority = { 'BB': 1, 'SB': 2, 'CENTER': 3 };
  
  return [...tanks].sort((a, b) => {
    const groupA = a.group || 'CENTER';
    const groupB = b.group || 'CENTER';
    
    // First sort by group priority
    const groupComparison = (groupPriority[groupA] || 999) - (groupPriority[groupB] || 999);
    if (groupComparison !== 0) {
      return groupComparison;
    }
    
    // Within the same group, use natural sorting
    return compareTankNames(a.name, b.name);
  });
}

/**
 * Gets the expected sort order for a tank name
 * Used for debugging and validation
 */
export function getTankSortOrder(tankName: string): string {
  const parts = parseTankName(tankName);
  return `${parts.prefix}-${parts.number.toString().padStart(3, '0')}`;
}
