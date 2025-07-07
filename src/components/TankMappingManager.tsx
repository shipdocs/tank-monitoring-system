import React, { useState, useCallback, useEffect } from 'react';
import { Link, RefreshCw, CheckCircle, AlertTriangle, X, Zap, Eye } from 'lucide-react';
import { Tank } from '../types/tank';
import { TankMapping, TankTable, AutoMappingSuggestion } from '../types/tankTable';
import { useTankTables } from '../hooks/useTankTables';
import { TankMappingStorage } from '../storage/TankMappingStorage';
import { generateAutoMappingSuggestions, createMappingsFromSuggestions } from '../utils/tankMappingUtils';

interface TankMappingManagerProps {
  dataSourceTanks: Tank[];
  onMappingComplete?: (mappings: TankMapping[]) => void;
  onClose?: () => void;
  className?: string;
}

const mappingStorage = TankMappingStorage.getInstance();

export const TankMappingManager: React.FC<TankMappingManagerProps> = ({
  dataSourceTanks,
  onMappingComplete,
  onClose,
  className = ''
}) => {
  const { tankTables } = useTankTables();
  const [mappings, setMappings] = useState<TankMapping[]>([]);
  const [suggestions, setSuggestions] = useState<AutoMappingSuggestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load existing mappings on mount
  useEffect(() => {
    const existingMappings = mappingStorage.getTankMappings();
    setMappings(existingMappings);
  }, []);

  // Generate auto-mapping suggestions
  const generateSuggestions = useCallback(async () => {
    setIsGeneratingSuggestions(true);
    try {
      const autoSuggestions = generateAutoMappingSuggestions(dataSourceTanks, tankTables);
      setSuggestions(autoSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [dataSourceTanks, tankTables]);

  // Apply auto-mapping suggestions
  const applyAutoMapping = useCallback((confidenceThreshold: number = 0.7) => {
    const autoMappings = createMappingsFromSuggestions(suggestions, confidenceThreshold);
    
    // Merge with existing mappings, replacing any existing mappings for the same data source tanks
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
    
    setMappings(updatedMappings);
    mappingStorage.saveTankMappings(updatedMappings);
  }, [suggestions, mappings]);

  // Manual mapping assignment
  const assignMapping = useCallback((dataSourceTankId: string, tankTableId: string) => {
    const dataSourceTank = dataSourceTanks.find(t => t.id.toString() === dataSourceTankId);
    const tankTable = tankTables.find(t => t.id === tankTableId);
    
    if (!dataSourceTank || !tankTable) return;

    const newMapping: TankMapping = {
      id: `mapping-${dataSourceTankId}-${Date.now()}`,
      dataSourceTankId,
      dataSourceTankName: dataSourceTank.name,
      tankTableId,
      confidence: 1.0, // Manual mappings have full confidence
      isAutoMapped: false,
      lastVerified: new Date(),
      notes: 'Manually assigned'
    };

    const updatedMappings = mappings.filter(m => m.dataSourceTankId !== dataSourceTankId);
    updatedMappings.push(newMapping);
    
    setMappings(updatedMappings);
    mappingStorage.saveTankMappings(updatedMappings);
  }, [dataSourceTanks, tankTables, mappings]);

  // Remove mapping
  const removeMapping = useCallback((dataSourceTankId: string) => {
    const updatedMappings = mappings.filter(m => m.dataSourceTankId !== dataSourceTankId);
    setMappings(updatedMappings);
    mappingStorage.saveTankMappings(updatedMappings);
  }, [mappings]);

  // Complete mapping process
  const completeMappingProcess = useCallback(() => {
    mappingStorage.saveTankMappings(mappings);
    
    if (onMappingComplete) {
      onMappingComplete(mappings);
    }
  }, [mappings, onMappingComplete]);

  // Get mapping status
  const getMappingStatus = () => {
    const totalTanks = dataSourceTanks.length;
    const mappedTanks = mappings.length;
    const unmappedTanks = totalTanks - mappedTanks;
    const autoMappedTanks = mappings.filter(m => m.isAutoMapped).length;
    
    return { totalTanks, mappedTanks, unmappedTanks, autoMappedTanks };
  };

  const status = getMappingStatus();

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Link className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Tank Data Source Mapping</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">{status.totalTanks}</div>
            <div className="text-sm text-blue-700">Total Tanks</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-900">{status.mappedTanks}</div>
            <div className="text-sm text-green-700">Mapped</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-900">{status.unmappedTanks}</div>
            <div className="text-sm text-orange-700">Unmapped</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-900">{status.autoMappedTanks}</div>
            <div className="text-sm text-purple-700">Auto-mapped</div>
          </div>
        </div>

        {/* Auto-mapping Controls */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={generateSuggestions}
            disabled={isGeneratingSuggestions}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Zap className="w-4 h-4" />
            <span>{isGeneratingSuggestions ? 'Generating...' : 'Generate Auto-mapping'}</span>
          </button>
          
          {suggestions.length > 0 && (
            <>
              <button
                onClick={() => applyAutoMapping(0.7)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Apply High Confidence ({suggestions.filter(s => s.confidence >= 0.7).length})</span>
              </button>
              
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>{showSuggestions ? 'Hide' : 'Show'} Suggestions</span>
              </button>
            </>
          )}
        </div>

        {/* Suggestions Panel */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Auto-mapping Suggestions</h3>
            <div className="space-y-2">
              {suggestions.map(suggestion => (
                <div key={suggestion.dataSourceTankId} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {suggestion.dataSourceTankName} → {suggestion.suggestedTankTableName}
                    </div>
                    <div className="text-sm text-gray-600">
                      Confidence: {(suggestion.confidence * 100).toFixed(0)}% - {suggestion.reason}
                    </div>
                  </div>
                  <button
                    onClick={() => assignMapping(suggestion.dataSourceTankId, suggestion.suggestedTankTableId)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tank Mapping Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Tank Mappings</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Source Tank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tank Table
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dataSourceTanks.map(tank => {
                  const mapping = mappings.find(m => m.dataSourceTankId === tank.id.toString());
                  const tankTable = mapping ? tankTables.find(t => t.id === mapping.tankTableId) : null;
                  
                  return (
                    <tr key={tank.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{tank.name}</div>
                        <div className="text-sm text-gray-500">ID: {tank.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {mapping && tankTable ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {tankTable.tankName || tankTable.sourceFile}
                            </div>
                            <div className="text-sm text-gray-500">
                              Max: {tankTable.maxLevel}{tankTable.unit}
                            </div>
                          </div>
                        ) : (
                          <select
                            value=""
                            onChange={(e) => assignMapping(tank.id.toString(), e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Select tank table...</option>
                            {tankTables.map(table => (
                              <option key={table.id} value={table.id}>
                                {table.tankName || table.sourceFile}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {mapping && (
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              mapping.confidence >= 0.8 ? 'bg-green-500' :
                              mapping.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            <span className="text-sm text-gray-900">
                              {(mapping.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {mapping ? (
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                            <span className="text-sm text-green-700">
                              {mapping.isAutoMapped ? 'Auto-mapped' : 'Manual'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <AlertTriangle className="w-4 h-4 text-orange-500 mr-1" />
                            <span className="text-sm text-orange-700">Unmapped</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {mapping && (
                          <button
                            onClick={() => removeMapping(tank.id.toString())}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {status.mappedTanks} of {status.totalTanks} tanks mapped
          </div>
          
          <div className="flex space-x-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={completeMappingProcess}
              disabled={status.unmappedTanks > 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Complete Mapping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
