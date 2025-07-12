import React, { useState, useEffect } from 'react';
import { SortableTankGrid } from './components/SortableTankGrid';
import { ControlsSidebar } from './components/ControlsSidebar';
import { TotalsDashboard } from './components/TotalsDashboard';
import { ProductService } from './services/ProductService';

import { CollapsibleHeader } from './components/CollapsibleHeader';
import { useTankData } from './hooks/useTankData';
import { useDatabaseTankConfiguration } from './hooks/useDatabaseTankConfiguration';
import { useDatabaseVesselConfiguration } from './hooks/useDatabaseVesselConfiguration';
import { useDefaultLayout } from './hooks/useDefaultLayout';
import { useAppBranding } from './hooks/useAppBranding';
import { ViewMode } from './types/tank';
import { Product } from './types/product';

function App() {
  const { tanks, lastSync, connectionStatus, debugConfiguration } = useTankData();
  const { defaultLayout, saveDefaultLayout } = useDefaultLayout();
  const { branding } = useAppBranding();
  const [viewMode, setViewMode] = useState<ViewMode>(defaultLayout);
  const [products, setProducts] = useState<Product[]>([]);
  const [productService] = useState(() => ProductService.getInstance());

  const {
    configuredTanks,
    reorderTanks,
    renameTank,
    exportConfig,
    importConfig,
    resetConfiguration,
    migrateFromLocalStorage: migrateTankConfig,
  } = useDatabaseTankConfiguration(tanks);
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

  // Load products
  useEffect(() => {
    try {
      const loadedProducts = productService.getProducts();
      setProducts(loadedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, [productService]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Collapsible Header */}
        <CollapsibleHeader
          appName={branding.appName}
          appSlogan={branding.appSlogan}
          logoUrl={branding.logoUrl}
          primaryColor={branding.primaryColor}
          connectionStatus={connectionStatus}
          lastSync={lastSync}
          tanks={configuredTanks}

        />



        {/* Totals Dashboard */}
        <TotalsDashboard
          tanks={configuredTanks}
          products={products}
        />

        {/* Dashboard Layout */}
        <div className="mb-8">
          <SortableTankGrid
            tanks={configuredTanks}
            viewMode={viewMode}
            onReorder={reorderTanks}
            onRename={renameTank}
            products={products}
          />
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-center space-x-4 mb-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`}></div>
              <span className="font-medium">
                {connectionStatus === 'connected' ? 'Connected to Data Source' :
                 connectionStatus === 'error' ? 'Data Source Error' :
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
          onDebug={debugConfiguration}
        />


      </div>
    </div>
  );
}

export default App;