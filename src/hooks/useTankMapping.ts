import { useState, useEffect, useCallback } from 'react';
import { TankMapping, TankMappingConfiguration, AutoMappingSuggestion, MappingValidationResult } from '../types/tankTable';
import { Tank } from '../types/tank';
import { TankMappingStorage } from '../storage/TankMappingStorage';
import { generateAutoMappingSuggestions, createMappingsFromSuggestions, getTankTableForDataSourceTank } from '../utils/tankMappingUtils';
import { useTankTables } from './useTankTables';

const mappingStorage = TankMappingStorage.getInstance();

interface UseTankMappingReturn {
  // Mapping data
  mappings: TankMapping[];
  mappingConfiguration: TankMappingConfiguration | null;
  
  // Loading states
  isLoading: boolean;
  isGeneratingSuggestions: boolean;
  
  // Mapping operations
  saveMapping: (mapping: TankMapping) => void;
  deleteMapping: (id: string) => void;
  saveMappings: (mappings: TankMapping[]) => void;
  
  // Auto-mapping
  generateSuggestions: (dataSourceTanks: Tank[]) => Promise<AutoMappingSuggestion[]>;
  applyAutoMapping: (suggestions: AutoMappingSuggestion[], confidenceThreshold?: number) => void;
  
  // Configuration
  saveMappingConfiguration: (config: TankMappingConfiguration) => void;
  
  // Validation
  validateMappings: (dataSourceTanks: Tank[]) => MappingValidationResult;
  
  // Utility functions
  getTankTableForTank: (dataSourceTankId: string) => string | null;
  getMappingStats: () => {
    totalMappings: number;
    autoMappings: number;
    manualMappings: number;
    averageConfidence: number;
    lastUpdated: Date | null;
  };
  
  // Export/Import
  exportMappingData: () => string;
  importMappingData: (jsonData: string) => boolean;
  
  // Reset
  clearAllMappings: () => void;
}

export function useTankMapping(): UseTankMappingReturn {
  const { tankTables } = useTankTables();
  const [mappings, setMappings] = useState<TankMapping[]>([]);
  const [mappingConfiguration, setMappingConfiguration] = useState<TankMappingConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // Load mappings and configuration on mount
  useEffect(() => {
    loadMappingData();
  }, [loadMappingData]);

  const loadMappingData = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedMappings = mappingStorage.getTankMappings();
      const loadedConfig = mappingStorage.getMappingConfiguration();
      
      setMappings(loadedMappings);
      setMappingConfiguration(loadedConfig);
    } catch (error) {
      console.error('Failed to load mapping data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save individual mapping
  const saveMapping = useCallback((mapping: TankMapping) => {
    mappingStorage.saveTankMapping(mapping);
    setMappings(mappingStorage.getTankMappings());
  }, []);

  // Delete mapping
  const deleteMapping = useCallback((id: string) => {
    mappingStorage.deleteTankMapping(id);
    setMappings(mappingStorage.getTankMappings());
  }, []);

  // Save multiple mappings
  const saveMappings = useCallback((newMappings: TankMapping[]) => {
    mappingStorage.saveTankMappings(newMappings);
    setMappings(newMappings);
  }, []);

  // Generate auto-mapping suggestions
  const generateSuggestions = useCallback(async (dataSourceTanks: Tank[]): Promise<AutoMappingSuggestion[]> => {
    setIsGeneratingSuggestions(true);
    try {
      const suggestions = generateAutoMappingSuggestions(dataSourceTanks, tankTables);
      return suggestions;
    } catch (error) {
      console.error('Failed to generate mapping suggestions:', error);
      return [];
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [tankTables]);

  // Apply auto-mapping suggestions
  const applyAutoMapping = useCallback((suggestions: AutoMappingSuggestion[], confidenceThreshold: number = 0.7) => {
    const autoMappings = createMappingsFromSuggestions(suggestions, confidenceThreshold);
    
    // Merge with existing mappings
    const updatedMappings = [...mappings];
    
    autoMappings.forEach(newMapping => {
      const existingIndex = updatedMappings.findIndex(
        m => m.dataSourceTankId === newMapping.dataSourceTankId
      );
      
      if (existingIndex >= 0) {
        updatedMappings[existingIndex] = newMapping;
      } else {
        updatedMappings.push(newMapping);
      }
    });
    
    saveMappings(updatedMappings);
  }, [mappings, saveMappings]);

  // Save mapping configuration
  const saveMappingConfiguration = useCallback((config: TankMappingConfiguration) => {
    mappingStorage.saveMappingConfiguration(config);
    setMappingConfiguration(config);
  }, []);

  // Validate mappings
  const validateMappings = useCallback((dataSourceTanks: Tank[]): MappingValidationResult => {
    const tankTableIds = tankTables.map(t => t.id);
    const dataSourceTankIds = dataSourceTanks.map(t => t.id.toString());
    
    return mappingStorage.validateMappings(mappings, tankTableIds, dataSourceTankIds);
  }, [mappings, tankTables]);

  // Get tank table ID for a data source tank
  const getTankTableForTank = useCallback((dataSourceTankId: string): string | null => {
    const tankTable = getTankTableForDataSourceTank(dataSourceTankId, mappings, tankTables);
    return tankTable?.id || null;
  }, [mappings, tankTables]);

  // Get mapping statistics
  const getMappingStats = useCallback(() => {
    return mappingStorage.getMappingStats();
  }, []);

  // Export mapping data
  const exportMappingData = useCallback((): string => {
    return mappingStorage.exportMappingData();
  }, []);

  // Import mapping data
  const importMappingData = useCallback((jsonData: string): boolean => {
    const success = mappingStorage.importMappingData(jsonData);
    if (success) {
      loadMappingData();
    }
    return success;
  }, [loadMappingData]);

  // Clear all mappings
  const clearAllMappings = useCallback(() => {
    mappingStorage.clearAllMappings();
    setMappings([]);
    setMappingConfiguration(null);
  }, []);

  return {
    // Mapping data
    mappings,
    mappingConfiguration,
    
    // Loading states
    isLoading,
    isGeneratingSuggestions,
    
    // Mapping operations
    saveMapping,
    deleteMapping,
    saveMappings,
    
    // Auto-mapping
    generateSuggestions,
    applyAutoMapping,
    
    // Configuration
    saveMappingConfiguration,
    
    // Validation
    validateMappings,
    
    // Utility functions
    getTankTableForTank,
    getMappingStats,
    
    // Export/Import
    exportMappingData,
    importMappingData,
    
    // Reset
    clearAllMappings
  };
}
