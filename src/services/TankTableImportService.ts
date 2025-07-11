import { 
  TankTable, 
  TankTableEntry, 
  TankTableImportResult, 
  TankTableValidationError,
  TankCalibrationPoint 
} from '../types/tankTable';
import { TankTableStorage } from '../storage/TankTableStorage';

export class TankTableImportService {
  private storage = TankTableStorage.getInstance();

  async importFromCSV(file: File, tableName?: string): Promise<TankTableImportResult> {
    const result: TankTableImportResult = {
      success: false,
      errors: [],
      warnings: [],
      tanks_imported: 0
    };

    try {
      const csvText = await this.readFileAsText(file);
      const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      if (lines.length < 2) {
        result.errors.push('CSV file must contain at least a header row and one data row');
        return result;
      }

      const headers = this.parseCSVLine(lines[0]);
      const requiredHeaders = ['tank_id', 'tank_name', 'max_height_mm', 'max_volume_liters', 'calibration_data'];
      
      // Validate headers
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      if (missingHeaders.length > 0) {
        result.errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
        return result;
      }

      const tanks: TankTableEntry[] = [];
      const errors: TankTableValidationError[] = [];

      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        
        if (values.length !== headers.length) {
          errors.push({
            row: i + 1,
            column: 'all',
            message: `Row has ${values.length} columns but header has ${headers.length}`,
            severity: 'error'
          });
          continue;
        }

        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index];
        });

        const tankEntry = this.parseRowToTankEntry(rowData, i + 1, errors);
        if (tankEntry) {
          tanks.push(tankEntry);
        }
      }

      // Check for errors
      const criticalErrors = errors.filter(e => e.severity === 'error');
      if (criticalErrors.length > 0) {
        result.errors = criticalErrors.map(e => `Row ${e.row}, ${e.column}: ${e.message}`);
        return result;
      }

      // Create tank table
      const tankTable: TankTable = {
        id: `table-${Date.now()}`,
        name: tableName || file.name.replace('.csv', ''),
        description: `Imported from ${file.name}`,
        created_date: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        version: '1.0.0',
        tanks: tanks
      };

      // Save to storage
      this.storage.saveTankTable(tankTable);

      result.success = true;
      result.tank_table = tankTable;
      result.tanks_imported = tanks.length;
      result.warnings = errors.filter(e => e.severity === 'warning').map(e => `Row ${e.row}: ${e.message}`);

      return result;

    } catch (error) {
      result.errors.push(`Failed to import CSV: ${error.message}`);
      return result;
    }
  }

  private parseRowToTankEntry(rowData: Record<string, string>, rowNumber: number, errors: TankTableValidationError[]): TankTableEntry | null {
    try {
      const tank_id = rowData.tank_id?.trim();
      const tank_name = rowData.tank_name?.trim();
      const max_height_mm = parseFloat(rowData.max_height_mm);
      const max_volume_liters = parseFloat(rowData.max_volume_liters);
      const tank_type = rowData.tank_type?.trim() as any || 'other';
      const location = rowData.location?.trim() || '';
      const calibration_data_str = rowData.calibration_data?.trim();

      // Validate required fields
      if (!tank_id) {
        errors.push({ row: rowNumber, column: 'tank_id', message: 'Tank ID is required', severity: 'error' });
        return null;
      }

      if (!tank_name) {
        errors.push({ row: rowNumber, column: 'tank_name', message: 'Tank name is required', severity: 'error' });
        return null;
      }

      if (isNaN(max_height_mm) || max_height_mm <= 0) {
        errors.push({ row: rowNumber, column: 'max_height_mm', message: 'Max height must be a positive number', severity: 'error' });
        return null;
      }

      if (isNaN(max_volume_liters) || max_volume_liters <= 0) {
        errors.push({ row: rowNumber, column: 'max_volume_liters', message: 'Max volume must be a positive number', severity: 'error' });
        return null;
      }

      // Parse calibration data
      const calibration_data = this.parseCalibrationData(calibration_data_str, rowNumber, errors);
      if (!calibration_data) {
        return null;
      }

      return {
        tank_id,
        tank_name,
        max_height_mm,
        max_volume_liters,
        tank_type,
        location,
        calibration_data,
        description: rowData.description?.trim(),
        manufacturer: rowData.manufacturer?.trim(),
        installation_date: rowData.installation_date?.trim(),
        last_calibrated: rowData.last_calibrated?.trim()
      };

    } catch (error) {
      errors.push({ row: rowNumber, column: 'all', message: `Failed to parse row: ${error.message}`, severity: 'error' });
      return null;
    }
  }

  private parseCalibrationData(calibrationStr: string, rowNumber: number, errors: TankTableValidationError[]): TankCalibrationPoint[] | null {
    if (!calibrationStr) {
      errors.push({ row: rowNumber, column: 'calibration_data', message: 'Calibration data is required', severity: 'error' });
      return null;
    }

    try {
      // Format: "0:0,100:750,200:1500,300:2250"
      const points: TankCalibrationPoint[] = [];
      const pairs = calibrationStr.split(',');

      for (const pair of pairs) {
        const [heightStr, volumeStr] = pair.split(':');
        const height_mm = parseFloat(heightStr.trim());
        const volume_liters = parseFloat(volumeStr.trim());

        if (isNaN(height_mm) || isNaN(volume_liters)) {
          errors.push({ 
            row: rowNumber, 
            column: 'calibration_data', 
            message: `Invalid calibration point: ${pair}`, 
            severity: 'error' 
          });
          return null;
        }

        points.push({ height_mm, volume_liters });
      }

      // Sort by height and validate
      points.sort((a, b) => a.height_mm - b.height_mm);

      if (points.length < 2) {
        errors.push({ 
          row: rowNumber, 
          column: 'calibration_data', 
          message: 'At least 2 calibration points required', 
          severity: 'error' 
        });
        return null;
      }

      // Validate that volumes increase with height
      for (let i = 1; i < points.length; i++) {
        if (points[i].volume_liters < points[i-1].volume_liters) {
          errors.push({ 
            row: rowNumber, 
            column: 'calibration_data', 
            message: 'Volume must increase with height', 
            severity: 'warning' 
          });
        }
      }

      return points;

    } catch (error) {
      errors.push({ 
        row: rowNumber, 
        column: 'calibration_data', 
        message: `Failed to parse calibration data: ${error.message}`, 
        severity: 'error' 
      });
      return null;
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Validate tank table
  validateTankTable(tankTable: TankTable): TankTableValidationError[] {
    const errors: TankTableValidationError[] = [];
    
    // Check for duplicate tank IDs
    const tankIds = new Set();
    tankTable.tanks.forEach((tank, index) => {
      if (tankIds.has(tank.tank_id)) {
        errors.push({
          row: index + 1,
          column: 'tank_id',
          message: `Duplicate tank ID: ${tank.tank_id}`,
          severity: 'error'
        });
      }
      tankIds.add(tank.tank_id);
    });

    return errors;
  }
}
