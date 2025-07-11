import React, { useState, useEffect } from 'react';
import { Upload, Settings, Database, FileText, Trash2, Eye, Download } from 'lucide-react';
import { TankTableImport } from './TankTableImport';
import { TankMappingConfig } from './TankMappingConfig';
import { TankTableStorage } from '../storage/TankTableStorage';
import { EnhancedTankDataService } from '../services/EnhancedTankDataService';
import { TankTable, TankTableImportResult } from '../types/tankTable';

export const TankTableManagement: React.FC = () => {
  const [showImport, setShowImport] = useState(false);
  const [showMapping, setShowMapping] = useState(false);
  const [tankTables, setTankTables] = useState<TankTable[]>([]);
  const [activeTankTableId, setActiveTankTableId] = useState<string>('');
  const [tankTableInfo, setTankTableInfo] = useState<any>(null);

  const storage = TankTableStorage.getInstance();
  const dataService = new EnhancedTankDataService();

  useEffect(() => {
    loadTankTables();
    loadTankTableInfo();
  }, []);

  const loadTankTables = () => {
    const tables = storage.getTankTables();
    setTankTables(tables);
    
    const config = storage.getTankTableConfiguration();
    setActiveTankTableId(config.active_tank_table_id || '');
  };

  const loadTankTableInfo = () => {
    const info = dataService.getActiveTankTableInfo();
    setTankTableInfo(info);
  };

  const handleImportComplete = (result: TankTableImportResult) => {
    if (result.success) {
      loadTankTables();
      setShowImport(false);
      
      // Optionally activate the newly imported table
      if (result.tank_table) {
        handleActivateTable(result.tank_table.id);
      }
    }
  };

  const handleActivateTable = (tableId: string) => {
    storage.setActiveTankTable(tableId);
    
    // Create default mappings
    const defaultMappings = dataService.createDefaultMappings(tableId);
    dataService.saveTankMappings(defaultMappings, tableId);
    
    setActiveTankTableId(tableId);
    loadTankTableInfo();
  };

  const handleDeleteTable = (tableId: string) => {
    if (confirm('Are you sure you want to delete this tank table? This action cannot be undone.')) {
      storage.deleteTankTable(tableId);
      loadTankTables();
      loadTankTableInfo();
    }
  };

  const handleExportTable = (tableId: string) => {
    try {
      const exportData = storage.exportTankTable(tableId);
      const table = storage.getTankTable(tableId);
      
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tank-table-${table?.name || tableId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Failed to export tank table: ${error.message}`);
    }
  };

  const handleMappingComplete = () => {
    setShowMapping(false);
    loadTankTableInfo();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Database className="w-6 h-6 mr-2" />
            Tank Table Management
          </h2>
          <p className="text-gray-600 mt-1">
            Import and manage tank calibration tables
          </p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import Tank Table
        </button>
      </div>

      {/* Active Tank Table Status */}
      {tankTableInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900">
                {tankTableInfo.hasActiveTankTable ? '✅ Tank Table Active' : '⚠️ No Active Tank Table'}
              </h3>
              {tankTableInfo.hasActiveTankTable ? (
                <div className="text-blue-700 mt-1">
                  <p><strong>Table:</strong> {tankTableInfo.activeTankTableName}</p>
                  <p><strong>Mappings:</strong> {tankTableInfo.enabledMappingCount} of {tankTableInfo.mappingCount} enabled</p>
                </div>
              ) : (
                <p className="text-blue-700 mt-1">
                  Import a tank table and configure mappings to enable enhanced tank monitoring
                </p>
              )}
            </div>
            {tankTableInfo.hasActiveTankTable && (
              <button
                onClick={() => setShowMapping(true)}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Mappings
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tank Tables List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Available Tank Tables</h3>
        </div>
        
        {tankTables.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No tank tables imported yet</p>
            <p className="text-sm mt-1">Import a CSV file to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tankTables.map(table => (
              <div key={table.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="text-lg font-medium text-gray-900">
                      {table.name}
                      {activeTankTableId === table.id && (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                          Active
                        </span>
                      )}
                    </h4>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    <p>{table.tanks.length} tanks • {table.vessel_name || 'Unknown vessel'}</p>
                    <p>Created: {new Date(table.created_date).toLocaleDateString()}</p>
                    {table.description && <p>{table.description}</p>}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {activeTankTableId !== table.id && (
                    <button
                      onClick={() => handleActivateTable(table.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                    >
                      Activate
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleExportTable(table.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Export tank table"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteTable(table.id)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors"
                    title="Delete tank table"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <TankTableImport
          onImportComplete={handleImportComplete}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Mapping Configuration Modal */}
      {showMapping && (
        <TankMappingConfig
          dataSourceCount={12} // Default to 12 data sources
          onMappingsChange={handleMappingComplete}
          onClose={() => setShowMapping(false)}
        />
      )}
    </div>
  );
};
