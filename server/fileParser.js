import fs from 'fs/promises';
import { createReadStream } from 'fs';
import csv from 'csv-parser';
import path from 'path';

/**
 * Enhanced Tank Data Model
 */
export const TANK_FIELDS = {
  // Core fields
  id: { type: 'string', required: true, description: 'Tank identifier' },
  name: { type: 'string', required: false, description: 'Tank name/label' },
  level: { type: 'number', required: true, description: 'Current level' },

  // Capacity fields
  maxCapacity: { type: 'number', required: false, description: 'Maximum capacity' },
  minLevel: { type: 'number', required: false, description: 'Minimum level' },
  maxLevel: { type: 'number', required: false, description: 'Maximum level' },

  // Environmental fields
  temperature: { type: 'number', required: false, description: 'Temperature reading' },
  pressure: { type: 'number', required: false, description: 'Pressure reading' },
  humidity: { type: 'number', required: false, description: 'Humidity reading' },

  // Status fields
  status: { type: 'string', required: false, description: 'Tank status (OK, WARNING, ERROR)' },
  alarmState: { type: 'boolean', required: false, description: 'Alarm active' },

  // Metadata fields
  unit: { type: 'string', required: false, description: 'Unit of measurement' },
  location: { type: 'string', required: false, description: 'Physical location' },
  type: { type: 'string', required: false, description: 'Tank type' },
  lastUpdated: { type: 'date', required: false, description: 'Last update timestamp' },

  // Custom fields (user-defined)
  custom1: { type: 'any', required: false, description: 'Custom field 1' },
  custom2: { type: 'any', required: false, description: 'Custom field 2' },
  custom3: { type: 'any', required: false, description: 'Custom field 3' },
};

/**
 * File Format Detector
 */
export class FileFormatDetector {
  static async detectFormat(filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const sample = await this.readFileSample(filePath, 1024);

      // Extension-based detection
      if (ext === '.json') return 'json';
      if (ext === '.xml') return 'xml';
      if (ext === '.csv') return 'csv';
      if (ext === '.tsv') return 'tsv';
      if (ext === '.txt') return await this.detectTextFormat(sample);

      // Content-based detection
      return await this.detectByContent(sample);
    } catch (error) {
      console.error('Format detection error:', error);
      return 'unknown';
    }
  }

  static async readFileSample(filePath, bytes = 1024) {
    const buffer = Buffer.alloc(bytes);
    const fd = await fs.open(filePath, 'r');
    try {
      const { bytesRead } = await fd.read(buffer, 0, bytes, 0);
      return buffer.subarray(0, bytesRead).toString('utf8');
    } finally {
      await fd.close();
    }
  }

  static async detectTextFormat(sample) {
    // Check for JSON
    if (sample.trim().startsWith('{') || sample.trim().startsWith('[')) {
      return 'json';
    }

    // Check for XML
    if (sample.trim().startsWith('<')) {
      return 'xml';
    }

    // Check for CSV patterns
    const lines = sample.split('\n').filter(line => line.trim());
    if (lines.length >= 2) {
      const firstLine = lines[0];
      const secondLine = lines[1];

      // Check for common delimiters
      const delimiters = [',', ';', '\t', '|', ':'];
      for (const delimiter of delimiters) {
        const firstCount = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
        const secondCount = (secondLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;

        if (firstCount > 0 && firstCount === secondCount) {
          return delimiter === '\t' ? 'tsv' : 'csv';
        }
      }
    }

    // Check for fixed-width
    if (this.isFixedWidth(sample)) {
      return 'fixed-width';
    }

    return 'text';
  }

  static async detectByContent(sample) {
    return await this.detectTextFormat(sample);
  }

  static isFixedWidth(sample) {
    const lines = sample.split('\n').filter(line => line.trim()).slice(0, 5);
    if (lines.length < 2) return false;

    // Check if lines have consistent spacing patterns
    const firstLineSpaces = this.getSpacePositions(lines[0]);
    return lines.slice(1).every(line => {
      const spaces = this.getSpacePositions(line);
      return this.arraysMatch(firstLineSpaces, spaces, 2); // Allow 2 char tolerance
    });
  }

  static getSpacePositions(line) {
    const positions = [];
    for (let i = 0; i < line.length; i++) {
      if (line[i] === ' ' && (i === 0 || line[i - 1] !== ' ')) {
        positions.push(i);
      }
    }
    return positions;
  }

  static arraysMatch(arr1, arr2, tolerance = 0) {
    if (Math.abs(arr1.length - arr2.length) > tolerance) return false;
    const minLength = Math.min(arr1.length, arr2.length);

    for (let i = 0; i < minLength; i++) {
      if (Math.abs(arr1[i] - arr2[i]) > tolerance) return false;
    }
    return true;
  }
}

