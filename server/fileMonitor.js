import chokidar from 'chokidar';
import { FlexibleFileParser, DataMapper } from './fileParser.js';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';

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
      options = {}
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
        ...options
      },
      lastModified: null,
      lastData: null,
      errors: []
    };

    this.sources.set(id, source);
    
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
    return true;
  }

  /**
   * Start monitoring all sources
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Starting flexible file monitor...');
    
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
    console.log('Stopping flexible file monitor...');
    
    for (const source of this.sources.values()) {
      this.stopWatching(source);
    }
  }

  /**
   * Start watching a specific source
   */
  startWatching(source) {
    try {
      if (source.type === 'file') {
        if (source.polling) {
          this.startPolling(source);
        } else {
          this.startFileWatching(source);
        }
      } else if (source.type === 'directory') {
        this.startDirectoryWatching(source);
      }
      
      // Initial load
      this.loadSource(source);
    } catch (error) {
      console.error(`Error starting watch for source ${source.id}:`, error);
      this.emit('error', { source: source.id, error });
    }
  }

  /**
   * Stop watching a specific source
   */
  stopWatching(source) {
    // Stop file watcher
    const watcher = this.watchers.get(source.id);
    if (watcher) {
      watcher.close();
      this.watchers.delete(source.id);
    }

    // Stop polling
    const pollInterval = this.pollIntervals.get(source.id);
    if (pollInterval) {
      clearInterval(pollInterval);
      this.pollIntervals.delete(source.id);
    }
  }

  /**
   * Start file watching (using chokidar)
   */
  startFileWatching(source) {
    const watcher = chokidar.watch(source.path, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      }
    });

    watcher.on('change', () => {
      console.log(`File changed: ${source.path}`);
      this.loadSource(source);
    });

    watcher.on('add', () => {
      console.log(`File added: ${source.path}`);
      this.loadSource(source);
    });

    watcher.on('error', (error) => {
      console.error(`Watcher error for ${source.path}:`, error);
      this.emit('error', { source: source.id, error });
    });

    this.watchers.set(source.id, watcher);
  }

  /**
   * Start polling (for files that don't trigger watch events properly)
   */
  startPolling(source) {
    const interval = setInterval(async () => {
      try {
        const stats = await fs.stat(source.path);
        const lastModified = stats.mtime.getTime();
        
        if (!source.lastModified || lastModified > source.lastModified) {
          source.lastModified = lastModified;
          console.log(`Polling detected change: ${source.path}`);
          this.loadSource(source);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`Polling error for ${source.path}:`, error);
        }
      }
    }, source.pollInterval);

    this.pollIntervals.set(source.id, interval);
  }

  /**
   * Start directory watching
   */
  startDirectoryWatching(source) {
    const watcher = chokidar.watch(source.path, {
      persistent: true,
      ignoreInitial: false,
      depth: source.options.recursive ? undefined : 0
    });

    watcher.on('add', (filePath) => {
      if (this.shouldProcessFile(filePath, source)) {
        console.log(`New file in directory: ${filePath}`);
        this.loadFile(filePath, source);
      }
    });

    watcher.on('change', (filePath) => {
      if (this.shouldProcessFile(filePath, source)) {
        console.log(`File changed in directory: ${filePath}`);
        this.loadFile(filePath, source);
      }
    });

    this.watchers.set(source.id, watcher);
  }

  /**
   * Check if a file should be processed based on source configuration
   */
  shouldProcessFile(filePath, source) {
    const ext = path.extname(filePath).toLowerCase();
    const allowedExtensions = source.options.extensions || ['.csv', '.json', '.txt', '.xml', '.tsv'];
    
    return allowedExtensions.includes(ext);
  }

  /**
   * Load data from a source
   */
  async loadSource(source) {
    try {
      if (source.type === 'file') {
        await this.loadFile(source.path, source);
      } else if (source.type === 'directory') {
        await this.loadDirectory(source);
      }
    } catch (error) {
      console.error(`Error loading source ${source.id}:`, error);
      source.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message
      });
      this.emit('error', { source: source.id, error });
    }
  }

  /**
   * Load data from a specific file
   */
  async loadFile(filePath, source) {
    try {
      console.log(`Loading file: ${filePath} for source: ${source.id}`);
      
      // Configure parser with source options
      this.parser.options = { ...this.parser.options, ...source.options };
      
      // Parse the file
      const result = await this.parser.parseFile(filePath, source.format === 'auto' ? null : source.format);
      
      // Map the data to tank fields
      const tanks = source.mapping.mapData(result.data, result.columns);
      
      console.log(`Loaded ${tanks.length} tanks from ${filePath}`);
      
      // Store the data
      source.lastData = {
        tanks,
        columns: result.columns,
        timestamp: new Date().toISOString(),
        filePath
      };
      
      // Emit the data
      this.emit('data', {
        source: source.id,
        tanks,
        columns: result.columns,
        filePath
      });
      
    } catch (error) {
      console.error(`Error loading file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Load data from all files in a directory
   */
  async loadDirectory(source) {
    try {
      const files = await fs.readdir(source.path);
      const tankData = [];
      
      for (const file of files) {
        const filePath = path.join(source.path, file);
        if (this.shouldProcessFile(filePath, source)) {
          try {
            const result = await this.parser.parseFile(filePath, source.format === 'auto' ? null : source.format);
            const tanks = source.mapping.mapData(result.data, result.columns);
            tankData.push(...tanks);
          } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
          }
        }
      }
      
      console.log(`Loaded ${tankData.length} tanks from directory ${source.path}`);
      
      source.lastData = {
        tanks: tankData,
        timestamp: new Date().toISOString(),
        directory: source.path
      };
      
      this.emit('data', {
        source: source.id,
        tanks: tankData,
        directory: source.path
      });
      
    } catch (error) {
      console.error(`Error loading directory ${source.path}:`, error);
      throw error;
    }
  }

  /**
   * Get all current data from all sources
   */
  getAllData() {
    const allData = [];
    
    for (const source of this.sources.values()) {
      if (source.lastData && source.lastData.tanks) {
        allData.push(...source.lastData.tanks);
      }
    }
    
    return allData;
  }

  /**
   * Get source information
   */
  getSourceInfo() {
    return Array.from(this.sources.values()).map(source => ({
      id: source.id,
      type: source.type,
      path: source.path,
      format: source.format,
      polling: source.polling,
      pollInterval: source.pollInterval,
      lastUpdate: source.lastData?.timestamp,
      tankCount: source.lastData?.tanks?.length || 0,
      errors: source.errors.slice(-5) // Last 5 errors
    }));
  }
}
