/**
 * Converter Routes
 * API endpoints for Excel to PDF conversion
 */

const express = require('express');
const router = express.Router();
const converterService = require('../services/converterService');
const logger = require('../utils/logger');

/**
 * Health check endpoint
 * GET /health
 */
router.get('/health', async (req, res) => {
  try {
    const graphApiStatus = await converterService.testConnection();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'excel-converter',
      version: '1.0.0',
      graphApi: graphApiStatus.success ? 'connected' : 'disconnected',
      graphApiMessage: graphApiStatus.message || graphApiStatus.error
    });
  } catch (error) {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'excel-converter',
      version: '1.0.0',
      graphApi: 'unknown'
    });
  }
});

/**
 * Check preview status
 * GET /preview/status
 * Query params:
 *   - fileKey: R2 file key
 */
router.get('/preview/status', async (req, res) => {
  try {
    const { fileKey } = req.query;

    if (!fileKey) {
      return res.status(400).json({
        success: false,
        error: 'fileKey is required'
      });
    }

    logger.info('Preview status check', { fileKey });

    const existing = await converterService.checkExistingPreview(fileKey);

    res.json({
      success: true,
      hasPreview: !!existing,
      previewKey: existing?.previewKey || null,
      previewUrl: existing?.previewUrl || null
    });

  } catch (error) {
    logger.error('Status check failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Convert Excel to PDF
 * POST /preview
 * Body:
 *   - fileKey: R2 file key (required)
 *   - force: Force re-conversion (optional, default: false)
 *   - margin: Margin option - 'normal', 'wide', 'extra-wide' (optional, default: 'normal')
 */
router.post('/preview', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { fileKey, force = false, margin = 'normal' } = req.body;

    // Validate input
    if (!fileKey) {
      return res.status(400).json({
        success: false,
        error: 'fileKey is required'
      });
    }

    // Validate file extension
    const validExtensions = ['.xlsx', '.xls', '.xlsm'];
    const fileExt = '.' + fileKey.toLowerCase().split('.').pop();
    
    if (!validExtensions.includes(fileExt)) {
      return res.status(400).json({
        success: false,
        error: `Invalid file type: ${fileExt}. Supported: ${validExtensions.join(', ')}`
      });
    }

    // Validate margin option
    const validMargins = ['normal', 'wide', 'extra-wide'];
    if (!validMargins.includes(margin)) {
      return res.status(400).json({
        success: false,
        error: `Invalid margin option: ${margin}. Supported: ${validMargins.join(', ')}`
      });
    }

    // Check if Graph API is configured
    if (!converterService.isGraphApiConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Microsoft Graph API is not configured. Please set TENANT_ID, CLIENT_ID, and CLIENT_SECRET.'
      });
    }

    logger.info('Preview request received', { fileKey, force, margin });

    const result = await converterService.convertToPdf(fileKey, { force, margin });

    const duration = Date.now() - startTime;
    logger.info('Preview request completed', { 
      fileKey, 
      success: result.success, 
      cached: result.cached,
      margin,
      duration: `${duration}ms`
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Preview conversion failed', { 
      error: error.message, 
      stack: error.stack,
      duration: `${duration}ms`
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete preview PDF
 * DELETE /preview
 * Query params:
 *   - fileKey: Original R2 file key
 */
router.delete('/preview', async (req, res) => {
  try {
    const { fileKey } = req.query;

    if (!fileKey) {
      return res.status(400).json({
        success: false,
        error: 'fileKey is required'
      });
    }

    logger.info('Preview delete request', { fileKey });

    const result = await converterService.deletePreview(fileKey);

    res.json(result);

  } catch (error) {
    logger.error('Preview deletion failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get conversion status
 * GET /preview/status/:conversionId
 */
router.get('/preview/status/:conversionId', (req, res) => {
  const { conversionId } = req.params;
  const status = converterService.getConversionStatus(conversionId);

  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Conversion not found'
    });
  }

  res.json({
    success: true,
    conversionId,
    ...status
  });
});

/**
 * Test Graph API connection
 * GET /test-connection
 */
router.get('/test-connection', async (req, res) => {
  try {
    const result = await converterService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Error handling middleware
 */
router.use((err, req, res, next) => {
  logger.error('Route error', { 
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

module.exports = router;
