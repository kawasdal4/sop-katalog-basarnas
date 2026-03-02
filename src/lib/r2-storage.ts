import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { calculateChecksum } from './sync-core'

// Cloudflare R2 Configuration
interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl?: string
}

// R2 Object metadata
export interface R2Object {
  key: string
  size: number
  lastModified: Date
  etag: string
  contentType?: string
}

// Upload result
export interface R2UploadResult {
  key: string
  url: string
  publicUrl?: string
  checksum: string
  size: number
}

// Helper to extract account ID from R2_ENDPOINT
function extractAccountIdFromEndpoint(endpoint: string): string | null {
  // Format: https://f8bdefda808aa952cd77b12e7cafa38c.r2.cloudflarestorage.com/...
  // or: https://account-id.r2.cloudflarestorage.com
  try {
    const url = new URL(endpoint)
    const hostname = url.hostname
    // Extract account ID from subdomain (first part before .r2.cloudflarestorage.com)
    const match = hostname.match(/^([a-f0-9]+)\.r2\.cloudflarestorage\.com$/i)
    if (match) {
      return match[1]
    }
  } catch {
    // Invalid URL
  }
  return null
}

// Get R2 configuration from environment
function getR2Config(): R2Config {
  // Support multiple env var naming conventions

  // Account ID can come from R2_ACCOUNT_ID or extracted from R2_ENDPOINT
  let accountId = process.env.R2_ACCOUNT_ID
  if (!accountId && process.env.R2_ENDPOINT) {
    accountId = extractAccountIdFromEndpoint(process.env.R2_ENDPOINT)
  }

  // Access key can be R2_ACCESS_KEY_ID or R2_ACCESS_KEY
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY

  // Secret key can be R2_SECRET_ACCESS_KEY or R2_SECRET_KEY
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY

  // Bucket name can be R2_BUCKET_NAME or R2_BUCKET
  const bucketName = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || 'sop-katalog-basarnas'

  const publicUrl = process.env.R2_PUBLIC_URL

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error('R2 Configuration missing:', {
      hasAccountId: !!accountId,
      hasR2Endpoint: !!process.env.R2_ENDPOINT,
      hasAccessKeyId: !!accessKeyId,
      hasSecretAccessKey: !!secretAccessKey,
      bucketName
    })
    throw new Error('R2 credentials not configured')
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl }
}

// Check if R2 is configured
export function isR2Configured(): boolean {
  try {
    const config = getR2Config()
    return !!(config.accountId && config.accessKeyId && config.secretAccessKey)
  } catch {
    return false
  }
}

// Create R2 client (new instance each time for serverless compatibility)
function createR2Client(): S3Client {
  const config = getR2Config()

  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

/**
 * Upload file to R2 with automatic checksum calculation
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  options?: {
    folder?: string
    key?: string
    metadata?: Record<string, string>
  }
): Promise<R2UploadResult> {
  const config = getR2Config()
  const client = createR2Client()

  // Generate or use provided key
  const key = options?.key || (options?.folder ? `${options.folder}/${fileName}` : fileName)

  // Calculate checksum
  const checksum = calculateChecksum(fileBuffer)

  console.log(`📤 Uploading to R2: ${key} (${fileBuffer.length} bytes)`)

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    Metadata: {
      checksum,
      originalFilename: fileName,
      ...options?.metadata,
    },
  })

  await client.send(command)

  console.log(`✅ Uploaded to R2: ${key}`)

  return {
    key,
    url: `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${key}`,
    publicUrl: config.publicUrl ? `${config.publicUrl}/${key}` : undefined,
    checksum,
    size: fileBuffer.length,
  }
}

/**
 * Download file from R2
 */
export async function downloadFromR2(key: string): Promise<{
  buffer: Buffer
  contentType: string
  metadata?: Record<string, string>
}> {
  const config = getR2Config()
  const client = createR2Client()

  console.log(`📥 Downloading from R2: ${key}`)
  console.log(`   Bucket: ${config.bucketName}`)

  try {
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    })

    const response = await client.send(command)

    if (!response.Body) {
      throw new Error('No file content')
    }

    const buffer = Buffer.from(await response.Body.transformToByteArray())

    console.log(`✅ Downloaded from R2: ${key} (${buffer.length} bytes)`)

    return {
      buffer,
      contentType: response.ContentType || 'application/octet-stream',
      metadata: response.Metadata,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as { Code?: string; name?: string })?.Code || (error as { name?: string })?.name || ''
    
    console.error(`❌ Failed to download from R2: ${key}`)
    console.error(`   Error: ${errorMessage}`)
    console.error(`   Code: ${errorCode}`)
    
    // Provide more helpful error message
    if (errorCode === 'NoSuchKey' || errorMessage.includes('does not exist')) {
      throw new Error(`File tidak ditemukan di R2: ${key}. File mungkin telah dihapus atau dipindahkan.`)
    }
    
    throw error
  }
}

