#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import logger, { createModuleLogger } from './logger.js';

const app = express();
const PORT = 3001;
const moduleLogger = createModuleLogger('minimal-server');

// Middleware
app.use(cors());
app.use(express.json());

// Simple test route
app.get('/test', (req, res) => {
  moduleLogger.info('Test route accessed');
  res.json({ message: 'Logging system working!', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  moduleLogger.info('Minimal server running', { port: PORT });
});

moduleLogger.info('Server started successfully with logging');
