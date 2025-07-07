import * as XLSX from 'xlsx';
import { TankTable, TankTableParseResult, VolumeEntry } from '../types/tankTable';

/**
 * Parse CSV content into tank table data
 */
export async function parseCSVTankTable(
  csvContent: string,
  filename: string
): Promise<TankTableParseResult> {
  try {
    const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 2) {
      return {
        success: false,
        errors: ['CSV file must contain at least a header and one data row'],
        warnings: [],
        detectedFormat: 'csv',
        autoMappingApplied: false
      };
    }

    // Try to detect CSV structure
    const header = lines[0].toLowerCase();
    const isHeaderRow = header.includes('height') || header.includes('level') || header.includes('volume');
    
    const dataStartIndex = isHeaderRow ? 1 : 0;
    const volumeEntries: VolumeEntry[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Parse data rows
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i];
      const columns = line.split(',').map(col => col.trim());
      
      if (columns.length < 2) {
        warnings.push(`Row ${i + 1}: Insufficient columns, skipping`);
        continue;
      }

      // Try to parse height and volume
      const heightStr = columns[0].replace(/[^\d.-]/g, '');
      const volumeStr = columns[1].replace(/[^\d.-]/g, '');
      
      const height = parseFloat(heightStr);
      const volume = parseFloat(volumeStr);
      
      if (isNaN(height) || isNaN(volume)) {
        warnings.push(`Row ${i + 1}: Invalid height (${heightStr}) or volume (${volumeStr}), skipping`);
        continue;
      }

      volumeEntries.push({ height, volume });
    }

    if (volumeEntries.length === 0) {
      return {
        success: false,
        errors: ['No valid volume entries found in CSV'],
        warnings,
        detectedFormat: 'csv',
        autoMappingApplied: false
      };
    }

    // Sort by height
    volumeEntries.sort((a, b) => a.height - b.height);

    // Determine max level
    const maxLevel = Math.max(...volumeEntries.map(entry => entry.height));

    const tankTable: TankTable = {
      id: `tank-table-${Date.now()}`,
      maxLevel,
      unit: 'mm', // Assume mm for now
      volumeEntries,
      sourceFile: filename,
      uploadDate: new Date(),
      lastModified: new Date()
    };

    return {
      success: true,
      tankTable,
      errors,
      warnings,
      detectedFormat: 'csv',
      autoMappingApplied: true
    };

  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      detectedFormat: 'csv',
      autoMappingApplied: false
    };
  }
}

/**
 * Parse Excel file into tank table data
 */
export async function parseExcelTankTable(
  file: File
): Promise<TankTableParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    if (workbook.SheetNames.length === 0) {
      return {
        success: false,
        errors: ['Excel file contains no worksheets'],
        warnings: [],
        detectedFormat: 'excel',
        autoMappingApplied: false
      };
    }

    // Use first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      return {
        success: false,
        errors: ['Excel file must contain at least 2 rows of data'],
        warnings: [],
        detectedFormat: 'excel',
        autoMappingApplied: false
      };
    }

    const volumeEntries: VolumeEntry[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Try to detect if first row is header
    const firstRow = jsonData[0] as unknown[];
    const hasHeader = firstRow.some(cell => 
      typeof cell === 'string' && 
      (cell.toLowerCase().includes('height') || 
       cell.toLowerCase().includes('level') || 
       cell.toLowerCase().includes('volume'))
    );

    const dataStartIndex = hasHeader ? 1 : 0;

    // Parse data rows
    for (let i = dataStartIndex; i < jsonData.length; i++) {
      const row = jsonData[i] as unknown[];
      
      if (!row || row.length < 2) {
        warnings.push(`Row ${i + 1}: Insufficient data, skipping`);
        continue;
      }

      // Try to extract height and volume from first two columns
      const height = parseFloat(String(row[0] || '').replace(/[^\d.-]/g, ''));
      const volume = parseFloat(String(row[1] || '').replace(/[^\d.-]/g, ''));
      
      if (isNaN(height) || isNaN(volume)) {
        warnings.push(`Row ${i + 1}: Invalid height or volume data, skipping`);
        continue;
      }

      volumeEntries.push({ height, volume });
    }

    if (volumeEntries.length === 0) {
      return {
        success: false,
        errors: ['No valid volume entries found in Excel file'],
        warnings,
        detectedFormat: 'excel',
        autoMappingApplied: false
      };
    }

    // Sort by height
    volumeEntries.sort((a, b) => a.height - b.height);

    // Determine max level
    const maxLevel = Math.max(...volumeEntries.map(entry => entry.height));

    const tankTable: TankTable = {
      id: `tank-table-${Date.now()}`,
      maxLevel,
      unit: 'mm', // Assume mm for now
      volumeEntries,
      sourceFile: file.name,
      uploadDate: new Date(),
      lastModified: new Date()
    };

    return {
      success: true,
      tankTable,
      errors,
      warnings,
      detectedFormat: 'excel',
      autoMappingApplied: true
    };

  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      detectedFormat: 'excel',
      autoMappingApplied: false
    };
  }
}

