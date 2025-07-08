import { type Tank } from '../types/tank';
import { type DataSourceConfig } from '../types/vessel';

// Data quality analysis for vertical format
const analyzeDataQuality = (records: string[][], config: DataSourceConfig) => {
  const lineMapping = config.lineMapping || {};
  const temperatureRange = config.temperatureRange || { min: 0, max: 50 };
  const outliers: number[] = [];
  let validRecords = 0;

  // Find which line contains temperature data
  const tempLineIndex = Object.entries(lineMapping).find(([, field]) => field === 'temperature')?.[0];
  const levelLineIndex = Object.entries(lineMapping).find(([, field]) => field === 'level')?.[0];

  // Collect all temperature and level values for statistical analysis
  const temperatures: number[] = [];
  const levels: number[] = [];

  records.forEach((record) => {
    if (tempLineIndex !== undefined) {
      const tempValue = parseFloat(record[parseInt(tempLineIndex)]?.replace(',', '.') || '0');
      if (!isNaN(tempValue)) {
        temperatures.push(tempValue);
      }
    }

    if (levelLineIndex !== undefined) {
      const levelValue = parseFloat(record[parseInt(levelLineIndex)]?.replace(',', '.') || '0');
      if (!isNaN(levelValue)) {
        levels.push(levelValue);
      }
    }
  });

  // Calculate statistics
  const tempMean = temperatures.length > 0 ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length : 0;
  const tempStdDev = temperatures.length > 0 ? Math.sqrt(temperatures.reduce((sq, n) => sq + Math.pow(n - tempMean, 2), 0) / temperatures.length) : 0;

  const levelMean = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
  const levelStdDev = levels.length > 0 ? Math.sqrt(levels.reduce((sq, n) => sq + Math.pow(n - levelMean, 2), 0) / levels.length) : 0;

  // Analyze each record for quality
  records.forEach((record, recordIndex) => {
    let isValid = true;

    // Check temperature range
    if (tempLineIndex !== undefined) {
      const tempValue = parseFloat(record[parseInt(tempLineIndex)]?.replace(',', '.') || '0');
      if (!isNaN(tempValue)) {
        // Check if temperature is within reasonable range
        if (tempValue < temperatureRange.min || tempValue > temperatureRange.max) {
          isValid = false;
        }
        // Check if temperature is a statistical outlier (>3 standard deviations)
        if (Math.abs(tempValue - tempMean) > 3 * tempStdDev && tempStdDev > 0) {
          isValid = false;
        }
      }
    }

    // Check level outliers
    if (levelLineIndex !== undefined) {
      const levelValue = parseFloat(record[parseInt(levelLineIndex)]?.replace(',', '.') || '0');
      if (!isNaN(levelValue)) {
        // Check if level is a statistical outlier (>3 standard deviations)
        if (Math.abs(levelValue - levelMean) > 3 * levelStdDev && levelStdDev > 0) {
          isValid = false;
        }
      }
    }

    // Check for records with too many zeros (likely empty/test data)
    const zeroCount = record.filter(value => value.trim() === '0' || value.trim() === '').length;
    if (zeroCount >= record.length - 1) { // All but one value is zero
      isValid = false;
    }

    if (isValid) {
      validRecords++;
    } else {
      outliers.push(recordIndex);
    }
  });

  // Suggest cutoff point (last valid record + some buffer)
  let suggestedCutoff: number | undefined;
  if (outliers.length > 0) {
    const firstOutlier = Math.min(...outliers);
    suggestedCutoff = firstOutlier;
  }

  return {
    totalRecords: records.length,
    validRecords,
    suggestedCutoff,
    outliers,
  };
};


