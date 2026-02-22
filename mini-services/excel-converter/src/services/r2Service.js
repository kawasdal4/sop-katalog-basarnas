/**
 * R2 Storage Service
 * Handles all interactions with Cloudflare R2 (S3 compatible)
 */

const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../utils/logger');

class R2Service {
  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
      },
    });
    this.bucket = process.env.R2_BUCKET;
    logger.info('R2 Service initialized', { bucket: this.bucket, endpoint: process.env.R2_ENDPOINT });
  }

  /**
   * Download file from R2
   * @param {string} key - File key/path in R2
   * @returns {Promise<Buffer>} - File buffer
   */
  async downloadFile(key) {
    const startTime = Date.now();
    logger.info('Downloading from R2', { key });

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const duration = Date.now() - startTime;
      logger.info('Downloaded from R2', { 
        key, 
        size: buffer.length,
        duration: `${duration}ms`
      });

      return buffer;
    } catch (error) {
      logger.error('Failed to download from R2', { key, error: error.message });
      throw new Error(`Failed to download file from R2: ${error.message}`);
    }
  }

  /**
   * Upload file to R2
   * @param {string} key - File key/path in R2
   * @param {Buffer} buffer - File buffer
   * @param {string} contentType - MIME type
   * @returns {Promise<string>} - File key
   */
  async uploadFile(key, buffer, contentType = 'application/octet-stream') {
    const startTime = Date.now();
    logger.info('Uploading to R2', { key, size: buffer.length, contentType });

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.client.send(command);

      const duration = Date.now() - startTime;
      logger.info('Uploaded to R2', { key, duration: `${duration}ms` });

      return key;
    } catch (error) {
      logger.error('Failed to upload to R2', { key, error: error.message });
      throw new Error(`Failed to upload file to R2: ${error.message}`);
    }
  }

  /**
   * Delete file from R2
   * @param {string} key - File key/path in R2
   * @returns {Promise<boolean>}
   */
  async deleteFile(key) {
    logger.info('Deleting from R2', { key });

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      logger.info('Deleted from R2', { key });
      return true;
    } catch (error) {
      logger.error('Failed to delete from R2', { key, error: error.message });
      return false;
    }
  }

  /**
   * Generate presigned URL for file access
   * @param {string} key - File key/path in R2
   * @param {number} expiresIn - URL expiration time in seconds
   * @returns {Promise<string>} - Presigned URL
   */
  async getPresignedUrl(key, expiresIn = 3600) {
    logger.debug('Generating presigned URL', { key, expiresIn });

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      logger.debug('Generated presigned URL', { key });
      return url;
    } catch (error) {
      logger.error('Failed to generate presigned URL', { key, error: error.message });
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Check if file exists in R2
   * @param {string} key - File key/path in R2
   * @returns {Promise<boolean>}
   */
  async fileExists(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.error('Error checking file existence', { key, error: error.message });
      return false;
    }
  }
}

// Export singleton instance
module.exports = new R2Service();
