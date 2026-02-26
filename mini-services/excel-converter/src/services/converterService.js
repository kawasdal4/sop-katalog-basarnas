/**
 * Converter Service
 * Main orchestration service for Excel to PDF conversion
 * Coordinates R2 storage and Microsoft Graph API
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const r2Service = require('./r2Service');
const graphService = require('./graphService');
const logger = require('../utils/logger');

class ConverterService {
  constructor() {
    this.conversions = new Map(); // Track active conversions
    this.maxConversionAge = 3600000; // 1 hour
  }

  /**
   * Generate preview PDF key from original file key
   * @param {string} originalKey - Original file key
   * @param {string} margin - Margin option
   * @returns {string} - Preview PDF key
   */
  generatePreviewKey(originalKey, margin = 'normal') {
    const ext = path.extname(originalKey);
    const baseName = originalKey.replace(ext, '');
    // Include margin in key to differentiate previews with different margins
    return `${baseName}-preview-${margin}.pdf`;
  }

  /**
   * Check if preview already exists
   * @param {string} fileKey - Original file key
   * @param {string} margin - Margin option
   * @returns {Promise<Object|null>} - Preview info or null
   */
  async checkExistingPreview(fileKey, margin = 'normal') {
    const previewKey = this.generatePreviewKey(fileKey, margin);
    
    try {
      const exists = await r2Service.fileExists(previewKey);
      if (exists) {
        const presignedUrl = await r2Service.getPresignedUrl(previewKey, 3600);
        logger.info('Existing preview found', { fileKey, previewKey, margin });
        return {
          exists: true,
          previewKey,
          previewUrl: presignedUrl
        };
      }
    } catch (error) {
      logger.debug('Preview check failed', { fileKey, error: error.message });
    }
    
    return null;
  }

  /**
   * Convert Excel file to PDF
   * Main entry point for conversion
   * @param {string} fileKey - R2 file key
   * @param {Object} options - Conversion options
   * @param {boolean} options.force - Force re-conversion
   * @param {string} options.margin - Margin option ('normal', 'wide', 'extra-wide')
   * @returns {Promise<Object>} - Conversion result
   */
  async convertToPdf(fileKey, options = {}) {
    const conversionId = uuidv4();
    const startTime = Date.now();
    const { force = false, margin = 'normal' } = options;
    
    logger.info('Starting conversion', { 
      conversionId, 
      fileKey, 
      force,
      margin
    });

    // Track conversion
    this.conversions.set(conversionId, {
      fileKey,
      status: 'started',
      startTime,
      progress: [],
      margin
    });

    try {
      // Step 1: Check if preview already exists (skip if force=true)
      if (!force) {
        this.updateProgress(conversionId, 'checking_cache');
        const existing = await this.checkExistingPreview(fileKey, margin);
        if (existing) {
          logger.info('Returning cached preview', { conversionId, margin });
          this.conversions.set(conversionId, { 
            ...this.conversions.get(conversionId), 
            status: 'cached',
            endTime: Date.now()
          });
          
          return {
            success: true,
            conversionId,
            previewKey: existing.previewKey,
            previewUrl: existing.previewUrl,
            cached: true,
            margin
          };
        }
      }

      // Step 2: Download file from R2
      this.updateProgress(conversionId, 'downloading');
      logger.info('Downloading file from R2', { conversionId, fileKey });
      
      const excelBuffer = await r2Service.downloadFile(fileKey);
      
      // Validate file size (max 10MB for Graph API simple upload)
      const maxSize = 10 * 1024 * 1024;
      if (excelBuffer.length > maxSize) {
        throw new Error(`File too large: ${(excelBuffer.length / 1024 / 1024).toFixed(2)}MB. Maximum size is 10MB.`);
      }

      // Validate file extension
      const ext = path.extname(fileKey).toLowerCase();
      if (!['.xlsx', '.xls', '.xlsm'].includes(ext)) {
        throw new Error(`Invalid file type: ${ext}. Supported types: .xlsx, .xls, .xlsm`);
      }

      // Step 3: Convert using Microsoft Graph API
      this.updateProgress(conversionId, 'converting');
      logger.info('Converting via Microsoft Graph API', { conversionId, margin });
      
      // Generate unique filename for OneDrive
      const originalName = path.basename(fileKey);
      const tempFileName = `${conversionId.substring(0, 8)}-${originalName}`;
      
      const pdfBuffer = await graphService.convertExcelToPdf(excelBuffer, tempFileName, margin);

      // Step 4: Upload PDF to R2
      this.updateProgress(conversionId, 'uploading');
      
      const previewKey = this.generatePreviewKey(fileKey, margin);
      logger.info('Uploading PDF to R2', { 
        conversionId, 
        previewKey, 
        size: pdfBuffer.length,
        margin
      });
      
      await r2Service.uploadFile(previewKey, pdfBuffer, 'application/pdf');

      // Step 5: Generate presigned URL
      const previewUrl = await r2Service.getPresignedUrl(previewKey, 3600);

      const duration = Date.now() - startTime;
      
      this.updateProgress(conversionId, 'completed');
      this.conversions.set(conversionId, {
        ...this.conversions.get(conversionId),
        status: 'completed',
        endTime: Date.now(),
        duration
      });

      logger.info('Conversion completed', { 
        conversionId, 
        previewKey, 
        margin,
        duration: `${duration}ms` 
      });

      return {
        success: true,
        conversionId,
        previewKey,
        previewUrl,
        cached: false,
        margin,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.updateProgress(conversionId, 'failed');
      this.conversions.set(conversionId, {
        ...this.conversions.get(conversionId),
        status: 'failed',
        error: error.message,
        endTime: Date.now(),
        duration
      });

      logger.error('Conversion failed', {
        conversionId,
        fileKey,
        margin,
        error: error.message,
        duration: `${duration}ms`
      });

      return {
        success: false,
        conversionId,
        error: error.message,
        margin,
        duration
      };
    }
  }

  /**
   * Update conversion progress
   */
  updateProgress(conversionId, step) {
    const conversion = this.conversions.get(conversionId);
    if (conversion) {
      conversion.progress.push({
        step,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Delete preview PDF
   * @param {string} fileKey - Original file key
   * @returns {Promise<Object>}
   */
  async deletePreview(fileKey) {
    const previewKey = this.generatePreviewKey(fileKey);
    
    logger.info('Deleting preview', { fileKey, previewKey });
    
    const deleted = await r2Service.deleteFile(previewKey);
    
    return {
      success: deleted,
      previewKey
    };
  }

  /**
   * Get conversion status
   * @param {string} conversionId - Conversion ID
   * @returns {Object|null}
   */
  getConversionStatus(conversionId) {
    return this.conversions.get(conversionId) || null;
  }

  /**
   * Clean up old conversion records
   * @param {number} maxAge - Max age in milliseconds
   */
  cleanupConversions(maxAge = this.maxConversionAge) {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, conversion] of this.conversions) {
      if (now - conversion.startTime > maxAge) {
        this.conversions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up old conversions', { count: cleaned });
    }
  }

  /**
   * Check if Microsoft Graph API is configured
   * @returns {boolean}
   */
  isGraphApiConfigured() {
    return !!(graphService.tenantId && graphService.clientId && graphService.clientSecret);
  }

  /**
   * Test Microsoft Graph API connection
   * @returns {Promise<Object>}
   */
  async testConnection() {
    try {
      const token = await graphService.getAccessToken();
      return {
        success: true,
        message: 'Microsoft Graph API connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const converterService = new ConverterService();

// Start periodic cleanup
setInterval(() => converterService.cleanupConversions(), 600000); // Every 10 minutes

module.exports = converterService;