/**
 * Flexible File Parser
 */
export class FlexibleFileParser {
  constructor(options = {}) {
    this.options = {
      encoding: 'utf8',
      autoDetectDelimiter: true,
      autoDetectHeaders: true,
      skipEmptyLines: true,
      trimValues: true,
      ...options,
    };
  }

  async parseFile(filePath, format = null) {
    try {
      if (!format) {
        format = await FileFormatDetector.detectFormat(filePath);
      }

      console.log(`Parsing file ${filePath} as ${format}`);

      switch (format) {
        case 'json':
          return await this.parseJSON(filePath);
        case 'csv':
        case 'tsv':
          return await this.parseCSV(filePath, format === 'tsv' ? '\t' : null);
        case 'xml':
          return await this.parseXML(filePath);
        case 'fixed-width':
          return await this.parseFixedWidth(filePath);
        case 'text':
          return await this.parseText(filePath);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error('Parse error:', error);
      throw error;
    }
  }

  async parseJSON(filePath) {
    const content = await fs.readFile(filePath, this.options.encoding);
    const data = JSON.parse(content);

    // Handle different JSON structures
    if (Array.isArray(data)) {
      return { data, columns: this.extractJSONColumns(data) };
    } else if (data.tanks && Array.isArray(data.tanks)) {
      return { data: data.tanks, columns: this.extractJSONColumns(data.tanks) };
    } else if (typeof data === 'object') {
      // Single object - convert to array
      return { data: [data], columns: this.extractJSONColumns([data]) };
    }

    throw new Error('Invalid JSON structure for tank data');
  }

  extractJSONColumns(data) {
    if (!data.length) return [];

    const columns = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => columns.add(key));
    });

    return Array.from(columns).map(col => ({
      name: col,
      type: this.inferDataType(data.map(item => item[col]).filter(v => v != null)),
    }));
  }

  async parseCSV(filePath, delimiter = null) {
    return new Promise(async (resolve, reject) => {
      const results = [];
      let columns = [];
      let isFirstRow = true;

      // Auto-detect delimiter if not provided
      if (!delimiter && this.options.autoDetectDelimiter) {
        delimiter = await this.detectCSVDelimiter(filePath);
      }

      const parser = csv({
        separator: delimiter || ',',
        headers: this.options.autoDetectHeaders,
        skipEmptyLines: this.options.skipEmptyLines,
        mapValues: ({ value }) => this.options.trimValues ? value.trim() : value,
      });

      createReadStream(filePath, { encoding: this.options.encoding })
        .pipe(parser)
        .on('headers', (headers) => {
          columns = headers.map(header => ({
            name: header,
            type: 'string', // Will be inferred later
          }));
        })
        .on('data', (data) => {
          if (isFirstRow && !this.options.autoDetectHeaders) {
            // Use first row as headers if auto-detect is off
            columns = Object.keys(data).map(key => ({ name: key, type: 'string' }));
            isFirstRow = false;
          }
          results.push(data);
        })
        .on('end', () => {
          // Infer column types from data
          columns = this.inferColumnTypes(columns, results);
          resolve({ data: results, columns });
        })
        .on('error', reject);
    });
  }

  async detectCSVDelimiter(filePath) {
    const sample = await FileFormatDetector.readFileSample(filePath, 2048);
    const lines = sample.split('\n').filter(line => line.trim()).slice(0, 3);

    const delimiters = [',', ';', '\t', '|', ':'];
    let bestDelimiter = ',';
    let bestScore = 0;

    for (const delimiter of delimiters) {
      const counts = lines.map(line =>
        (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length,
      );

      if (counts.length >= 2 && counts[0] > 0) {
        const consistency = counts.every(count => count === counts[0]);
        const score = counts[0] * (consistency ? 2 : 1);

        if (score > bestScore) {
          bestScore = score;
          bestDelimiter = delimiter;
        }
      }
    }

    return bestDelimiter;
  }

  async parseXML(filePath) {
    // Basic XML parsing - can be enhanced with xml2js if needed
    const content = await fs.readFile(filePath, this.options.encoding);

    // Simple XML parsing for tank data
    const tankMatches = content.match(/<tank[^>]*>[\s\S]*?<\/tank>/gi) || [];
    const data = tankMatches.map(tankXml => {
      const tank = {};

      // Extract attributes
      const attrMatch = tankXml.match(/<tank([^>]*)>/);
      if (attrMatch) {
        const attrs = attrMatch[1].match(/(\w+)="([^"]*)"/g) || [];
        attrs.forEach(attr => {
          const [, key, value] = attr.match(/(\w+)="([^"]*)"/);
          tank[key] = value;
        });
      }

      // Extract child elements
      const elementMatches = tankXml.match(/<(\w+)>([^<]*)<\/\1>/g) || [];
      elementMatches.forEach(element => {
        const [, key, value] = element.match(/<(\w+)>([^<]*)<\/\1>/);
        tank[key] = value;
      });

      return tank;
    });

    return { data, columns: this.extractJSONColumns(data) };
  }

  async parseFixedWidth(filePath) {
    const content = await fs.readFile(filePath, this.options.encoding);
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('Fixed-width file needs at least 2 lines');
    }

    // Detect column positions from first few lines
    const positions = this.detectFixedWidthPositions(lines.slice(0, 5));
    const headers = this.extractFixedWidthValues(lines[0], positions);

    const data = lines.slice(1).map(line => {
      const values = this.extractFixedWidthValues(line, positions);
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim() || `col_${index}`] = values[index]?.trim() || '';
      });
      return row;
    });

    const columns = headers.map(header => ({
      name: header.trim() || 'unnamed',
      type: 'string',
    }));

    return { data, columns: this.inferColumnTypes(columns, data) };
  }

  detectFixedWidthPositions(lines) {
    // Find consistent column boundaries
    const positions = [0];
    const maxLength = Math.max(...lines.map(line => line.length));

    for (let pos = 1; pos < maxLength; pos++) {
      const isColumnBoundary = lines.every(line => {
        if (pos >= line.length) return true;
        return line[pos] === ' ' && (pos === 0 || line[pos - 1] !== ' ');
      });

      if (isColumnBoundary) {
        positions.push(pos);
      }
    }

    positions.push(maxLength);
    return positions;
  }

  extractFixedWidthValues(line, positions) {
    const values = [];
    for (let i = 0; i < positions.length - 1; i++) {
      const start = positions[i];
      const end = positions[i + 1];
      values.push(line.substring(start, end));
    }
    return values;
  }

  async parseText(filePath) {
    const content = await fs.readFile(filePath, this.options.encoding);
    const lines = content.split('\n').filter(line => line.trim());

    // Try to parse as space-separated values
    const data = lines.map((line, index) => {
      const values = line.trim().split(/\s+/);
      const row = { line_number: index + 1 };
      values.forEach((value, i) => {
        row[`col_${i + 1}`] = value;
      });
      return row;
    });

    // Generate columns based on maximum number of values in any line
    const maxCols = Math.max(...data.map(row =>
      Object.keys(row).filter(key => key.startsWith('col_')).length,
    ));

    const columns = [
      { name: 'line_number', type: 'number' },
      ...Array.from({ length: maxCols }, (_, i) => ({
        name: `col_${i + 1}`,
        type: 'string',
      })),
    ];

    return { data, columns: this.inferColumnTypes(columns, data) };
  }

  inferColumnTypes(columns, data) {
    return columns.map(col => ({
      ...col,
      type: this.inferDataType(data.map(row => row[col.name]).filter(v => v != null && v !== '')),
    }));
  }

  inferDataType(values) {
    if (!values.length) return 'string';

    const sample = values.slice(0, 100); // Sample first 100 values

    // Check for numbers
    const numberCount = sample.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length;
    if (numberCount / sample.length > 0.8) {
      // Check if integers
      const intCount = sample.filter(v => Number.isInteger(parseFloat(v))).length;
      return intCount / numberCount > 0.9 ? 'integer' : 'number';
    }

    // Check for booleans
    const boolCount = sample.filter(v =>
      ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(String(v).toLowerCase()),
    ).length;
    if (boolCount / sample.length > 0.8) return 'boolean';

    // Check for dates
    const dateCount = sample.filter(v => !isNaN(Date.parse(v))).length;
    if (dateCount / sample.length > 0.8) return 'date';

    return 'string';
  }
}

