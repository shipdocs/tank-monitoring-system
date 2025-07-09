import chokidar from 'chokidar';
import { DataMapper, FlexibleFileParser } from './fileParser.js';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import { createModuleLogger, logError, logPerformance } from './logger.js';

// Create module logger
const logger = createModuleLogger('file-monitor');

/**
 * Flexible File Monitor
 * Watches multiple files and data sources for tank data
 */
export class FlexibleFileMonitor extends EventEmitter {
  constructor() {
    super();
    this.watchers = new Map();
    this.sources = new Map();
    this.parser = new FlexibleFileParser();
    this.isRunning = false;
    this.pollIntervals = new Map();
  }

  /**
   * Add a data source to monitor
   */
  addSource(sourceConfig) {
    const {
      id,
      type = 'file', // file, directory, url
      path: sourcePath,
      format = 'auto', // auto, csv, json, xml, txt, fixed-width
      encoding = 'utf8',
      polling = false,
      pollInterval = 30000,
      mapping = {},
      options = {},
    } = sourceConfig;

    const source = {
      id,
      type,
      path: sourcePath,
      format,
      encoding,
      polling,
      pollInterval,
      mapping: new DataMapper(mapping),
      options: {
        autoDetectDelimiter: true,
        autoDetectHeaders: true,
        skipEmptyLines: true,
        trimValues: true,
        ...options,
      },
      lastModified: null,
      lastData: null,
      errors: [],
    };

    this.sources.set(id, source);
    logger.info('Added data source', { id, type, path: sourcePath });

    if (this.isRunning) {
      this.startWatching(source);
    }

    return source;
  }

  /**
   * Remove a data source
   */
  removeSource(sourceId) {
    const source = this.sources.get(sourceId);
    if (!source) return false;

    this.stopWatching(source);
    this.sources.delete(sourceId);
    logger.info('Removed data source', { id: sourceId });
    return true;
  }

  /**
   * Start monitoring all sources
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    logger.info('Starting flexible file monitor', { sourceCount: this.sources.size });

    for (const source of this.sources.values()) {
      this.startWatching(source);
    }
  }

  /**
   * Stop monitoring all sources
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    logger.info('Stopping flexible file monitor');

    for (const source of this.sources.values()) {
      this.stopWatching(source);
    }
  }

  /**
   * Start watching a specific source
   */
  async startWatching(source) {
    logger.debug('Starting to watch source', { id: source.id, type: source.type });

    switch (source.type) {
      case 'file':
        await this.watchFile(source);
        break;
      case 'directory':
        await this.watchDirectory(source);
        break;
      case 'url':
        await this.watchUrl(source);
        break;
      default:
        logger.error('Unknown source type', { type: source.type, id: source.id });
    }
  }

