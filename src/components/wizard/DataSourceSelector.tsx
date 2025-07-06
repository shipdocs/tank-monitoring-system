import React, { useState } from 'react';
import { DataSourceType, DataSourceConfig } from '../../types/vessel';
import {
  Database,
  FileText,
  Cable,
  FolderOpen,
  CheckCircle
} from 'lucide-react';

interface DataSourceSelectorProps {
  selectedDataSource?: DataSourceConfig;
  onSelect: (dataSource: DataSourceConfig) => void;
}

interface DataSourceOption {
  type: DataSourceType;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  recommended?: boolean;
}

const dataSourceOptions: DataSourceOption[] = [
  {
    type: 'serial-port',
    icon: <Cable className="w-8 h-8" />,
    title: 'Serial Port Connection',
    description: 'Real-time data from tank sensors via serial port',
    features: ['Real-time updates', 'Direct sensor connection', 'High accuracy'],
    recommended: true
  },
  {
    type: 'csv-file',
    icon: <FileText className="w-8 h-8" />,
    title: 'CSV File Monitoring',
    description: 'Automatic monitoring of CSV files for tank data',
    features: ['Flexible column mapping', 'Automatic file watching', 'Historical data support']
  },
  {
    type: 'txt-file',
    icon: <FileText className="w-8 h-8" />,
    title: 'Text File Monitoring',
    description: 'Automatic monitoring of delimited text files for tank data',
    features: ['Multiple delimiter support', 'Space/tab delimited', 'Custom formats']
  },
  {
    type: 'json-file',
    icon: <Database className="w-8 h-8" />,
    title: 'JSON File Monitoring',
    description: 'Automatic monitoring of JSON files for tank data',
    features: ['Structured format', 'Complete tank information', 'Easy integration']
  },

];

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  selectedDataSource,
  onSelect
}) => {
  const [selectedType, setSelectedType] = useState<DataSourceType | undefined>(
    selectedDataSource?.type
  );
  const [fileConfig, setFileConfig] = useState({
    filePath: selectedDataSource?.filePath || '',
    importInterval: selectedDataSource?.importInterval || 30,
    hasHeaders: selectedDataSource?.hasHeaders ?? true,
    delimiter: selectedDataSource?.delimiter || ',',
    isVerticalFormat: selectedDataSource?.isVerticalFormat || false,
    linesPerRecord: selectedDataSource?.linesPerRecord || 4,
    lineMapping: selectedDataSource?.lineMapping || {},
    autoDetectDataEnd: selectedDataSource?.autoDetectDataEnd ?? true,
    skipOutliers: selectedDataSource?.skipOutliers ?? true,
    maxRecords: selectedDataSource?.maxRecords || 0,
    temperatureRange: selectedDataSource?.temperatureRange || { min: 0, max: 50 }
  });
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const handleTypeSelect = (type: DataSourceType) => {
    setSelectedType(type);

    if (type === 'serial-port') {
      // For serial port, we can immediately create the config
      const config: DataSourceConfig = { type };
      onSelect(config);
    }

    // Reset file config when switching types
    if (type === 'txt-file') {
      setFileConfig(prev => ({ ...prev, delimiter: ' ' })); // Default to space for txt files
    } else if (type === 'csv-file') {
      setFileConfig(prev => ({ ...prev, delimiter: ',' })); // Default to comma for csv files
    }
  };

  const handleFileSelect = async () => {
    // Try Electron file dialog first
    if ((window as unknown as { tankMonitorAPI?: { showOpenDialog: (options: unknown) => Promise<{ success: boolean; filePath?: string }> } }).tankMonitorAPI?.showOpenDialog) {
      try {
        const result = await (window as unknown as { tankMonitorAPI: { showOpenDialog: (options: unknown) => Promise<{ success: boolean; filePath?: string }> } }).tankMonitorAPI.showOpenDialog({
          title: 'Select Data File',
          filters: [
            { name: 'Data Files', extensions: ['txt', 'csv', 'json'] },
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'CSV Files', extensions: ['csv'] },
            { name: 'JSON Files', extensions: ['json'] }
          ]
        });

        if (result.success && result.filePath) {
          setFileConfig(prev => ({ ...prev, filePath: result.filePath }));

          // For Electron, we need to read the file differently
          // For now, just set the path and let the server handle file reading
          console.log('Selected file path:', result.filePath);

          // Create a mock file object for validation
          const fileName = result.filePath.split(/[\\/]/).pop() || 'file';
          const mockFile = new File([''], fileName);
          (mockFile as File & { fullPath?: string }).fullPath = result.filePath;

          // Skip validation for now - the server will handle the actual file reading
          const config: DataSourceConfig = {
            type: selectedType!,
            filePath: result.filePath,
            importInterval: fileConfig.importInterval * 1000,
            hasHeaders: fileConfig.hasHeaders,
            delimiter: fileConfig.delimiter,
            isVerticalFormat: fileConfig.isVerticalFormat,
            linesPerRecord: fileConfig.linesPerRecord,
            lineMapping: fileConfig.lineMapping,
            autoDetectDataEnd: fileConfig.autoDetectDataEnd,
            skipOutliers: fileConfig.skipOutliers,
            maxRecords: fileConfig.maxRecords,
            temperatureRange: fileConfig.temperatureRange
          };

          onSelect(config);
          return;
        }
      } catch (error) {
        console.warn('Electron file dialog failed, falling back to web dialog:', error);
      }
    }

    // Fallback to web file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = selectedType === 'csv-file' ? '.csv' :
                   selectedType === 'txt-file' ? '.txt,.csv,.tsv' :
                   '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Get full path if available (Electron) or use file name as fallback (web)
        const fullPath = (file as File & { path?: string }).path || file.name;
        setFileConfig(prev => ({ ...prev, filePath: fullPath }));
        await validateFile(file);
      }
    };
    input.click();
  };

  const validateFile = async (file: File) => {
    setIsValidating(true);
    try {
      const text = await file.text();

      if (selectedType === 'csv-file' || selectedType === 'txt-file') {
        // For vertical format, we need to split on newlines, not delimiters
        const lines = fileConfig.isVerticalFormat
          ? text.split(/\r?\n/).filter(line => line.trim() !== '')
          : text.split('\n').filter(line => line.trim());

        if (fileConfig.isVerticalFormat) {
          // Group lines into records for vertical format
          const records = [];
          console.log(`🔍 File Debug: ${lines.length} lines, ${fileConfig.linesPerRecord} per record`);
          console.log(`🔍 First 8 lines:`, lines.slice(0, 8));

          // Load ALL records for accurate tank detection (no limit for tank counting)
          for (let i = 0; i < lines.length; i += fileConfig.linesPerRecord) {
            const record = lines.slice(i, i + fileConfig.linesPerRecord);
            // Debug only first few records
            if (Math.floor(i / fileConfig.linesPerRecord) < 3) {
              console.log(`🔍 Record ${Math.floor(i / fileConfig.linesPerRecord) + 1}:`, record);
            }
            if (record.length === fileConfig.linesPerRecord) {
              records.push(record);
            }
          }
          setPreviewData(records);
          console.log(`📊 Loaded ${records.length} tank records from vertical format file`);

          // Analyze data quality (simplified version)
          if (records.length > 0) {
            const tempLineIndex = Object.entries(fileConfig.lineMapping).find(([, field]) => field === 'temperature')?.[0];
            let validRecords = 0;
            const outliers: number[] = [];

            records.forEach((record, index) => {
              let isValid = true;

              // Check temperature range if mapped
              if (tempLineIndex !== undefined) {
                const tempValue = parseFloat(record[parseInt(tempLineIndex)]?.replace(',', '.') || '0');
                if (!isNaN(tempValue) && (tempValue < 0 || tempValue > 50)) {
                  isValid = false;
                }
              }

              // Check for records with too many zeros
              const zeroCount = record.filter(value => value.trim() === '0' || value.trim() === '').length;
              if (zeroCount >= record.length - 1) {
                isValid = false;
              }

              if (isValid) {
                validRecords++;
              } else {
                outliers.push(index);
              }
            });

            const quality = {
              totalRecords: records.length,
              validRecords,
              suggestedCutoff: outliers.length > 0 ? Math.min(...outliers) : undefined,
              outliers
            };

            setFileConfig(prev => ({ ...prev, dataQuality: quality }));
          }
        } else {
          // Standard horizontal format
          const preview = lines.slice(0, 5).map(line => line.split(fileConfig.delimiter));
          setPreviewData(preview);
        }
      } else if (selectedType === 'json-file') {
        // JSON preview
        const data = JSON.parse(text);
        const preview = Array.isArray(data) ? data.slice(0, 5) : [data];
        setPreviewData(preview);
      }

      // Create the data source config
      const config: DataSourceConfig = {
        type: selectedType!,
        filePath: (file as File & { path?: string }).path || file.name, // Use full path if available
        importInterval: fileConfig.importInterval * 1000, // Convert to ms
        hasHeaders: fileConfig.hasHeaders,
        delimiter: fileConfig.delimiter,
        isVerticalFormat: fileConfig.isVerticalFormat,
        linesPerRecord: fileConfig.linesPerRecord,
        lineMapping: fileConfig.lineMapping,
        autoDetectDataEnd: fileConfig.autoDetectDataEnd,
        skipOutliers: fileConfig.skipOutliers,
        maxRecords: fileConfig.maxRecords,
        temperatureRange: fileConfig.temperatureRange,
        dataQuality: fileConfig.dataQuality,
        previewData: previewData
      };

      onSelect(config);
    } catch (error) {
      console.error('File validation error:', error);
      alert('Failed to read file. Please check the file format.');
    } finally {
      setIsValidating(false);
    }
  };

  const renderSerialConfiguration = () => {
    if (selectedType !== 'serial-port') {
      return null;
    }

    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <h4 className="font-medium text-gray-900 mb-4">Serial Port Configuration</h4>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Cable className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Serial Port Setup
              </span>
            </div>
            <p className="text-sm text-blue-700 mt-2">
              Serial port configuration will be available in the next step.
              The server will auto-detect available ports and allow you to configure connection settings.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderFileConfiguration = () => {
    if (!selectedType || (selectedType !== 'csv-file' && selectedType !== 'txt-file' && selectedType !== 'json-file')) {
      return null;
    }

    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <h4 className="font-medium text-gray-900 mb-4">File Configuration</h4>
        
        <div className="space-y-4">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <button
              onClick={handleFileSelect}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
            >
              <FolderOpen className="w-5 h-5 text-gray-500" />
              <span className="text-gray-600">
                {fileConfig.filePath || `Choose ${
                  selectedType === 'csv-file' ? 'CSV' :
                  selectedType === 'txt-file' ? 'Text' :
                  'JSON'
                } file`}
              </span>
            </button>
          </div>

          {/* CSV/TXT-specific options */}
          {(selectedType === 'csv-file' || selectedType === 'txt-file') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Import Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="3600"
                    value={fileConfig.importInterval}
                    onChange={(e) => setFileConfig(prev => ({ 
                      ...prev, 
                      importInterval: parseInt(e.target.value) || 30 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delimiter
                  </label>
                  <select
                    value={fileConfig.delimiter}
                    onChange={(e) => setFileConfig(prev => ({ ...prev, delimiter: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="\t">Tab</option>
                    <option value=" ">Space</option>
                    <option value="  ">Double Space</option>
                    <option value="|">Pipe (|)</option>
                    <option value=":">Colon (:)</option>
                    <option value="~">Tilde (~)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hasHeaders"
                    checked={fileConfig.hasHeaders}
                    onChange={(e) => setFileConfig(prev => ({ ...prev, hasHeaders: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={fileConfig.isVerticalFormat}
                  />
                  <label htmlFor="hasHeaders" className="ml-2 text-sm text-gray-700">
                    File has header row
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isVerticalFormat"
                    checked={fileConfig.isVerticalFormat}
                    onChange={(e) => setFileConfig(prev => ({
                      ...prev,
                      isVerticalFormat: e.target.checked,
                      hasHeaders: e.target.checked ? false : prev.hasHeaders // Disable headers for vertical
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isVerticalFormat" className="ml-2 text-sm text-gray-700">
                    Vertical format (multiple lines per record)
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Vertical Format Configuration */}
          {fileConfig.isVerticalFormat && (
            <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="text-sm font-medium text-blue-900">Vertical Format Configuration</h5>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lines per record
                </label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={fileConfig.linesPerRecord}
                  onChange={(e) => setFileConfig(prev => ({
                    ...prev,
                    linesPerRecord: parseInt(e.target.value) || 4
                  }))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How many lines represent one tank record
                </p>
              </div>

              <div>
                <h6 className="text-sm font-medium text-gray-700 mb-2">Field Mapping</h6>
                <div className="space-y-2">
                  {Array.from({ length: fileConfig.linesPerRecord }, (_, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-16">Line {index + 1}:</span>
                      <select
                        value={fileConfig.lineMapping[index] || ''}
                        onChange={(e) => setFileConfig(prev => ({
                          ...prev,
                          lineMapping: { ...prev.lineMapping, [index]: e.target.value }
                        }))}
                        className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">-- Select field --</option>
                        <option value="id">Tank ID</option>
                        <option value="name">Tank Name</option>
                        <option value="level">Current Level</option>
                        <option value="maxCapacity">Max Capacity</option>
                        <option value="minLevel">Min Level</option>
                        <option value="maxLevel">Max Level</option>
                        <option value="temperature">Temperature</option>
                        <option value="pressure">Pressure</option>
                        <option value="status">Status</option>
                        <option value="unit">Unit</option>
                        <option value="location">Location</option>
                        <option value="ignore">Ignore this line</option>
                      </select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Map each line position to a tank field. Use "Ignore" for unused lines.
                </p>
              </div>

              {/* Data Quality & Limits */}
              <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h6 className="text-sm font-medium text-green-900">Data Quality & Limits</h6>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoDetectDataEnd"
                      checked={fileConfig.autoDetectDataEnd}
                      onChange={(e) => setFileConfig(prev => ({ ...prev, autoDetectDataEnd: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoDetectDataEnd" className="ml-2 text-sm text-gray-700">
                      Auto-detect data end
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="skipOutliers"
                      checked={fileConfig.skipOutliers}
                      onChange={(e) => setFileConfig(prev => ({ ...prev, skipOutliers: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="skipOutliers" className="ml-2 text-sm text-gray-700">
                      Skip outlier records
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max records (0 = unlimited)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={fileConfig.maxRecords}
                      onChange={(e) => setFileConfig(prev => ({
                        ...prev,
                        maxRecords: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperature range (°C)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="-50"
                        max="100"
                        value={fileConfig.temperatureRange.min}
                        onChange={(e) => setFileConfig(prev => ({
                          ...prev,
                          temperatureRange: { ...prev.temperatureRange, min: parseInt(e.target.value) || 0 }
                        }))}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      />
                      <span className="text-xs text-gray-500">to</span>
                      <input
                        type="number"
                        min="-50"
                        max="100"
                        value={fileConfig.temperatureRange.max}
                        onChange={(e) => setFileConfig(prev => ({
                          ...prev,
                          temperatureRange: { ...prev.temperatureRange, max: parseInt(e.target.value) || 50 }
                        }))}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Data Quality Indicator */}
                {fileConfig.dataQuality && (
                  <div className="p-3 bg-white border border-green-200 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Data Quality Analysis</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        fileConfig.dataQuality.validRecords / fileConfig.dataQuality.totalRecords > 0.8
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {Math.round((fileConfig.dataQuality.validRecords / fileConfig.dataQuality.totalRecords) * 100)}% valid
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Total records: {fileConfig.dataQuality.totalRecords}</div>
                      <div>Valid records: {fileConfig.dataQuality.validRecords}</div>
                      {fileConfig.dataQuality.outliers.length > 0 && (
                        <div>Outliers found at records: {fileConfig.dataQuality.outliers.slice(0, 5).join(', ')}
                          {fileConfig.dataQuality.outliers.length > 5 && '...'}
                        </div>
                      )}
                      {fileConfig.dataQuality.suggestedCutoff !== undefined && (
                        <div className="text-blue-600 font-medium">
                          💡 Suggested: Stop after record {fileConfig.dataQuality.suggestedCutoff}
                          <button
                            onClick={() => setFileConfig(prev => ({
                              ...prev,
                              maxRecords: fileConfig.dataQuality?.suggestedCutoff || 0
                            }))}
                            className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                Preview {fileConfig.isVerticalFormat ? '(Grouped Records)' : ''}
              </h5>
              <div className="bg-white border rounded-md p-3 max-h-40 overflow-auto">
                {fileConfig.isVerticalFormat ? (
                  <div className="space-y-3">
                    <div className="text-xs text-green-600 font-medium mb-2">
                      Found {previewData.length} tanks in file
                    </div>
                    {previewData.slice(0, 3).map((record, recordIndex) => (
                      <div key={recordIndex} className="border-l-2 border-blue-200 pl-3">
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          Record {recordIndex + 1} (Length: {Array.isArray(record) ? record.length : 'Not Array'}):
                        </div>
                        {Array.isArray(record) ? record.map((line: string, lineIndex: number) => (
                          <div key={lineIndex} className="text-xs text-gray-700 flex items-center space-x-2">
                            <span className="text-gray-400 w-12">L{lineIndex + 1}:</span>
                            <span className="font-mono bg-gray-100 px-1 rounded">{line}</span>
                            {fileConfig.lineMapping[lineIndex] && (
                              <span className="text-blue-600 text-xs">
                                → {fileConfig.lineMapping[lineIndex]}
                              </span>
                            )}
                          </div>
                        )) : (
                          <div className="text-xs text-red-600">
                            Error: Record is not an array: {JSON.stringify(record)}
                          </div>
                        )}
                      </div>
                    ))}
                    {previewData.length > 3 && (
                      <div className="text-xs text-gray-500 text-center py-2 border-t">
                        ... and {previewData.length - 3} more tanks
                      </div>
                    )}
                  </div>
                ) : (
                  <pre className="text-xs text-gray-600">
                    {JSON.stringify(previewData, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Configure Server Data Source
        </h2>
        <p className="text-gray-600">
          How should the server collect tank data?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dataSourceOptions.map((option) => (
          <button
            key={option.type}
            onClick={() => handleTypeSelect(option.type)}
            className={`p-6 rounded-lg border-2 transition-all duration-200 hover:shadow-lg text-left relative ${
              selectedType === option.type
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {option.recommended && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                Recommended
              </div>
            )}
            
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-full ${
                  selectedType === option.type
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {option.icon}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {option.description}
                  </p>
                </div>
              </div>
              
              <div className="space-y-1">
                {option.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {renderSerialConfiguration()}
      {renderFileConfiguration()}

      {selectedType && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">
              {dataSourceOptions.find(opt => opt.type === selectedType)?.title} selected
            </span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            {selectedType === 'csv-file' || selectedType === 'txt-file' || selectedType === 'json-file'
              ? 'Configure your file settings above, then click "Next" to continue.'
              : selectedType === 'serial-port'
              ? 'Serial port configuration will be completed in the next steps.'
              : 'Click "Next" to choose your tank layout configuration.'
            }
          </p>
        </div>
      )}

      {isValidating && (
        <div className="flex items-center justify-center space-x-2 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">Validating file...</span>
        </div>
      )}
    </div>
  );
};