/**
 * Parse PDF file into tank table data
 * Note: This is a simplified implementation. In production, you'd need more sophisticated PDF parsing
 */
export async function parsePDFTankTable(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _file: File
): Promise<TankTableParseResult> {
  try {
    // For now, return a placeholder implementation
    // In a real implementation, you'd use pdf-parse or similar library
    return {
      success: false,
      errors: ['PDF parsing not yet implemented. Please convert to Excel or CSV format.'],
      warnings: ['PDF parsing requires additional implementation'],
      detectedFormat: 'pdf',
      autoMappingApplied: false
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      detectedFormat: 'pdf',
      autoMappingApplied: false
    };
  }
}

/**
 * Main function to parse tank table from file
 */
export async function parseTankTableFile(file: File): Promise<TankTableParseResult> {
  const extension = file.name.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'csv': {
      const csvContent = await file.text();
      return parseCSVTankTable(csvContent, file.name);
    }
    
    case 'xlsx':
    case 'xls':
      return parseExcelTankTable(file);
    
    case 'pdf':
      return parsePDFTankTable(file);
    
    default:
      return {
        success: false,
        errors: [`Unsupported file format: ${extension}. Supported formats: CSV, Excel (.xlsx/.xls), PDF`],
        warnings: [],
        detectedFormat: 'unknown',
        autoMappingApplied: false
      };
  }
}

/**
 * Validate tank table data
 */
export function validateTankTable(tankTable: TankTable): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if volume entries exist
  if (!tankTable.volumeEntries || tankTable.volumeEntries.length === 0) {
    errors.push('Tank table must contain volume entries');
  }

  // Check for duplicate heights
  const heights = tankTable.volumeEntries.map(entry => entry.height);
  const duplicateHeights = heights.filter((height, index) => heights.indexOf(height) !== index);
  if (duplicateHeights.length > 0) {
    warnings.push(`Duplicate heights found: ${duplicateHeights.join(', ')}`);
  }

  // Check for negative values
  const negativeHeights = tankTable.volumeEntries.filter(entry => entry.height < 0);
  const negativeVolumes = tankTable.volumeEntries.filter(entry => entry.volume < 0);
  
  if (negativeHeights.length > 0) {
    errors.push('Tank table contains negative height values');
  }
  
  if (negativeVolumes.length > 0) {
    errors.push('Tank table contains negative volume values');
  }

  // Check for reasonable max level
  if (tankTable.maxLevel <= 0) {
    errors.push('Maximum level must be greater than 0');
  }

  if (tankTable.maxLevel > 50000) { // 50 meters seems reasonable for most tanks
    warnings.push('Maximum level seems unusually high (>50m)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
