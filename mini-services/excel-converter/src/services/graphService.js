/**
 * Microsoft Graph API Service
 * Handles authentication and file operations with Microsoft Graph API
 * Uses Application Permissions (Client Credentials Flow)
 */

const axios = require('axios');
const logger = require('../utils/logger');
const excelModifier = require('./excelModifier');

// Graph API base URL
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

class GraphService {
  constructor() {
    this.tenantId = process.env.TENANT_ID;
    this.clientId = process.env.CLIENT_ID;
    this.clientSecret = process.env.CLIENT_SECRET;
    this.tempFolder = process.env.ONEDRIVE_TEMP_FOLDER || 'temp-converter';
    this.timeout = parseInt(process.env.CONVERSION_TIMEOUT_MS) || 120000;
    
    this.accessToken = null;
    this.tokenExpiresAt = null;
    this.driveId = null; // Cache for drive ID

    // Validate configuration
    if (!this.tenantId || !this.clientId || !this.clientSecret) {
      logger.error('Missing Microsoft Graph API configuration', {
        hasTenantId: !!this.tenantId,
        hasClientId: !!this.clientId,
        hasClientSecret: !!this.clientSecret
      });
    }
  }

  /**
   * Get access token using client credentials flow
   * @returns {Promise<string>} - Access token
   */
  async getAccessToken() {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      logger.debug('Using cached access token');
      return this.accessToken;
    }