// Parse vertical format data
const parseVerticalFormat = (lines: string[], config: DataSourceConfig): Tank[] => {
  const tanks: Tank[] = [];
  const linesPerRecord = config.linesPerRecord || 4;
  const lineMapping = config.lineMapping || {};

  // Group lines into records first
  const allRecords: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerRecord) {
    const recordLines = lines.slice(i, i + linesPerRecord);
    if (recordLines.length === linesPerRecord) {
      allRecords.push(recordLines);
    }
  }

  // Analyze data quality if auto-detect is enabled
  let recordsToProcess = allRecords;
  if (config.autoDetectDataEnd !== false) { // Default to true
    const quality = analyzeDataQuality(allRecords, config);

    // Apply suggested cutoff if available
    if (quality.suggestedCutoff !== undefined) {
      recordsToProcess = allRecords.slice(0, quality.suggestedCutoff);
      console.log(`🔍 Auto-detected data end at record ${quality.suggestedCutoff} (${quality.validRecords}/${quality.totalRecords} valid)`);
    }
  }

  // Apply manual record limit if set
  if (config.maxRecords && config.maxRecords > 0) {
    recordsToProcess = recordsToProcess.slice(0, config.maxRecords);
    console.log(`✂️ Applied manual limit: ${config.maxRecords} records`);
  }

  // Process each record
  recordsToProcess.forEach((recordLines, recordIndex) => {

    // Create tank object from mapped lines
    const tank: Partial<Tank> = {
      lastUpdated: new Date(),
    };

    // Apply line mappings
    recordLines.forEach((line, lineIndex) => {
      const fieldName = lineMapping[lineIndex];
      const value = line.trim();

      if (!fieldName || fieldName === 'ignore' || !value) {
        return;
      }

      switch (fieldName) {
        case 'id': {
          // Keep ID as string
          tank.id = value.trim();
          break;
        }
        case 'name':
          tank.name = value;
          break;
        case 'level': {
          const level = parseFloat(value.replace(',', '.'));
          if (!isNaN(level)) {
            tank.currentLevel = level;
          }
          break;
        }
        case 'maxCapacity': {
          const maxCap = parseFloat(value.replace(',', '.'));
          if (!isNaN(maxCap)) {
            tank.maxCapacity = maxCap;
          }
          break;
        }
        case 'minLevel': {
          const minLvl = parseFloat(value.replace(',', '.'));
          if (!isNaN(minLvl)) {
            tank.minLevel = minLvl;
          }
          break;
        }
        case 'maxLevel': {
          const maxLvl = parseFloat(value.replace(',', '.'));
          if (!isNaN(maxLvl)) {
            tank.maxLevel = maxLvl;
          }
          break;
        }
        case 'temperature': {
          // Store as custom property for now
          (tank as Tank & { temperature?: number }).temperature = parseFloat(value.replace(',', '.'));
          break;
        }
        case 'pressure': {
          // Store as custom property for now
          (tank as Tank & { pressure?: number }).pressure = parseFloat(value.replace(',', '.'));
          break;
        }
        case 'status': {
          const statusValue = parseInt(value);
          if (statusValue === 0) {
            tank.status = 'normal';
          } else if (statusValue === 1) {
            tank.status = 'low';
          } else if (statusValue === 2) {
            tank.status = 'high';
          } else if (statusValue === 3) {
            tank.status = 'critical';
          }
          break;
        }
        case 'unit':
          tank.unit = value;
          break;
        case 'location':
          tank.location = value;
          break;
      }
    });

    // Set defaults and calculate status if not set
    if (tank.currentLevel === undefined) {
      tank.currentLevel = 0;
    }

    if (!tank.status) {
      const level = tank.currentLevel || 0;
      const minLevel = tank.minLevel || 50;
      const maxLevel = tank.maxLevel || 950;

      if (level < 25) {
        tank.status = 'critical';
      } else if (level < minLevel) {
        tank.status = 'low';
      } else if (level > maxLevel) {
        tank.status = 'high';
      } else {
        tank.status = 'normal';
      }
    }

    // Ensure tank has an ID
    if (!tank.id) {
      tank.id = `tank-${recordIndex + 1}`;
    }

    tanks.push(tank as Tank);
  });

  return tanks;
};

