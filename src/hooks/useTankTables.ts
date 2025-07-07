import { useState, useEffect, useCallback } from 'react';
import { TankTable, TankGroup, ProductType, TankTableConfiguration, TankTableParseResult } from '../types/tankTable';
import { TankTableStorage } from '../storage/TankTableStorage';
import { parseTankTableFile, validateTankTable } from '../utils/tankTableParser';

const storage = TankTableStorage.getInstance();

interface UseTankTablesReturn {
  // Tank Tables
  tankTables: TankTable[];
  tankGroups: TankGroup[];
  productTypes: ProductType[];
  configuration: TankTableConfiguration | null;
  
  // Loading states
  isLoading: boolean;
  isUploading: boolean;
  
  // Tank Table operations
  uploadTankTable: (file: File) => Promise<TankTableParseResult>;
  saveTankTable: (tankTable: TankTable) => void;
  deleteTankTable: (id: string) => void;
  getTankTable: (id: string) => TankTable | null;
  
  // Tank Group operations
  saveTankGroup: (group: TankGroup) => void;
  deleteTankGroup: (id: string) => void;
  assignTankToGroup: (tankId: string, groupId: string) => void;
  
  // Product Type operations
  saveProductType: (productType: ProductType) => void;
  deleteProductType: (id: string) => void;
  
  // Configuration operations
  saveConfiguration: (config: TankTableConfiguration) => void;
  resetConfiguration: () => void;
  
  // Utility operations
  exportData: () => string;
  importData: (jsonData: string) => boolean;
  initializeDefaults: () => void;
  
  // Validation
  validateTankTableData: (tankTable: TankTable) => { valid: boolean; errors: string[]; warnings: string[] };
}

export function useTankTables(): UseTankTablesReturn {
  const [tankTables, setTankTables] = useState<TankTable[]>([]);
  const [tankGroups, setTankGroups] = useState<TankGroup[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [configuration, setConfiguration] = useState<TankTableConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const tables = storage.getTankTables();
      const groups = storage.getTankGroups();
      const types = storage.getProductTypes();
      const config = storage.getTankTableConfiguration();
      
      setTankTables(tables);
      setTankGroups(groups);
      setProductTypes(types);
      setConfiguration(config);
      
      // Initialize defaults if no data exists
      if (types.length === 0) {
        storage.initializeDefaults();
        setProductTypes(storage.getProductTypes());
      }
      
      // Initialize ASTM tables if not present
      const astmTables = storage.getASTMTables();
      if (astmTables.length === 0) {
        // Use dynamic import to avoid circular dependency
        import('../utils/astm54b').then(({ STANDARD_ASTM_TABLES }) => {
          STANDARD_ASTM_TABLES.forEach(table => storage.saveASTMTable(table));
        }).catch(error => {
          console.error('Failed to load ASTM tables:', error);
        });
      }
      
    } catch (error) {
      console.error('Failed to load tank table data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Tank Table operations
  const uploadTankTable = useCallback(async (file: File): Promise<TankTableParseResult> => {
    setIsUploading(true);
    try {
      const result = await parseTankTableFile(file);
      
      if (result.success && result.tankTable) {
        // Auto-save successful parse results
        storage.saveTankTable(result.tankTable);
        setTankTables(storage.getTankTables());
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        errors: [`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        detectedFormat: 'unknown',
        autoMappingApplied: false
      };
    } finally {
      setIsUploading(false);
    }
  }, []);

  const saveTankTable = useCallback((tankTable: TankTable) => {
    storage.saveTankTable(tankTable);
    setTankTables(storage.getTankTables());
  }, []);

  const deleteTankTable = useCallback((id: string) => {
    storage.deleteTankTable(id);
    setTankTables(storage.getTankTables());
  }, []);

  const getTankTable = useCallback((id: string): TankTable | null => {
    return storage.getTankTable(id);
  }, []);

  // Tank Group operations
  const saveTankGroup = useCallback((group: TankGroup) => {
    storage.saveTankGroup(group);
    setTankGroups(storage.getTankGroups());
  }, []);

  const deleteTankGroup = useCallback((id: string) => {
    storage.deleteTankGroup(id);
    setTankGroups(storage.getTankGroups());
  }, []);

  const assignTankToGroup = useCallback((tankId: string, groupId: string) => {
    const group = storage.getTankGroup(groupId);
    if (group) {
      // Remove tank from other groups
      const allGroups = storage.getTankGroups();
      allGroups.forEach(g => {
        if (g.id !== groupId && g.tanks.includes(tankId)) {
          g.tanks = g.tanks.filter(id => id !== tankId);
          storage.saveTankGroup(g);
        }
      });
      
      // Add tank to new group
      if (!group.tanks.includes(tankId)) {
        group.tanks.push(tankId);
        storage.saveTankGroup(group);
      }
      
      setTankGroups(storage.getTankGroups());
    }
  }, []);

  // Product Type operations
  const saveProductType = useCallback((productType: ProductType) => {
    storage.saveProductType(productType);
    setProductTypes(storage.getProductTypes());
  }, []);

  const deleteProductType = useCallback((id: string) => {
    storage.deleteProductType(id);
    setProductTypes(storage.getProductTypes());
  }, []);

  // Configuration operations
  const saveConfiguration = useCallback((config: TankTableConfiguration) => {
    storage.saveTankTableConfiguration(config);
    setConfiguration(storage.getTankTableConfiguration());
  }, []);

  const resetConfiguration = useCallback(() => {
    storage.clearAllTankTableData();
    loadData();
  }, [loadData]);

  // Utility operations
  const exportData = useCallback((): string => {
    return storage.exportTankTableData();
  }, []);

  const importData = useCallback((jsonData: string): boolean => {
    const success = storage.importTankTableData(jsonData);
    if (success) {
      loadData();
    }
    return success;
  }, [loadData]);

  const initializeDefaults = useCallback(() => {
    storage.initializeDefaults();
    loadData();
  }, [loadData]);

  const validateTankTableData = useCallback((tankTable: TankTable) => {
    return validateTankTable(tankTable);
  }, []);

  return {
    // Data
    tankTables,
    tankGroups,
    productTypes,
    configuration,
    
    // Loading states
    isLoading,
    isUploading,
    
    // Tank Table operations
    uploadTankTable,
    saveTankTable,
    deleteTankTable,
    getTankTable,
    
    // Tank Group operations
    saveTankGroup,
    deleteTankGroup,
    assignTankToGroup,
    
    // Product Type operations
    saveProductType,
    deleteProductType,
    
    // Configuration operations
    saveConfiguration,
    resetConfiguration,
    
    // Utility operations
    exportData,
    importData,
    initializeDefaults,
    validateTankTableData
  };
}