/**
 * Check if file exists in R2
 */
export async function checkR2FileExists(key: string): Promise<boolean> {
  try {
    const config = getR2Config()
    const client = createR2Client()
    
    await client.send(new HeadObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    }))
    
    return true
  } catch {
    return false
  }
}

/**
 * List all keys in R2 bucket with a given prefix (useful for finding similar files)
 */
export async function listR2FilesByPrefix(prefix: string): Promise<string[]> {
  const objects = await listR2Objects(prefix)
  return objects.map(obj => obj.key)
}

/**
 * Get object metadata without downloading
 */
export async function getR2ObjectMetadata(key: string): Promise<{
  exists: boolean
  size?: number
  lastModified?: Date
  etag?: string
  contentType?: string
  metadata?: Record<string, string>
}> {
  const config = getR2Config()
  const client = createR2Client()

  try {
    const command = new HeadObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    })

    const response = await client.send(command)

    return {
      exists: true,
      size: response.ContentLength,
      lastModified: response.LastModified,
      etag: response.ETag,
      contentType: response.ContentType,
      metadata: response.Metadata,
    }
  } catch {
    return { exists: false }
  }
}

/**
 * Delete file from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  const config = getR2Config()
  const client = createR2Client()

  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  await client.send(command)
  console.log(`🗑️ Deleted from R2: ${key}`)
}

/**
 * List all objects in R2 bucket
 */
export async function listR2Objects(prefix?: string, maxKeys: number = 1000): Promise<R2Object[]> {
  const config = getR2Config()
  const client = createR2Client()

  const objects: R2Object[] = []
  let continuationToken: string | undefined

  do {
    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    })

    const response = await client.send(command)

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) {
          objects.push({
            key: obj.Key,
            size: obj.Size || 0,
            lastModified: obj.LastModified || new Date(),
            etag: obj.ETag || '',
            contentType: undefined, // Not provided in list
          })
        }
      }
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  console.log(`📋 Listed ${objects.length} objects from R2`)
  return objects
}

/**
 * Copy object within R2
 */
export async function copyR2Object(sourceKey: string, destKey: string): Promise<void> {
  const config = getR2Config()
  const client = createR2Client()

  const command = new CopyObjectCommand({
    Bucket: config.bucketName,
    CopySource: encodeURI(`${config.bucketName}/${sourceKey}`),
    Key: destKey,
  })

  await client.send(command)
  console.log(`📋 Copied: ${sourceKey} → ${destKey}`)
}

/**
 * Move object within R2 (copy + delete)
 */
export async function moveR2Object(sourceKey: string, destKey: string): Promise<void> {
  const config = getR2Config()
  const client = createR2Client()

  // Copy to new location
  const copyCommand = new CopyObjectCommand({
    Bucket: config.bucketName,
    CopySource: encodeURI(`${config.bucketName}/${sourceKey}`),
    Key: destKey,
  })

  await client.send(copyCommand)

  // Delete from old location
  const deleteCommand = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: sourceKey,
  })

  await client.send(deleteCommand)
  console.log(`📦 Moved: ${sourceKey} → ${destKey}`)
}

/**
 * Rename object within R2 (same as move but returns result)
 */
