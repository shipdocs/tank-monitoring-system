import React, { useState, useEffect } from 'react';
import { Settings, Unlink, Save, AlertCircle } from 'lucide-react';
import { TankMapping } from '../types/tankTable';
import { TankTableStorage } from '../storage/TankTableStorage';
import { EnhancedTankDataService } from '../services/EnhancedTankDataService';

interface TankMappingConfigProps {
  dataSourceCount: number;
  onMappingsChange?: (mappings: TankMapping[]) => void;
  onClose?: () => void;
}

export const TankMappingConfig: React.FC<TankMappingConfigProps> = ({
  dataSourceCount,
  onMappingsChange,
  onClose
}) => {
  const [mappings, setMappings] = useState<TankMapping[]>([]);
  const [activeTankTableId, setActiveTankTableId] = useState<string>('');
  const [tankTables, setTankTables] = useState<{ id: string; name: string; tanks: Array<{ tank_id: string; tank_name: string; tank_type: string }> }[]>([]);
  const [availableTanks, setAvailableTanks] = useState<{ tank_id: string; tank_name: string; tank_type: string }[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const storage = TankTableStorage.getInstance();
  const dataService = new EnhancedTankDataService();

  const loadData = React.useCallback(() => {
    // Load tank tables
    const tables = storage.getTankTables();
    setTankTables(tables);

    // Load current configuration
    const config = storage.getTankTableConfiguration();
    setMappings(config.tank_mappings);
    setActiveTankTableId(config.active_tank_table_id || '');

    // Load available tanks from active table
    if (config.active_tank_table_id) {
      const activeTable = storage.getTankTable(config.active_tank_table_id);
      setAvailableTanks(activeTable?.tanks || []);
    }
  }, [storage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTankTableChange = (tableId: string) => {
    setActiveTankTableId(tableId);
    
    if (tableId) {
      const table = storage.getTankTable(tableId);
      setAvailableTanks(table?.tanks || []);
      
      // Create default mappings
      const defaultMappings = dataService.createDefaultMappings(tableId);
      setMappings(defaultMappings.slice(0, dataSourceCount));
    } else {
      setAvailableTanks([]);
      setMappings([]);
    }
    
    setHasChanges(true);
  };

  const updateMapping = (index: number, field: keyof TankMapping, value: string | boolean) => {
    const newMappings = [...mappings];
    if (!newMappings[index]) {
      newMappings[index] = {
        data_source_index: index,
        tank_table_id: '',
        enabled: false
      };
    }
    
    newMappings[index] = {
      ...newMappings[index],
      [field]: value
    };
    
    setMappings(newMappings);
    setHasChanges(true);
  };

  const addMapping = () => {
    const newMapping: TankMapping = {
      data_source_index: mappings.length,
      tank_table_id: '',
      enabled: false
    };
    setMappings([...mappings, newMapping]);
    setHasChanges(true);
  };

  const removeMapping = (index: number) => {
    const newMappings = mappings.filter((_, i) => i !== index);
    setMappings(newMappings);
    setHasChanges(true);
  };

  const saveMappings = () => {
    dataService.saveTankMappings(mappings, activeTankTableId);
    setHasChanges(false);
    
    if (onMappingsChange) {
      onMappingsChange(mappings);
    }
  };

  const getUsedTankIds = () => {
    return new Set(mappings.filter(m => m.enabled).map(m => m.tank_table_id));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Settings className="w-6 h-6 mr-2" />
                Tank Mapping Configuration
              </h2>
              <p className="text-gray-600 mt-1">
                Map data source readings to tank table entries
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            )}
          </div>

          {/* Tank Table Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Active Tank Table
            </label>
            <select
              value={activeTankTableId}
              onChange={(e) => handleTankTableChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a tank table...</option>
              {tankTables.map(table => (
                <option key={table.id} value={table.id}>
                  {table.name} ({table.tanks.length} tanks)
                </option>
              ))}
            </select>
          </div>

          {/* Info Box */}
          {activeTankTableId && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900">
                    Data Source: {dataSourceCount} readings available
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Map each data source reading to a tank from your tank table
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mappings Table */}
          {activeTankTableId && availableTanks.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Tank Mappings</h3>
                <button
                  onClick={addMapping}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Add Mapping
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-left">Data Source</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Tank</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Custom Name</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Enabled</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.max(dataSourceCount, mappings.length) }, (_, index) => {
                      const mapping = mappings[index];
                      const usedTankIds = getUsedTankIds();
                      
                      return (
                        <tr key={index} className={mapping?.enabled ? 'bg-green-50' : ''}>
                          <td className="border border-gray-300 px-3 py-2">
                            <span className="font-medium">Source {index + 1}</span>
                          </td>
                          <td className="border border-gray-300 px-3 py-2">
                            <select
                              value={mapping?.tank_table_id || ''}
                              onChange={(e) => updateMapping(index, 'tank_table_id', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="">Select tank...</option>
                              {availableTanks.map(tank => (
                                <option 
                                  key={tank.tank_id} 
                                  value={tank.tank_id}
                                  disabled={usedTankIds.has(tank.tank_id) && mapping?.tank_table_id !== tank.tank_id}
                                >
                                  {tank.tank_name} ({tank.tank_type})
                                  {usedTankIds.has(tank.tank_id) && mapping?.tank_table_id !== tank.tank_id ? ' (Used)' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="border border-gray-300 px-3 py-2">
                            <input
                              type="text"
                              value={mapping?.custom_name || ''}
                              onChange={(e) => updateMapping(index, 'custom_name', e.target.value)}
                              placeholder="Optional custom name"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={mapping?.enabled || false}
                              onChange={(e) => updateMapping(index, 'enabled', e.target.checked)}
                              className="w-4 h-4 text-blue-600"
                            />
                          </td>
                          <td className="border border-gray-300 px-3 py-2">
                            {mapping && (
                              <button
                                onClick={() => removeMapping(index)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                              >
                                <Unlink className="w-4 h-4" />
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
          )}

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {hasChanges && (
                <span className="text-orange-600">You have unsaved changes</span>
              )}
            </div>
            <div className="flex space-x-3">
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={saveMappings}
                disabled={!hasChanges}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Mappings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
