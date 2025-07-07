import React, { useState, useEffect } from 'react';
import { SortableTankGrid } from './components/SortableTankGrid';
import { ControlsSidebar } from './components/ControlsSidebar';
import { VesselConfigurationWizard } from './components/wizard/VesselConfigurationWizard';
import { TankTableSetupWizard } from './components/TankTableSetupWizard';
import { OperationsDashboard } from './components/OperationsDashboard';
import { CollapsibleHeader } from './components/CollapsibleHeader';
import { useTankData } from './hooks/useTankData';
import { useDatabaseTankConfiguration } from './hooks/useDatabaseTankConfiguration';
import { useDatabaseVesselConfiguration } from './hooks/useDatabaseVesselConfiguration';
import { useDefaultLayout } from './hooks/useDefaultLayout';
import { useAppBranding } from './hooks/useAppBranding';
import { useTankTables } from './hooks/useTankTables';
import { ViewMode } from './types/tank';

function App() {
  const tankData = useTankData();
  const { defaultLayout, saveDefaultLayout } = useDefaultLayout();
  const { branding } = useAppBranding();
  const { configuration } = useTankTables();
  const [viewMode, setViewMode] = useState<ViewMode>(defaultLayout);
  const [showWizard, setShowWizard] = useState(false);
  const [showTankTableWizard, setShowTankTableWizard] = useState(false);
  const {
    configuredTanks,
    reorderTanks,
    renameTank,
    exportConfig,
    importConfig,
    resetConfiguration,
    migrateFromLocalStorage: migrateTankConfig,
  } = useDatabaseTankConfiguration(tankData.tanks);
  const {
    setActiveVessel,
    migrateFromLocalStorage: migrateVesselConfig,
  } = useDatabaseVesselConfiguration();

  // Auto-migrate from localStorage on first load
  React.useEffect(() => {
    const hasRunMigration = localStorage.getItem('database-migration-completed');
    if (!hasRunMigration) {
      console.log('Running one-time migration from localStorage to SQLite...');
      migrateTankConfig();
      migrateVesselConfig();
      localStorage.setItem('database-migration-completed', 'true');
    }
  }, [migrateTankConfig, migrateVesselConfig]);

  // Update viewMode when defaultLayout changes
  useEffect(() => {
    setViewMode(defaultLayout);
  }, [defaultLayout]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Collapsible Header */}
        <CollapsibleHeader
          appName={branding.appName}
          appSlogan={branding.appSlogan}
          logoUrl={branding.logoUrl}
          primaryColor={branding.primaryColor}
          connectionStatus={tankData.connectionStatus}
          lastSync={tankData.lastSync}
          tanks={configuredTanks}
          onVesselSetup={() => setShowWizard(true)}
        />

        {/* Tank Table Setup Prompt */}
        {!configuration && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-900">Enhanced Tank Monitoring Available</h3>
                <p className="text-blue-700 mt-1">
                  Set up tank tables for volume, mass calculations, and flow rate monitoring.
                </p>
              </div>
              <button
                onClick={() => setShowTankTableWizard(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Setup Tank Tables
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Statistics */}
        {configuration && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-600">Total Volume</h3>
              <p className="text-2xl font-bold text-blue-600">{tankData.totalVolume.toFixed(1)} m³</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-600">Total Mass</h3>
              <p className="text-2xl font-bold text-green-600">{tankData.totalMass.toFixed(1)} t</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-600">Average Utilization</h3>
              <p className="text-2xl font-bold text-purple-600">{tankData.averageUtilization.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-600">Active Operations</h3>
              <p className="text-2xl font-bold text-orange-600">{tankData.activeTanks}</p>
            </div>
          </div>
        )}



        {/* Operations Dashboard */}
        {configuration && (
          <div className="mb-8">
            <OperationsDashboard
              tanks={configuredTanks}
              configuration={configuration}
              totalVolume={tankData.totalVolume}
              totalMass={tankData.totalMass}
              activeTanks={tankData.activeTanks}
            />
          </div>
        )}

        {/* Dashboard Layout */}
        <div className="mb-8">
          <SortableTankGrid
            tanks={configuredTanks}
            viewMode={viewMode}
            onReorder={reorderTanks}
            onRename={renameTank}
            showEnhancedData={!!configuration}
          />
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-center space-x-4 mb-2">
              <div className={`w-3 h-3 rounded-full ${
                tankData.connectionStatus === 'connected' ? 'bg-green-500' : 
                tankData.connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`}></div>
              <span className="font-medium">
                {tankData.connectionStatus === 'connected' ? 'Connected to Data Source' :
                 tankData.connectionStatus === 'error' ? 'Data Source Error' :
                 'No Data Source Connected'}
              </span>
            </div>
            <p className="mb-2">
              <strong>Bridge Service:</strong> Node.js service running on port 3001 with WebSocket on 3002
            </p>
            <div className="text-left max-w-3xl mx-auto space-y-1">
              <p>• <strong>Settings:</strong> <a href="http://localhost:3001/settings" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Configure COM ports and data format</a></p>
              <p>• <strong>Supported formats:</strong> CSV (123.4,234.5,...) or JSON ({`{"tanks":[{"id":1,"level":123.4},...]})`})</p>
              <p>• <strong>Auto-discovery:</strong> Automatically detects available COM ports</p>
              <p>• <strong>Real-time:</strong> WebSocket connection for live data updates</p>
            </div>
          </div>
        </footer>

        {/* Controls Sidebar */}
        <ControlsSidebar
          currentView={viewMode}
          onViewChange={setViewMode}
          defaultLayout={defaultLayout}
          onDefaultLayoutChange={saveDefaultLayout}
          onExport={exportConfig}
          onImport={importConfig}
          onReset={resetConfiguration}
          onMigrate={() => {
            migrateTankConfig();
            migrateVesselConfig();
          }}
        />

        {/* Vessel Configuration Wizard */}
        {showWizard && (
          <VesselConfigurationWizard
            tanks={configuredTanks}
            onComplete={(vesselId) => {
              setActiveVessel(vesselId);
              setShowWizard(false);
            }}
            onCancel={() => setShowWizard(false)}
          />
        )}

        {/* Tank Table Setup Wizard */}
        {showTankTableWizard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-auto">
              <TankTableSetupWizard
                onComplete={(config) => {
                  console.log('Tank table configuration completed:', config);
                  setShowTankTableWizard(false);
                }}
                onClose={() => setShowTankTableWizard(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;