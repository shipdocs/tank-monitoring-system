import React, { useEffect, useState } from 'react';
import { SortableTankGrid } from './components/SortableTankGrid';
import { ControlsSidebar } from './components/ControlsSidebar';
import { VesselConfigurationWizard } from './components/wizard/VesselConfigurationWizard';
import { CollapsibleHeader } from './components/CollapsibleHeader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AccessibilityProvider } from './components/AccessibilityProvider';
import { TankDataProvider } from './components/TankDataProvider';
import { SkipNavigation } from './components/SkipNavigation';
import { useTankDataContext } from './components/TankDataProvider';
import { useDatabaseTankConfiguration } from './hooks/useDatabaseTankConfiguration';
import { useDatabaseVesselConfiguration } from './hooks/useDatabaseVesselConfiguration';
import { useDefaultLayout } from './hooks/useDefaultLayout';
import { useAppBranding } from './hooks/useAppBranding';
import { type ViewMode } from './types/tank';
import authService from './utils/auth';

function App() {
  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const isValid = await authService.verifyToken();
      if (!isValid) {
        window.location.href = '/login';
      }
    };
    checkAuth();
  }, []);

  const tankData = useTankData();
  const { defaultLayout, saveDefaultLayout } = useDefaultLayout();
  const { branding } = useAppBranding();
  const [viewMode, setViewMode] = useState<ViewMode>(defaultLayout);
  const [showWizard, setShowWizard] = useState(false);
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
    <AccessibilityProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <SkipNavigation />
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


          {/* Dashboard Layout */}
          <main id="main-content" className="mb-8" role="main" aria-label="Tank monitoring dashboard">
            <ErrorBoundary
              componentName="TankGrid"
              isolate={true}
              onError={(error, errorInfo) => {
                console.error('Tank grid error:', error);
              }}
            >
              <SortableTankGrid
                tanks={configuredTanks}
                viewMode={viewMode}
                onReorder={reorderTanks}
                onRename={renameTank}
              />
            </ErrorBoundary>
          </main>

          {/* Footer */}
          <footer className="text-center text-gray-500 text-sm" role="contentinfo" aria-label="System information">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-center space-x-4 mb-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    tankData.connectionStatus === 'connected' ? 'bg-green-500' :
                      tankData.connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                  }`}
                  role="status"
                  aria-label={`Connection status: ${
                    tankData.connectionStatus === 'connected' ? 'Connected to Data Source' :
                      tankData.connectionStatus === 'error' ? 'Data Source Error' :
                        'No Data Source Connected'
                  }`}
                ></div>
                <span className="font-medium" aria-hidden="true">
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
                <p>• <strong>Supported formats:</strong> CSV (123.4,234.5,...) or JSON ({'{"tanks":[{"id":1,"level":123.4},...]})'})</p>
                <p>• <strong>Auto-discovery:</strong> Automatically detects available COM ports</p>
                <p>• <strong>Real-time:</strong> WebSocket connection for live data updates</p>
              </div>
            </div>
          </footer>

          {/* Controls Sidebar */}
          <ErrorBoundary
            componentName="ControlsSidebar"
            isolate={true}
            onError={(error, errorInfo) => {
              console.error('Controls sidebar error:', error);
            }}
          >
            <div id="controls-sidebar">
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
            </div>
          </ErrorBoundary>

          {/* Vessel Configuration Wizard */}
          {showWizard && (
            <ErrorBoundary
              componentName="VesselConfigurationWizard"
              isolate={true}
              onError={(error, errorInfo) => {
                console.error('Vessel configuration wizard error:', error);
                setShowWizard(false);
              }}
            >
              <VesselConfigurationWizard
                tanks={configuredTanks}
                onComplete={(vesselId) => {
                  setActiveVessel(vesselId);
                  setShowWizard(false);
                }}
                onCancel={() => setShowWizard(false)}
              />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </AccessibilityProvider>
  );
}

export default App;