    const startTime = Date.now();
    logger.info('Requesting new access token from Microsoft');

    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      });

      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      });

      this.accessToken = response.data.access_token;
      // Set expiry with 5 minute buffer
      this.tokenExpiresAt = Date.now() + ((response.data.expires_in - 300) * 1000);

      const duration = Date.now() - startTime;
      logger.info('Access token obtained', { 
        expiresIn: response.data.expires_in,
        duration: `${duration}ms`
      });

      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get access token', { 
        error: error.response?.data || error.message 
      });
      throw new Error('Failed to authenticate with Microsoft Graph API');
    }
  }

  /**
   * Make authenticated request to Graph API
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint (without base URL)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response data
   */
  async makeRequest(method, endpoint, options = {}) {
    const token = await this.getAccessToken();
    
    const config = {
      method,
      url: `${GRAPH_API_BASE}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      timeout: this.timeout,
      ...options
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      logger.error('Graph API request failed', {
        endpoint,
        method,
        status,
        error: errorData || error.message
      });

      // If token expired, clear cache and retry once
      if (status === 401) {
        logger.info('Token expired, retrying with new token');
        this.accessToken = null;
        this.tokenExpiresAt = null;
        const newToken = await this.getAccessToken();
        config.headers.Authorization = `Bearer ${newToken}`;
        const retryResponse = await axios(config);
        return retryResponse.data;
      }

      throw error;
    }
  }

  /**
   * Get the default drive for the organization
   * For application permissions, we use /sites/root/drive or find a specific site
   * @returns {Promise<string>} - Drive ID
   */
  async getDriveId() {
    if (this.driveId) {
      return this.driveId;
    }

    logger.info('Getting default drive ID');

    try {
      // Try to get the root site's drive (SharePoint default)
      const site = await this.makeRequest('GET', '/sites/root');
      const siteId = site.id;
      
      logger.info('Found root site', { siteId, name: site.name });

      // Get the default drive for this site
      const drives = await this.makeRequest('GET', `/sites/${siteId}/drives`);
      
      if (drives.value && drives.value.length > 0) {
        this.driveId = drives.value[0].id;
        logger.info('Found drive', { driveId: this.driveId, name: drives.value[0].name });
        return this.driveId;
      }

      throw new Error('No drives found');
    } catch (error) {
      logger.error('Failed to get drive ID', { error: error.message });
      throw new Error('Failed to access Microsoft Drive');
    }
  }

  /**
   * Ensure temp folder exists in Drive
   * @returns {Promise<string>} - Folder ID
   */
  async ensureTempFolder() {
    logger.info('Ensuring temp folder exists', { folder: this.tempFolder });

    try {
      const driveId = await this.getDriveId();
      
      // Try to get existing folder by name
      try {
        const folder = await this.makeRequest('GET', 
          `/drives/${driveId}/root:/${this.tempFolder}`);
        logger.info('Temp folder exists', { folderId: folder.id });
        return folder.id;
      } catch (notFound) {
        // Folder doesn't exist, create it
        logger.info('Creating temp folder');
        
        const folder = await this.makeRequest('POST', 
          `/drives/${driveId}/root/children`,
          {
            data: {
              name: this.tempFolder,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'rename'
            },
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        logger.info('Temp folder created', { folderId: folder.id });
        return folder.id;
      }
    } catch (error) {
      logger.error('Failed to ensure temp folder', { error: error.message });
      throw new Error('Failed to access OneDrive folder');
    }
  }

  /**
   * Upload file to Drive
   * @param {string} fileName - File name
   * @param {Buffer} fileBuffer - File buffer
   * @returns {Promise<Object>} - Uploaded file info { id, name }
   */
  async uploadFile(fileName, fileBuffer) {
    const startTime = Date.now();
    logger.info('Uploading file to Drive', { fileName, size: fileBuffer.length });

    try {
      const driveId = await this.getDriveId();
      
      // Ensure folder exists
      await this.ensureTempFolder();

      // Use simple upload (works for files < 4MB)
      const endpoint = `/drives/${driveId}/root:/${this.tempFolder}/${fileName}:/content`;
      
      const response = await this.makeRequest('PUT', endpoint, {
        data: fileBuffer,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      const duration = Date.now() - startTime;
      logger.info('File uploaded to Drive', { 
        fileId: response.id, 
        fileName: response.name,
        duration: `${duration}ms`
      });

      return {
        id: response.id,
        name: response.name,
        webUrl: response.webUrl,
        driveId: driveId
      };
    } catch (error) {
      logger.error('Failed to upload file to Drive', { 
        fileName, 
        error: error.response?.data || error.message 
      });
      throw new Error('Failed to upload file to OneDrive');
    }
  }

  /**
   * Set worksheet page setup for proper PDF output
   * Uses Excel Graph API to modify workbook properties
   * @param {string} fileId - Drive file ID
   * @param {string} driveId - Drive ID
   * @param {string} margin - Margin option ('normal', 'wide', 'extra-wide')
   * @returns {Promise<boolean>}
   */
  async setPageSetup(fileId, driveId, margin = 'normal') {
    const startTime = Date.now();
    logger.info('Setting page setup for file', { fileId, margin });

    // Define margin values in cm, then convert to inches
    // 1 cm = 0.393701 inch
    const cmToInch = 0.393701;
    
    const marginSettings = {
      'normal': { left: 1, right: 1, top: 1, bottom: 0.5 },
      'wide': { left: 1.5, right: 1.5, top: 1.5, bottom: 1 },
      'extra-wide': { left: 2, right: 2, top: 2, bottom: 1.5 }
    };
    
    const margins = marginSettings[margin] || marginSettings['normal'];
    
    try {
      // Get all worksheets in the workbook
      const worksheets = await this.makeRequest('GET',
        `/drives/${driveId}/items/${fileId}/workbook/worksheets`);
      
      if (!worksheets.value || worksheets.value.length === 0) {
        logger.warn('No worksheets found');
        return false;
      }

      logger.info('Found worksheets', { 
        count: worksheets.value.length,
        names: worksheets.value.map(ws => ws.name),
        margin,
        margins: margins
      });

      // Set page setup for each worksheet
      for (const worksheet of worksheets.value) {
        const worksheetId = worksheet.id;
        const worksheetName = worksheet.name;
        
        logger.debug('Setting page setup for worksheet', { worksheetName, margin });

        try {
          await this.makeRequest('PATCH',
            `/drives/${driveId}/items/${fileId}/workbook/worksheets/${worksheetId}/pageSetup`,
            {
              data: {
                orientation: 'landscape',
                fitToPagesWide: 1,
                fitToPagesTall: 0,  // false = auto height
                paperSize: 'a4',
                leftMargin: margins.left * cmToInch,
                rightMargin: margins.right * cmToInch,
                topMargin: margins.top * cmToInch,
                bottomMargin: margins.bottom * cmToInch,
                headerMargin: 0.5 * cmToInch,
                footerMargin: 0.5 * cmToInch
              },
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          
          logger.info('Page setup set for worksheet', { worksheetName, margin });
        } catch (wsError) {
          const errorMsg = wsError.response?.data?.error?.message || wsError.message;
          logger.warn('Could not set full page setup for worksheet', {
            worksheetName,
            error: errorMsg
          });
          
          // Try minimal properties
          try {
            await this.makeRequest('PATCH',
              `/drives/${driveId}/items/${fileId}/workbook/worksheets/${worksheetId}/pageSetup`,
              {
                data: { orientation: 'landscape' },
                headers: { 'Content-Type': 'application/json' }
              }
            );
            logger.info('Set landscape orientation for worksheet', { worksheetName });
          } catch (minimalError) {
            logger.warn('Could not set any page setup properties', { worksheetName });
          }
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Page setup completed', { duration: `${duration}ms`, margin });
      
      return true;
    } catch (error) {
      logger.error('Failed to set page setup', { 
        fileId, 
        margin,
        error: error.response?.data || error.message 
      });
      // Don't throw - continue with conversion using default settings
      return false;
    }
  }

  /**
   * Export file to PDF using Graph API
   * @param {string} fileId - Drive file ID
   * @param {string} driveId - Drive ID
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async exportToPdf(fileId, driveId) {
    const startTime = Date.now();
    logger.info('Exporting file to PDF', { fileId });

    try {
      const token = await this.getAccessToken();
      
      // Use the content endpoint with format=pdf
      const endpoint = `${GRAPH_API_BASE}/drives/${driveId}/items/${fileId}/content?format=pdf`;
      
      logger.debug('Requesting PDF export', { endpoint });
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'arraybuffer',
        timeout: this.timeout,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      const pdfBuffer = Buffer.from(response.data);
      const duration = Date.now() - startTime;

      logger.info('PDF exported successfully', { 
        fileId,
        pdfSize: pdfBuffer.length,
        duration: `${duration}ms`
      });

      return pdfBuffer;
    } catch (error) {
      logger.error('Failed to export to PDF', {
        fileId,
        status: error.response?.status,
        error: error.response?.data?.toString?.() || error.message
      });
      throw new Error('Failed to export file to PDF');
    }
  }

  /**
   * Delete file from Drive
   * @param {string} fileId - Drive file ID
   * @param {string} driveId - Drive ID
   * @returns {Promise<boolean>}
   */
  async deleteFile(fileId, driveId) {
    logger.info('Deleting file from Drive', { fileId });

    try {
      const token = await this.getAccessToken();
      
      await axios.delete(`${GRAPH_API_BASE}/drives/${driveId}/items/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000
      });

      logger.info('File deleted from Drive', { fileId });
      return true;
    } catch (error) {
      logger.warn('Failed to delete file from Drive', {
        fileId,
        error: error.response?.data || error.message
      });
      return false;
    }
  }

  /**
   * Complete conversion workflow
   * Orchestrates the entire Excel to PDF conversion process
   * @param {Buffer} excelBuffer - Excel file buffer
   * @param {string} fileName - Original file name for logging
   * @param {string} margin - Margin option ('normal', 'wide', 'extra-wide')
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async convertExcelToPdf(excelBuffer, fileName, margin = 'normal') {
    let fileId = null;
    let driveId = null;
    
    logger.info('Starting Excel to PDF conversion', { fileName, bufferSize: excelBuffer.length, margin });

    try {
      // Step 1: Modify Excel page setup directly (Graph API pageSetup doesn't work with App permissions)
      logger.info('Step 1: Modifying page setup', { margin });
      const modifiedBuffer = await excelModifier.modifyPageSetup(excelBuffer, margin);
      
      // Step 2: Get drive ID
      logger.info('Step 2: Getting Drive ID');
      driveId = await this.getDriveId();

      // Step 3: Upload file to Drive
      logger.info('Step 3: Uploading to Drive');
      const uploadResult = await this.uploadFile(fileName, modifiedBuffer);
      fileId = uploadResult.id;

      // Step 4: Export to PDF
      logger.info('Step 4: Exporting to PDF');
      const pdfBuffer = await this.exportToPdf(fileId, driveId);

      // Step 5: Delete temporary file from Drive
      logger.info('Step 5: Cleaning up Drive');
      await this.deleteFile(fileId, driveId);

      logger.info('Conversion workflow completed successfully', { fileName, margin });
      
      return pdfBuffer;

    } catch (error) {
      // Cleanup on failure
      if (fileId && driveId) {
        logger.info('Cleaning up after failure');
        await this.deleteFile(fileId, driveId);
      }
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new GraphService();
