import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Download } from 'lucide-react';
import { TankTableParseResult, TankTable } from '../types/tankTable';
import { useTankTables } from '../hooks/useTankTables';

interface TankTableUploadProps {
  onUploadComplete?: (result: TankTableParseResult) => void;
  onClose?: () => void;
  className?: string;
}

export const TankTableUpload: React.FC<TankTableUploadProps> = ({
  onUploadComplete,
  onClose,
  className = ''
}) => {
  const { uploadTankTable, isUploading } = useTankTables();
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<TankTableParseResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      const extension = file.name.toLowerCase().split('.').pop();
      const supportedFormats = ['csv', 'xlsx', 'xls', 'pdf'];
      
      if (!extension || !supportedFormats.includes(extension)) {
        setUploadResult({
          success: false,
          errors: [`Unsupported file format: ${extension}. Supported formats: ${supportedFormats.join(', ')}`],
          warnings: [],
          detectedFormat: 'unknown',
          autoMappingApplied: false
        });
        return;
      }
      
      setSelectedFile(file);
      setUploadResult(null);
    }
  }, []);

  // Handle file upload
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    
    try {
      const result = await uploadTankTable(selectedFile);
      setUploadResult(result);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (error) {
      setUploadResult({
        success: false,
        errors: [`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        detectedFormat: 'unknown',
        autoMappingApplied: false
      });
    }
  }, [selectedFile, uploadTankTable, onUploadComplete]);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  // Reset upload state
  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setUploadResult(null);
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Upload className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Upload Tank Table</h2>
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

      {/* Upload Area */}
      {!selectedFile && !uploadResult && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Drop your tank table file here
          </h3>
          <p className="text-gray-600 mb-4">
            or click to browse for files
          </p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.pdf"
            onChange={handleInputChange}
            className="hidden"
            id="tank-table-upload"
          />
          <label
            htmlFor="tank-table-upload"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose File
          </label>
          <p className="text-sm text-gray-500 mt-4">
            Supported formats: CSV, Excel (.xlsx/.xls), PDF
          </p>
        </div>
      )}

      {/* Selected File */}
      {selectedFile && !uploadResult && (
        <div className="border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className="space-y-4">
          {/* Success/Error Status */}
          <div className={`flex items-center space-x-3 p-4 rounded-lg ${
            uploadResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {uploadResult.success ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <div>
              <p className="font-medium">
                {uploadResult.success ? 'Upload Successful' : 'Upload Failed'}
              </p>
              <p className="text-sm">
                Detected format: {uploadResult.detectedFormat.toUpperCase()}
                {uploadResult.autoMappingApplied && ' (Auto-mapping applied)'}
              </p>
            </div>
          </div>

          {/* Tank Table Info */}
          {uploadResult.success && uploadResult.tankTable && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Tank Table Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Max Level:</span>
                  <span className="ml-2 font-medium">{uploadResult.tankTable.maxLevel} {uploadResult.tankTable.unit}</span>
                </div>
                <div>
                  <span className="text-gray-600">Volume Entries:</span>
                  <span className="ml-2 font-medium">{uploadResult.tankTable.volumeEntries.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Source File:</span>
                  <span className="ml-2 font-medium">{uploadResult.tankTable.sourceFile}</span>
                </div>
                <div>
                  <span className="text-gray-600">Upload Date:</span>
                  <span className="ml-2 font-medium">{uploadResult.tankTable.uploadDate.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {uploadResult.errors.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Errors</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {uploadResult.errors.map((error, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {uploadResult.warnings.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Warnings</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {uploadResult.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Upload Another File
            </button>
            {uploadResult.success && onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
