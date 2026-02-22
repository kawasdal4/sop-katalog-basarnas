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

// Get R2 configuration from environment
function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME || 'sop-basarnas'
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!accountId || !accessKeyId || !secretAccessKey) {
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

// Create R2 client (singleton)
let r2Client: S3Client | null = null

function createR2Client(): S3Client {
  if (r2Client) return r2Client
  
  const config = getR2Config()
  
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  
  return r2Client
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
    CopySource: `${config.bucketName}/${sourceKey}`,
    Key: destKey,
  })
  
  await client.send(command)
  console.log(`📋 Copied: ${sourceKey} → ${destKey}`)
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
  return process.env.R2_BUCKET_NAME || 'sop-katalog-basarnas'
}

/**
 * Generate presigned URL for file access
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
