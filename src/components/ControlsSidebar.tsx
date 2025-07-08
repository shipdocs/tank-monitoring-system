import React, { useState } from 'react';
import { SidebarViewControls } from './SidebarViewControls';
import { DefaultLayoutSettings } from './DefaultLayoutSettings';
import { ErrorLogViewer } from './ErrorLogViewer';
import { type ViewMode } from '../types/tank';
import { AlertCircle, ChevronRight, Download, LayoutDashboard, RotateCcw, Settings, Upload, X } from 'lucide-react';

interface ControlsSidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  defaultLayout: ViewMode;
  onDefaultLayoutChange: (layout: ViewMode) => void;
  onExport: () => void;
  onImport: (file: File) => Promise<boolean>;
  onReset: () => void;
  onMigrate?: () => void;
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
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 z-50 bg-white shadow-lg rounded-lg p-3 border-2 border-gray-200 hover:bg-gray-50 transition-all duration-300 ${
          isOpen ? 'right-80' : 'right-4'
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
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
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

        {/* Sidebar Content */}
        <div className="p-6 space-y-6 overflow-y-auto h-full pb-20">
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

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

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

          {/* Error Log Section (Dev Mode) */}
          {process.env.NODE_ENV === 'development' && (
            <>
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Error Log (Dev)
                </h3>
                <ErrorLogViewer />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>
            </>
          )}

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
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