/**
 * Data Mapper - Maps parsed data to tank fields
 */
export class DataMapper {
  constructor(mapping = {}) {
    this.mapping = mapping;
  }

  mapData(data, columns) {
    return data.map(row => this.mapRow(row, columns));
  }

  mapRow(row, columns) {
    const tank = {};

    // Apply field mappings
    Object.entries(this.mapping).forEach(([tankField, sourceField]) => {
      if (sourceField && row[sourceField] !== undefined) {
        tank[tankField] = this.convertValue(row[sourceField], TANK_FIELDS[tankField]?.type);
      }
    });

    // Ensure required fields
    if (!tank.id) {
      tank.id = row.id || row.tank_id || row.tankId || `tank_${Math.random().toString(36).substr(2, 9)}`;
    }

    if (tank.level === undefined || tank.level === null) {
      tank.level = 0;
    }

    // Add timestamp if not present
    if (!tank.lastUpdated) {
      tank.lastUpdated = new Date().toISOString();
    }

    return tank;
  }

  convertValue(value, targetType) {
    if (value === null || value === undefined || value === '') return null;

    switch (targetType) {
      case 'number':
      case 'integer':
        const num = parseFloat(value);
        return isNaN(num) ? null : num;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        const str = String(value).toLowerCase();
        return ['true', '1', 'yes', 'on', 'enabled'].includes(str);

      case 'date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();

      default:
        return String(value);
    }
  }

  static suggestMapping(columns) {
    const suggestions = {};

    // Common field name patterns
    const patterns = {
      id: /^(id|tank_?id|tankid|identifier|tank_?name)$/i,
      name: /^(name|tank_?name|label|title|description)$/i,
      level: /^(level|current_?level|value|amount|quantity|volume)$/i,
      maxCapacity: /^(max_?capacity|capacity|max_?volume|total_?capacity)$/i,
      minLevel: /^(min_?level|minimum|low_?limit)$/i,
      maxLevel: /^(max_?level|maximum|high_?limit)$/i,
      temperature: /^(temp|temperature|temp_?c|temp_?f)$/i,
      pressure: /^(pressure|press|psi|bar|pascal)$/i,
      humidity: /^(humidity|humid|rh|relative_?humidity)$/i,
      status: /^(status|state|condition|alarm)$/i,
      unit: /^(unit|units|measurement|uom)$/i,
      location: /^(location|position|zone|area|site)$/i,
      type: /^(type|kind|category|class)$/i,
    };

    columns.forEach(col => {
      Object.entries(patterns).forEach(([field, pattern]) => {
        if (pattern.test(col.name)) {
          suggestions[field] = col.name;
        }
      });
    });

    return suggestions;
  }
}