export async function renameR2Object(sourceKey: string, destKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getR2Config()
    const client = createR2Client()

    // Check if source exists
    try {
      await client.send(new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: sourceKey,
      }))
    } catch {
      return { success: false, error: 'Source file not found in R2' }
    }

    // Check if destination already exists
    try {
      await client.send(new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: destKey,
      }))
      // Destination exists, delete it first
      await client.send(new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: destKey,
      }))
    } catch {
      // Destination doesn't exist, which is fine
    }

    // Copy to new location
    const copyCommand = new CopyObjectCommand({
      Bucket: config.bucketName,
      CopySource: encodeURI(`${config.bucketName}/${sourceKey}`),
      Key: destKey,
    })

    await client.send(copyCommand)

    // Delete from old location
    const deleteCommand = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: sourceKey,
    })

    await client.send(deleteCommand)
    console.log(`📝 Renamed: ${sourceKey} → ${destKey}`)

    return { success: true }
  } catch (error) {
    console.error(`❌ Rename failed: ${sourceKey}`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Ensure bucket exists
 */
export async function ensureR2Bucket(): Promise<boolean> {
  const config = getR2Config()
  const client = createR2Client()

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucketName }))
    console.log(`✅ R2 bucket exists: ${config.bucketName}`)
    return true
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: config.bucketName }))
      console.log(`✅ Created R2 bucket: ${config.bucketName}`)
      return true
    } catch (createError) {
      console.error(`❌ Failed to create R2 bucket:`, createError)
      return false
    }
  }
}

/**
 * Test R2 connection
 */
export async function testR2Connection(): Promise<{
  success: boolean
  message: string
  status: 'connected' | 'bucket_not_found' | 'auth_failed' | 'error'
  details?: Record<string, unknown>
  setupInstructions?: string[]
}> {
  try {
    const config = getR2Config()
    const client = createR2Client()

    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      MaxKeys: 1,
    })

    await client.send(command)

    return {
      success: true,
      status: 'connected',
      message: '✅ Cloudflare R2 terhubung!',
      details: {
        bucket: config.bucketName,
        accountId: config.accountId,
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      },
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as { Code?: string; name?: string })?.Code || (error as { name?: string })?.name || ''

    // Bucket not found - credentials are valid but bucket doesn't exist
    if (errorCode === 'NoSuchBucket' || errorMessage.includes('does not exist')) {
      return {
        success: false,
        status: 'bucket_not_found',
        message: `Bucket "${getR2BucketName()}" tidak ditemukan. Credentials valid, tapi bucket belum dibuat.`,
        details: {
          bucket: getR2BucketName(),
          accountId: process.env.R2_ACCOUNT_ID,
        },
        setupInstructions: [
          '1. Login ke Cloudflare Dashboard: https://dash.cloudflare.com',
          '2. Pilih menu R2 Object Storage',
          '3. Klik "Create bucket"',
          `4. Buat bucket dengan nama: "${getR2BucketName()}"`,
          '5. Bucket akan otomatis terhubung setelah dibuat',
        ],
      }
    }

    // Authentication failed - wrong credentials
    if (errorCode === 'InvalidAccessKeyId' || errorCode === 'SignatureDoesNotMatch' || errorMessage.includes('Access Denied')) {
      return {
        success: false,
        status: 'auth_failed',
        message: 'Kredensial R2 tidak valid. Periksa R2_ACCESS_KEY_ID dan R2_SECRET_ACCESS_KEY.',
      }
    }

    return {
      success: false,
      status: 'error',
      message: `❌ Koneksi R2 gagal: ${errorMessage}`,
    }
  }
}

/**
 * Get public URL for a file
 */
export function getR2PublicUrl(key: string): string | null {
  const config = getR2Config()

  if (config.publicUrl) {
    return `${config.publicUrl}/${key}`
  }

  return null
}

/**
 * Verify file integrity by checksum
 */
export async function verifyR2Integrity(key: string, expectedChecksum: string): Promise<boolean> {
  try {
    const { buffer } = await downloadFromR2(key)
    const actualChecksum = calculateChecksum(buffer)
    return actualChecksum === expectedChecksum
  } catch {
    return false
  }
}

/**
 * Get R2 bucket name
 */
export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || 'sop-katalog-basarnas'
}

/**
 * Generate presigned URL for file access (download)
 * @param key - File key/path in R2
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 */
export async function getR2PresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const config = getR2Config()
  const client = createR2Client()

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  const url = await getSignedUrl(client, command, { expiresIn })
  return url
}

/**
 * Generate presigned URL for file upload (PUT)
 * This allows frontend to upload directly to R2
 * @param key - File key/path in R2
 * @param contentType - File content type
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 */
export async function getR2PresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const config = getR2Config()
  const client = createR2Client()

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  })

  const url = await getSignedUrl(client, command, { expiresIn })
  return url
}
