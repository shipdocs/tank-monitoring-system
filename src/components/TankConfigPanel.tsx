import React, { useRef } from 'react';
import { Download, RotateCcw, Settings, Upload } from 'lucide-react';

interface TankConfigPanelProps {
  onExport: () => void;
  onImport: (file: File) => Promise<boolean>;
  onReset: () => void;
}

export const TankConfigPanel: React.FC<TankConfigPanelProps> = ({
  onExport,
  onImport,
  onReset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const success = await onImport(file);
      if (success) {
        alert('Configuration imported successfully!');
      } else {
        alert('Failed to import configuration. Please check the file format.');
      }
      // Reset the input
      event.target.value = '';
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all tank names and positions to default? This cannot be undone.')) {
      onReset();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Tank Configuration</h3>
            <p className="text-sm text-gray-600">Drag tanks to reorder, click names to edit</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onExport}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            title="Export tank configuration"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export</span>
          </button>

          <button
            onClick={handleImportClick}
            className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            title="Import tank configuration"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">Import</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Reset to default configuration"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm font-medium">Reset</span>
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
