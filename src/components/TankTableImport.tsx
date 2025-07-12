import React, { useState, useCallback, useMemo } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Download, X } from 'lucide-react';
import { TankTableImportService } from '../services/TankTableImportService';
import { TankTableImportResult } from '../types/tankTable';

interface TankTableImportProps {
  onImportComplete?: (result: TankTableImportResult) => void;
  onClose?: () => void;
}

export const TankTableImport: React.FC<TankTableImportProps> = ({ 
  onImportComplete, 
  onClose 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<TankTableImportResult | null>(null);
  const [tableName, setTableName] = useState('');

  const importService = useMemo(() => new TankTableImportService(), []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportResult({
        success: false,
        errors: ['Please select a CSV file'],
        warnings: [],
        tanks_imported: 0
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importService.importFromCSV(file, tableName || undefined);
      setImportResult(result);
      
      if (result.success && onImportComplete) {
        onImportComplete(result);
      }
    } catch (error) {
      setImportResult({
        success: false,
        errors: [`Import failed: ${error.message}`],
        warnings: [],
        tanks_imported: 0
      });
    } finally {
      setIsImporting(false);
    }
  }, [tableName, onImportComplete, importService]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const downloadTemplate = () => {
    const csvContent = `tank_id,tank_name,max_height_mm,max_volume_liters,tank_type,location,calibration_data,description
TANK_001,Forward Port Ballast,2000,15000,ballast,Forward Port,"0:0,100:750,200:1500,300:2250,400:3000,500:3750,600:4500,700:5250,800:6000,900:6750,1000:7500,1100:8250,1200:9000,1300:9750,1400:10500,1500:11250,1600:12000,1700:12750,1800:13500,1900:14250,2000:15000",Main ballast tank
TANK_002,Cargo Tank 1,1800,12000,cargo,Midship Port,"0:0,100:667,200:1333,300:2000,400:2667,500:3333,600:4000,700:4667,800:5333,900:6000,1000:6667,1100:7333,1200:8000,1300:8667,1400:9333,1500:10000,1600:10667,1700:11333,1800:12000",Primary cargo tank`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tank-table-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Import Tank Table</h2>
              <p className="text-gray-600 mt-1">
                Import tank calibration data from CSV file
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Table Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Table Name (optional)
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Enter a name for this tank table"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Template Download */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-900">Need a template?</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Download our CSV template with example tank data
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Template</span>
              </button>
            </div>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop your CSV file here
            </h3>
            <p className="text-gray-600 mb-4">
              or click to browse for a file
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Select CSV File
            </label>
          </div>

          {/* Loading State */}
          {isImporting && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-900">Importing tank table...</span>
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="mt-6">
              {importResult.success ? (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="text-green-900 font-medium">Import Successful!</h3>
                  </div>
                  <p className="text-green-800">
                    Successfully imported {importResult.tanks_imported} tanks
                  </p>
                  {importResult.warnings.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-yellow-800 mb-1">Warnings:</h4>
                      <ul className="text-sm text-yellow-700 list-disc list-inside">
                        {importResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <h3 className="text-red-900 font-medium">Import Failed</h3>
                  </div>
                  <ul className="text-red-800 list-disc list-inside">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* CSV Format Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">CSV Format Requirements:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>tank_id:</strong> Unique identifier for each tank</li>
              <li>• <strong>tank_name:</strong> Display name for the tank</li>
              <li>• <strong>max_height_mm:</strong> Maximum tank height in millimeters</li>
              <li>• <strong>max_volume_liters:</strong> Maximum tank volume in liters</li>
              <li>• <strong>tank_type:</strong> ballast, cargo, fuel, fresh_water, etc.</li>
              <li>• <strong>location:</strong> Physical location description</li>
              <li>• <strong>calibration_data:</strong> Height:Volume pairs (e.g., "0:0,100:750,200:1500")</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
