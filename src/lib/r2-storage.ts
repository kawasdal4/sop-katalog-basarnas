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
import fs from 'fs/promises'
import path from 'path'

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'public', 'temp_uploads')

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
  try {
    const url = new URL(endpoint)
    const hostname = url.hostname
    const match = hostname.match(/^([a-f0-9]+)\.r2\.cloudflarestorage\.com$/i)
    if (match) {
      return match[1]
    }
  } catch {
    // Invalid URL
  }
  return null
}

import { validateEnv } from './env-val'

// Get R2 configuration from environment
export function getR2Config(): R2Config {
  validateEnv()

  let accountId: string | undefined = process.env.R2_ACCOUNT_ID
  if (!accountId && process.env.R2_ENDPOINT) {
    accountId = extractAccountIdFromEndpoint(process.env.R2_ENDPOINT) || undefined
  }

  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY
  const bucketName = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || 'sop-katalog-basarnas'
  const publicUrl = process.env.R2_PUBLIC_URL

  const sanitize = (val?: string) => val ? val.replace(/['"]/g, '').trim() : ''

  const config = {
    accountId: sanitize(accountId),
    accessKeyId: sanitize(accessKeyId),
    secretAccessKey: sanitize(secretAccessKey),
    bucketName: sanitize(bucketName) || 'sop-katalog-basarnas',
    publicUrl: sanitize(publicUrl)
  }

  if (process.env.VERCEL) {
    console.log('[R2 Config] Verified on Vercel:', {
      bucket: config.bucketName,
      hasAccountId: !!config.accountId,
      hasAccessKey: !!config.accessKeyId,
      hasSecretKey: !!config.secretAccessKey,
      isMock: isStorageMockMode()
    });
  }

  return config
}

/**
 * Check if storage should run in Mock Mode (local fallback)
 */
export function isStorageMockMode(): boolean {
  try {
    const config = getR2Config()
    const isMock =
      config.accountId.includes('dummy') ||
      config.accessKeyId.includes('dummy') ||
      config.secretAccessKey.includes('dummy') ||
      process.env.MOCK_STORAGE === 'true'

    return isMock || (process.env.NODE_ENV !== 'production' && !config.accountId)
  } catch {
    return true
  }
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

// Create R2 client
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

import { v4 as uuidv4 } from 'uuid'

/**
 * Upload file to R2 with automatic checksum calculation and naming
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
  // --- MOCK MODE FOR DEVELOPMENT ---
  if (isStorageMockMode()) {
    const ext = fileName.split('.').pop() || 'file'
    const uuid = uuidv4()
    const folder = options?.folder ? options.folder.replace(/\/$/, '') : 'sop_dev'
    const key = options?.key || `${folder}/${uuid}.${ext}`

    console.log(`[MOCK R2] Saving locally: ${key}`)
    const fullPath = path.join(LOCAL_UPLOAD_DIR, key)

    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, fileBuffer)

    const checksum = calculateChecksum(fileBuffer)
    return {
      key,
      url: `/temp_uploads/${key}`,
      publicUrl: `/temp_uploads/${key}`,
      checksum,
      size: fileBuffer.length,
    }
  }

  const config = getR2Config()
  const client = createR2Client()

  let key = options?.key
  if (!key) {
    const ext = fileName.split('.').pop() || 'file'
    const uuid = uuidv4()

    if (options?.folder) {
      key = `${options.folder.replace(/\/$/, '')}/${uuid}.${ext}`
    } else {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      key = `sop/${year}/${month}/${uuid}.${ext}`
    }
  }

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
  // --- MOCK MODE FOR DEVELOPMENT ---
  if (isStorageMockMode()) {
    console.log(`[MOCK R2] Reading locally: ${key}`)
    const fullPath = path.join(LOCAL_UPLOAD_DIR, key)
    const buffer = await fs.readFile(fullPath)

    const ext = key.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === 'xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    if (ext === 'pdf') contentType = 'application/pdf'
    if (ext === 'png') contentType = 'image/png'

    return {
      buffer,
      contentType,
      metadata: { originalFilename: path.basename(key) }
    }
  }

  const config = getR2Config()
  const client = createR2Client()

  console.log(`📥 Downloading from R2: ${key}`)

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

    if (errorCode === 'NoSuchKey' || errorMessage.includes('does not exist') || errorCode === '404') {
      throw new Error(`File tidak ditemukan di storage.`)
    }
    throw error
  }
}

/**
 * Get R2 bucket name
 */
export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || 'sop-katalog-basarnas'
}

/**
 * Check if file exists in R2
 */
export async function checkR2FileExists(key: string): Promise<boolean> {
  try {
    if (isStorageMockMode()) {
      return true
    }

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
 * List all keys in R2 bucket with a given prefix
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
            contentType: undefined,
          })
        }
      }
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

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
}

/**
 * Move object within R2
 */
export async function moveR2Object(sourceKey: string, destKey: string): Promise<void> {
  await copyR2Object(sourceKey, destKey)
  await deleteFromR2(sourceKey)
}

/**
 * Rename object within R2
 */
export async function renameR2Object(sourceKey: string, destKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    await moveR2Object(sourceKey, destKey)
    return { success: true }
  } catch (error) {
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
    return true
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: config.bucketName }))
      return true
    } catch {
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
}> {
  if (isStorageMockMode()) {
    return {
      success: true,
      status: 'connected',
      message: '✅ Mock Storage Mode (Development)'
    }
  }

  try {
    const client = createR2Client()
    await client.send(new ListObjectsV2Command({
      Bucket: getR2BucketName(),
      MaxKeys: 1,
    }))

    return {
      success: true,
      status: 'connected',
      message: '✅ Cloudflare R2 terhubung!'
    }
  } catch (error: any) {
    return {
      success: false,
      status: 'error',
      message: `❌ Koneksi R2 gagal: ${error.message}`
    }
  }
}

/**
 * Get public URL for a file
 */
export function getR2PublicUrl(key: string): string | null {
  if (isStorageMockMode()) {
    return `/temp_uploads/${key}`
  }
  const config = getR2Config()
  // On Vercel, we always use the local proxy to avoid CORS/Public bucket issues
  if (process.env.VERCEL) {
    return null
  }
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
 * Generate presigned URL for file access
 */
export async function getR2PresignedUrl(key: string, expiresIn: number = 300): Promise<string> {
  if (isStorageMockMode()) {
    return `/temp_uploads/${key}`
  }

  const config = getR2Config()
  const client = createR2Client()

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  return await getSignedUrl(client, command, { expiresIn })
}

/**
 * Generate presigned URL for file upload
 */
export async function getR2PresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  if (isStorageMockMode()) {
    return `/api/mock-upload?key=${key}` // Placeholder
  }

  const config = getR2Config()
  const client = createR2Client()

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  })

  return await getSignedUrl(client, command, { expiresIn })
}