  /**
   * Stop watching a specific source
   */
  stopWatching(source) {
    logger.debug('Stopping watch for source', { id: source.id });

    // Stop file watcher
    const watcher = this.watchers.get(source.id);
    if (watcher) {
      watcher.close();
      this.watchers.delete(source.id);
    }

    // Stop polling interval
    const interval = this.pollIntervals.get(source.id);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(source.id);
    }
  }

  /**
   * Watch a file
   */
  async watchFile(source) {
    try {
      // Initial read
      await this.readSource(source);

      if (source.polling) {
        // Polling mode
        const interval = setInterval(() => {
          this.readSource(source);
        }, source.pollInterval);
        this.pollIntervals.set(source.id, interval);
        logger.info('Started polling file', {
          id: source.id,
          path: source.path,
          interval: source.pollInterval,
        });
      } else {
        // File watcher mode
        const watcher = chokidar.watch(source.path, {
          persistent: true,
          ignoreInitial: true,
        });

        watcher.on('change', () => {
          logger.debug('File changed', { id: source.id, path: source.path });
          this.readSource(source);
        });

        watcher.on('error', (error) => {
          logError(error, { context: 'File watcher error', sourceId: source.id });
          this.handleError(source, error);
        });

        this.watchers.set(source.id, watcher);
        logger.info('Started watching file', { id: source.id, path: source.path });
      }
    } catch (error) {
      logError(error, { context: 'Error watching file', sourceId: source.id });
      this.handleError(source, error);
    }
  }

  /**
   * Watch a directory
   */
  async watchDirectory(source) {
    try {
      const extensions = source.options.extensions || ['.csv', '.json', '.txt', '.xml'];

      // Watch directory for changes
      const watcher = chokidar.watch(source.path, {
        persistent: true,
        ignoreInitial: false,
        depth: source.options.recursive ? undefined : 0,
      });

      watcher.on('add', (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (extensions.includes(ext)) {
          logger.debug('New file detected in directory', {
            id: source.id,
            file: filePath,
          });
          this.readFile(source, filePath);
        }
      });

      watcher.on('change', (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (extensions.includes(ext)) {
          logger.debug('File changed in directory', {
            id: source.id,
            file: filePath,
          });
          this.readFile(source, filePath);
        }
      });

      watcher.on('error', (error) => {
        logError(error, { context: 'Directory watcher error', sourceId: source.id });
        this.handleError(source, error);
      });

      this.watchers.set(source.id, watcher);
      logger.info('Started watching directory', {
        id: source.id,
        path: source.path,
        extensions,
      });
    } catch (error) {
      logError(error, { context: 'Error watching directory', sourceId: source.id });
      this.handleError(source, error);
    }
  }

  /**
   * Watch a URL
   */
  async watchUrl(source) {
    // Validate URL to prevent SSRF attacks - user input is validated before use
    if (!this.isValidUrl(source.path)) {
      const error = new Error(`Invalid or unsafe URL: ${source.path}`);
      logError(error, { context: 'URL validation failed', sourceId: source.id });
      this.handleError(source, error);
      return;
    }

    // URL polling
    const pollUrl = async () => {
      try {
        const response = await fetch(source.path, {
          headers: source.options.headers || {},
          timeout: 10000, // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        let data;

        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        await this.processData(source, data, source.format || 'auto');
      } catch (error) {
        logError(error, { context: 'Error fetching URL', sourceId: source.id });
        this.handleError(source, error);
      }
    };

    // Initial fetch
    await pollUrl();

    // Set up polling
    const interval = setInterval(pollUrl, source.pollInterval);
    this.pollIntervals.set(source.id, interval);
    logger.info('Started polling URL', {
      id: source.id,
      url: source.path,
      interval: source.pollInterval,
    });
  }

  /**
   * Read a source
   */
  async readSource(source) {
    if (source.type === 'file') {
      await this.readFile(source, source.path);
    }
  }

  /**
   * Read a file
   */
  async readFile(source, filePath) {
    const startTime = Date.now();
    try {
      // Check if file exists
      await fs.access(filePath);

      // Get file stats
      const stats = await fs.stat(filePath);

      // Skip if file hasn't changed
      if (source.lastModified && stats.mtime.getTime() === source.lastModified) {
        return;
      }

      // Parse file
      const result = await this.parser.parseFile(filePath, source.format);
      const duration = Date.now() - startTime;

      logPerformance('File parse', duration, {
        sourceId: source.id,
        filePath,
        rowCount: result.data.length,
      });

      // Map data to tank format
      const tanks = source.mapping.mapData(result.data, result.columns);

      // Update source info
      source.lastModified = stats.mtime.getTime();
      source.lastData = tanks;
      source.lastUpdate = new Date();
      source.errors = [];

      // Emit data event
      this.emit('data', {
        source: source.id,
        tanks,
        metadata: {
          filePath,
          format: result.format,
          columns: result.columns,
          rowCount: result.data.length,
          mappedCount: tanks.length,
        },
      });

      logger.info('Successfully processed file', {
        sourceId: source.id,
        filePath,
        tankCount: tanks.length,
        duration: `${duration}ms`,
      });

    } catch (error) {
      logError(error, { context: 'Error reading file', sourceId: source.id, filePath });
      this.handleError(source, error);
    }
  }

  /**
   * Process raw data
   */
  async processData(source, data, format) {
    try {
      let result;

      if (typeof data === 'object') {
        // Already parsed JSON
        result = {
          data: Array.isArray(data) ? data : [data],
          columns: data.length > 0 ? Object.keys(data[0]) : [],
          format: 'json',
        };
      } else {
        // Parse text data
        result = await this.parser.parseText(data, format);
      }

      // Map data to tank format
      const tanks = source.mapping.mapData(result.data, result.columns);

      // Update source info
      source.lastData = tanks;
      source.lastUpdate = new Date();
      source.errors = [];

      // Emit data event
      this.emit('data', {
        source: source.id,
        tanks,
        metadata: {
          format: result.format,
          columns: result.columns,
          rowCount: result.data.length,
          mappedCount: tanks.length,
        },
      });

      logger.info('Successfully processed data', {
        sourceId: source.id,
        tankCount: tanks.length,
        format,
      });

    } catch (error) {
      logError(error, { context: 'Error processing data', sourceId: source.id });
      this.handleError(source, error);
    }
  }

  /**
   * Validate URL to prevent SSRF attacks
   */
  isValidUrl(urlString) {
    try {
      const url = new URL(urlString);

      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return false;
      }

      // Block private/internal IP ranges
      const hostname = url.hostname.toLowerCase();

      // Block localhost and loopback
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return false;
      }

      // Block private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const ipMatch = hostname.match(ipv4Regex);
      if (ipMatch) {
        const [, a, b, _c, _d] = ipMatch.map(Number);
        if (
          (a === 10) ||
          (a === 172 && b >= 16 && b <= 31) ||
          (a === 192 && b === 168) ||
          (a === 169 && b === 254) // Link-local
        ) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Handle errors
   */
  handleError(source, error) {
    source.errors.push({
      timestamp: new Date(),
      message: error.message,
      stack: error.stack,
    });

    // Keep only last 10 errors
    if (source.errors.length > 10) {
      source.errors = source.errors.slice(-10);
    }

    this.emit('error', {
      source: source.id,
      error,
    });
  }

  /**
   * Get information about all sources
   */
  getSourceInfo() {
    const info = [];

    for (const [id, source] of this.sources) {
      info.push({
        id,
        type: source.type,
        path: source.path,
        format: source.format,
        enabled: this.isRunning,
        lastUpdate: source.lastUpdate,
        lastDataCount: source.lastData?.length || 0,
        errorCount: source.errors.length,
        lastError: source.errors[source.errors.length - 1]?.message,
      });
    }

    return info;
  }
}
