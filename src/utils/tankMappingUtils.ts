import { TankMapping, TankTable, AutoMappingSuggestion } from '../types/tankTable';
import { Tank } from '../types/tank';

/**
 * Generate auto-mapping suggestions based on tank names and IDs
 */
export function generateAutoMappingSuggestions(
  dataSourceTanks: Tank[],
  tankTables: TankTable[]
): AutoMappingSuggestion[] {
  const suggestions: AutoMappingSuggestion[] = [];

  dataSourceTanks.forEach(tank => {
    const tankSuggestions = findBestTankTableMatches(tank, tankTables);
    
    if (tankSuggestions.length > 0) {
      const bestMatch = tankSuggestions[0];
      const alternatives = tankSuggestions.slice(1, 4); // Top 3 alternatives

      suggestions.push({
        dataSourceTankId: tank.id.toString(),
        dataSourceTankName: tank.name,
        suggestedTankTableId: bestMatch.tankTableId,
        suggestedTankTableName: bestMatch.tankTableName,
        confidence: bestMatch.confidence,
        reason: bestMatch.reason,
        alternatives
      });
    }
  });

  return suggestions;
}

/**
 * Find best tank table matches for a given tank
 */
function findBestTankTableMatches(
  tank: Tank,
  tankTables: TankTable[]
): Array<{
  tankTableId: string;
  tankTableName: string;
  confidence: number;
  reason: string;
}> {
  const matches: Array<{
    tankTableId: string;
    tankTableName: string;
    confidence: number;
    reason: string;
  }> = [];

  tankTables.forEach(table => {
    const match = calculateMatchScore(tank, table);
    if (match.confidence > 0.1) { // Only include matches with some confidence
      matches.push(match);
    }
  });

  // Sort by confidence (highest first)
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate match score between a tank and tank table
 */
function calculateMatchScore(
  tank: Tank,
  table: TankTable
): {
  tankTableId: string;
  tankTableName: string;
  confidence: number;
  reason: string;
} {
  let confidence = 0;
  const reasons: string[] = [];

  // Exact ID match (highest confidence)
  if (table.tankId === tank.id.toString()) {
    confidence = 0.95;
    reasons.push('Exact ID match');
  }
  // Exact name match
  else if (table.tankName && table.tankName.toLowerCase() === tank.name.toLowerCase()) {
    confidence = 0.9;
    reasons.push('Exact name match');
  }
  // Partial name match
  else if (table.tankName && tank.name) {
    const nameScore = calculateNameSimilarity(tank.name, table.tankName);
    if (nameScore > 0.7) {
      confidence = nameScore * 0.8;
      reasons.push(`High name similarity (${(nameScore * 100).toFixed(0)}%)`);
    } else if (nameScore > 0.4) {
      confidence = nameScore * 0.6;
      reasons.push(`Partial name similarity (${(nameScore * 100).toFixed(0)}%)`);
    }
  }

  // Boost confidence if tank capacity seems reasonable
  if (confidence > 0 && table.maxLevel > 0) {
    const capacityRatio = tank.maxCapacity / table.maxLevel;
    if (capacityRatio >= 0.8 && capacityRatio <= 1.2) {
      confidence = Math.min(0.98, confidence + 0.1);
      reasons.push('Compatible capacity');
    }
  }

  // Location-based matching (if available)
  if (confidence > 0 && tank.location && table.tankName) {
    if (table.tankName.toLowerCase().includes(tank.location.toLowerCase()) ||
        tank.location.toLowerCase().includes(table.tankName.toLowerCase())) {
      confidence = Math.min(0.98, confidence + 0.05);
      reasons.push('Location match');
    }
  }

  return {
    tankTableId: table.id,
    tankTableName: table.tankName || table.sourceFile,
    confidence,
    reason: reasons.join(', ') || 'Low similarity'
  };
}

/**
 * Calculate name similarity using Levenshtein distance
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase().trim();
  const s2 = name2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // Simple substring matching for common cases
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return shorter / longer;
  }

  // Levenshtein distance calculation
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  return (maxLength - matrix[s2.length][s1.length]) / maxLength;
}

/**
 * Create tank mappings from auto-mapping suggestions
 */
export function createMappingsFromSuggestions(
  suggestions: AutoMappingSuggestion[],
  confidenceThreshold: number = 0.7
): TankMapping[] {
  return suggestions
    .filter(suggestion => suggestion.confidence >= confidenceThreshold)
    .map(suggestion => ({
      id: `mapping-${suggestion.dataSourceTankId}-${Date.now()}`,
      dataSourceTankId: suggestion.dataSourceTankId,
      dataSourceTankName: suggestion.dataSourceTankName,
      tankTableId: suggestion.suggestedTankTableId,
      confidence: suggestion.confidence,
      isAutoMapped: true,
      lastVerified: new Date(),
      notes: `Auto-mapped: ${suggestion.reason}`
    }));
}

/**
 * Validate a single tank mapping
 */
export function validateTankMapping(
  mapping: TankMapping,
  availableTankTables: TankTable[]
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if tank table exists
  const tankTable = availableTankTables.find(t => t.id === mapping.tankTableId);
  if (!tankTable) {
    errors.push(`Tank table ${mapping.tankTableId} not found`);
  }

  // Check confidence level
  if (mapping.confidence < 0.5) {
    warnings.push('Low confidence mapping - consider manual verification');
  }

  // Check if auto-mapped but not recently verified
  if (mapping.isAutoMapped) {
    const daysSinceVerified = (Date.now() - new Date(mapping.lastVerified).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceVerified > 30) {
      warnings.push('Auto-mapping has not been verified in over 30 days');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get tank table for a data source tank using mapping configuration
 */
export function getTankTableForDataSourceTank(
  dataSourceTankId: string,
  mappings: TankMapping[],
  tankTables: TankTable[]
): TankTable | null {
  const mapping = mappings.find(m => m.dataSourceTankId === dataSourceTankId);
  if (!mapping) {
    return null;
  }

  return tankTables.find(t => t.id === mapping.tankTableId) || null;
}

/**
 * Update mapping confidence based on usage and validation
 */
export function updateMappingConfidence(
  mapping: TankMapping,
  validationSuccess: boolean,
  usageCount: number = 0
): TankMapping {
  let newConfidence = mapping.confidence;

  if (validationSuccess) {
    // Increase confidence for successful validations
    newConfidence = Math.min(0.98, newConfidence + 0.05);
  } else {
    // Decrease confidence for failed validations
    newConfidence = Math.max(0.1, newConfidence - 0.1);
  }

  // Slight confidence boost for frequently used mappings
  if (usageCount > 100) {
    newConfidence = Math.min(0.98, newConfidence + 0.02);
  }

  return {
    ...mapping,
    confidence: newConfidence,
    lastVerified: new Date()
  };
}
