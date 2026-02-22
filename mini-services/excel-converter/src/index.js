/**
 * Excel to PDF Converter Service
 * 
 * Microservice for converting Excel files to PDF using Microsoft Graph API
 * 
 * Features:
 * - Download Excel from R2
 * - Upload to OneDrive (Microsoft Graph API)
 * - Set page setup (Landscape, Fit-to-width)
 * - Export to PDF
 * - Upload PDF back to R2
 * - Cleanup temporary files
 * 
 * Flow:
 * 1. Client sends POST /preview with fileKey
 * 2. Service downloads Excel from R2
 * 3. Service uploads to OneDrive temp folder
 * 4. Service sets page setup (landscape, fit-to-width)
 * 5. Service exports to PDF via Graph API
 * 6. Service uploads PDF to R2
 * 7. Service deletes temp file from OneDrive
 * 8. Service returns presigned URL for preview
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const converterRoutes = require('./routes/converter');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3031;

// Validate required environment variables
const requiredEnvVars = [
  'TENANT_ID',
  'CLIENT_ID',
  'CLIENT_SECRET',
  'R2_ACCESS_KEY',
  'R2_SECRET_KEY',
  'R2_BUCKET',
  'R2_ENDPOINT'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables', { missing: missingEnvVars });
  console.error('\n❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file\n');
  process.exit(1);
}

// Log configuration (mask sensitive values)
logger.info('Service configuration', {
  port: PORT,
  nodeEnv: process.env.NODE_ENV || 'development',
  tenantId: process.env.TENANT_ID ? process.env.TENANT_ID.substring(0, 8) + '...' : 'missing',
  clientId: process.env.CLIENT_ID ? process.env.CLIENT_ID.substring(0, 8) + '...' : 'missing',
  r2Bucket: process.env.R2_BUCKET,
  r2Endpoint: process.env.R2_ENDPOINT,
  hasClientSecret: !!process.env.CLIENT_SECRET,
  hasR2AccessKey: !!process.env.R2_ACCESS_KEY,
  hasR2SecretKey: !!process.env.R2_SECRET_KEY
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  req.requestId = requestId;
  
  logger.info('Request received', {
    requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip || req.connection.remoteAddress
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Response sent', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
});

// Routes
app.use('/', converterRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Excel to PDF Converter',
    version: '1.0.0',
    description: 'Convert Excel files to PDF using Microsoft Graph API',
    endpoints: {
      'GET /': 'Service info',
      'GET /health': 'Health check with Graph API status',
      'GET /test-connection': 'Test Microsoft Graph API connection',
      'GET /preview/status': 'Check preview status (query: fileKey)',
      'POST /preview': 'Convert Excel to PDF (body: fileKey, force?)',
      'DELETE /preview': 'Delete preview PDF (query: fileKey)',
      'GET /preview/status/:conversionId': 'Get conversion status by ID'
    },
    pageSetup: {
      orientation: 'landscape',
      paperSize: 'A4',
      fitToPagesWide: 1,
      fitToPagesTall: 'auto (0)',
      leftMargin: '1 cm',
      rightMargin: '1 cm',
      topMargin: '1 cm',
      bottomMargin: '0.5 cm'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId: req.requestId
  });
});

// Graceful shutdown
let server;

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  logger.info('Shutdown signal received, closing server gracefully');
  
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Start server
server = app.listen(PORT, () => {
  logger.info(`Excel Converter Service started`, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'development',
    url: `http://localhost:${PORT}`
  });
  
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           Excel to PDF Converter Service                   ║
╠════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                              ║
║  URL:  http://localhost:${PORT}                              ║
║                                                            ║
║  Endpoints:                                                ║
║    GET  /              - Service info                      ║
║    GET  /health        - Health check                      ║
║    POST /preview       - Convert Excel to PDF              ║
║    GET  /preview/status - Check preview status             ║
║    DELETE /preview     - Delete preview                    ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
