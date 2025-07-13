import React, { useState } from 'react';
import { SidebarViewControls } from './SidebarViewControls';
import { DefaultLayoutSettings } from './DefaultLayoutSettings';
import { TankTableManagement } from './TankTableManagement';
import { ProductManagement } from './ProductManagement';
import { DataSourceConfiguration } from './DataSourceConfiguration';
import { ViewMode } from '../types/tank';
import { Settings, X, ChevronRight, Download, Upload, RotateCcw, LayoutDashboard, Database, Package } from 'lucide-react';

interface ControlsSidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  defaultLayout: ViewMode;
  onDefaultLayoutChange: (layout: ViewMode) => void;
  onExport: () => void;
  onImport: (file: File) => Promise<boolean>;
  onReset: () => void;
  onMigrate?: () => void;
  onDebug?: () => void;
}

export const ControlsSidebar: React.FC<ControlsSidebarProps> = ({
  currentView,
  onViewChange,
  defaultLayout,
  onDefaultLayoutChange,
  onExport,
  onImport,
  onReset,
  onMigrate,
  onDebug,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'view' | 'layout' | 'tank-tables' | 'products' | 'config'>('view');

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 z-50 bg-white shadow-lg rounded-lg p-3 border-2 border-gray-200 hover:bg-gray-50 transition-all duration-300 ${
          isOpen ? 'right-[600px]' : 'right-4'
        }`}
        title={isOpen ? 'Hide View Controls' : 'Show View Controls'}
      >
        {isOpen ? (
          <ChevronRight className="w-5 h-5 text-gray-600" />
        ) : (
          <LayoutDashboard className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-[600px] bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <LayoutDashboard className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Controls</h2>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap space-x-1 px-2 py-1">
            {[
              { id: 'view', label: 'View', icon: LayoutDashboard },
              { id: 'tank-tables', label: 'Tank Tables', icon: Database },
              { id: 'products', label: 'Products', icon: Package },
              { id: 'config', label: 'Config', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id as 'view' | 'tank-tables' | 'products' | 'config')}
                className={`py-2 px-2 border-b-2 font-medium text-xs transition-colors flex-shrink-0 ${
                  activeSection === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Content */}
        <div className="overflow-y-auto h-full pb-20">
          {activeSection === 'view' && (
            <div className="p-6 space-y-6">
              {/* View Options Section */}
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3">View Options</h3>
                <p className="text-sm text-gray-600 mb-4">Choose how to display your tanks</p>
                <SidebarViewControls currentView={currentView} onViewChange={onViewChange} />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              {/* Default Layout Section */}
              <div>
                <DefaultLayoutSettings
                  currentDefault={defaultLayout}
                  onDefaultChange={onDefaultLayoutChange}
                />
              </div>
            </div>
          )}

          {activeSection === 'tank-tables' && (
            <div className="p-6">
              <TankTableManagement />
            </div>
          )}

          {activeSection === 'products' && (
            <div className="p-6">
              <ProductManagement />
            </div>
          )}

          {activeSection === 'config' && (
            <div className="p-6 space-y-6">
              {/* Data Source Configuration Section */}
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3">Data Source Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">Configure where tank data comes from</p>
                <DataSourceConfiguration />
              </div>

              {/* Tank Configuration Section */}
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3">Tank Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">Drag tanks to reorder, click names to edit</p>

                {/* Configuration Controls */}
                <div className="space-y-3">
                  <button
                    onClick={onExport}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    title="Export tank configuration"
                  >
                    <Download className="w-4 h-4" />
                    <span className="font-medium">Export Configuration</span>
                  </button>

                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.json';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const success = await onImport(file);
                          if (success) {
                            alert('Configuration imported successfully!');
                          } else {
                            alert('Failed to import configuration. Please check the file format.');
                          }
                        }
                      };
                      input.click();
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    title="Import tank configuration"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="font-medium">Import Configuration</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to reset all tank names and positions to default? This cannot be undone.')) {
                        onReset();
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Reset to default configuration"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="font-medium">Reset Configuration</span>
                  </button>

                  {onDebug && (
                    <button
                      onClick={() => {
                        const status = onDebug();
                        console.log('🔍 Tank Configuration Debug:', status);
                        alert('Configuration debug info logged to console. Check browser developer tools.');
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                      title="Debug tank configuration"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="font-medium">Debug Configuration</span>
                    </button>
                  )}

                  {onMigrate && (
                    <button
                      onClick={() => {
                        if (window.confirm('Migrate data from localStorage to SQLite database? This is usually done automatically.')) {
                          onMigrate();
                          alert('Migration completed! Please refresh the page.');
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                      title="Migrate data from localStorage to database"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="font-medium">Migrate to Database</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              {/* Help Section */}
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3">Quick Help</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <span className="font-medium">•</span>
                    <span>Drag the grip handles (⋮⋮) to reorder tanks</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-medium">•</span>
                    <span>Click the edit icon (✏️) to rename tanks</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-medium">•</span>
                    <span>Export/import configurations for different vessels</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-medium">•</span>
                    <span>Use different view modes for optimal display</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-medium">•</span>
                    <span>Import tank tables for accurate calibration data</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