// Parse horizontal format data (CSV/TSV)
const parseHorizontalFormat = (lines: string[], config: DataSourceConfig): Tank[] => {
  const tanks: Tank[] = [];
  const delimiter = config.delimiter || ',';
  const hasHeaders = config.hasHeaders || false;

  const dataLines = hasHeaders ? lines.slice(1) : lines;

  dataLines.forEach((line, lineIndex) => {
    const columns = line.split(delimiter).map(col => col.trim());

    const tank: Partial<Tank> = {
      id: `tank-${lineIndex + 1}`,
      lastUpdated: new Date(),
      currentLevel: 0,
      status: 'normal',
    };

    // Apply column mappings (simplified for now)
    columns.forEach((value, colIndex) => {
      if (colIndex === 0 && !isNaN(parseFloat(value))) {
        tank.currentLevel = parseFloat(value.replace(',', '.'));
      }
    });

    // Calculate status
    const level = tank.currentLevel || 0;
    if (level < 25) {
      tank.status = 'critical';
    } else if (level < (tank.minLevel || 50)) {
      tank.status = 'low';
    } else if (level > (tank.maxLevel || 950)) {
      tank.status = 'high';
    } else {
      tank.status = 'normal';
    }

    tanks.push(tank as Tank);
  });

  return tanks;
};

// Parse JSON format data
const parseJsonFormat = (data: unknown): Tank[] => {
  try {
    let tanksData = data;

    // Handle different JSON structures
    if ((data as { tanks?: unknown }).tanks && Array.isArray((data as { tanks: unknown[] }).tanks)) {
      tanksData = (data as { tanks: unknown[] }).tanks;
    } else if (!Array.isArray(data)) {
      throw new Error('Invalid JSON data structure - expected array');
    }

    return (tanksData as unknown[]).map((item: unknown, index: number) => {
      if (!item.id || !item.name || item.currentLevel === undefined) {
        throw new Error(`Missing required fields in JSON item ${index}: id, name, or currentLevel`);
      }

      return {
        id: String(item.id),
        name: item.name,
        currentLevel: parseFloat(item.level || item.currentLevel),
        maxCapacity: parseFloat(item.maxCapacity || 1000),
        minLevel: parseFloat(item.minLevel || 50),
        maxLevel: parseFloat(item.maxLevel || 950),
        unit: item.unit || 'mm',
        status: item.status || 'normal',
        lastUpdated: new Date(item.lastUpdated || Date.now()),
        location: item.location || '',
      };
    });
  } catch (error) {
    console.error('Error parsing JSON data:', error);
    throw error;
  }
};

// Main function to load tanks from data source
export const loadTanksFromDataSource = async (dataSource: DataSourceConfig): Promise<Tank[]> => {
  try {
    switch (dataSource.type) {
      case 'csv-file':
      case 'txt-file':
        if (!dataSource.filePath) {
          throw new Error('No file path specified');
        }

        // For now, use preview data if available
        if (dataSource.previewData && dataSource.previewData.length > 0) {
          if (dataSource.isVerticalFormat) {
            // Preview data is already grouped for vertical format
            const allLines: string[] = [];
            dataSource.previewData.forEach(record => {
              if (Array.isArray(record)) {
                allLines.push(...record);
              }
            });
            return parseVerticalFormat(allLines, dataSource);
          } else {
            // Convert preview data back to lines for horizontal format
            const lines = dataSource.previewData.map(row =>
              Array.isArray(row) ? row.join(dataSource.delimiter || ',') : String(row),
            );
            return parseHorizontalFormat(lines, dataSource);
          }
        }

        // No preview data available
        throw new Error('No preview data available for text file');

      case 'json-file':
        if (dataSource.previewData && dataSource.previewData.length > 0) {
          return parseJsonFormat(dataSource.previewData);
        }
        throw new Error('No preview data available for JSON file');

      case 'serial-port':
        throw new Error('Serial port data source not implemented');

      default:
        throw new Error(`Unsupported data source type: ${dataSource.type}`);
    }
  } catch (error) {
    console.error('Error loading tanks from data source:', error);
    throw error;
  }
};

// Helper function to estimate tank count from file
export const estimateTankCount = (dataSource: DataSourceConfig): number => {
  if (!dataSource.previewData || dataSource.previewData.length === 0) {
    return 12; // Default
  }

  if (dataSource.isVerticalFormat) {
    return dataSource.previewData.length; // Each preview record is one tank
  } else {
    return dataSource.previewData.length; // Each line is one tank
  }
};
