/**
 * Excel Edit Sync Endpoint
 * 
 * Can be called:
 * 1. By cron job for polling-based sync (GET with cron secret)
 * 2. Manually by admin to sync a specific file (POST with driveItemId)
 * 3. Manually by admin to sync all files (POST without driveItemId)
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  listEditFolderFiles, 
  downloadFileFromOneDrive, 
  parseFileMetadata,
  deleteFileFromOneDrive,
  getFileMetadata
} from '@/lib/graph-api'
import { isAzureConfigured } from '@/lib/azure-auth'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_BUCKET_NAME
const CRON_SECRET = process.env.CRON_SECRET || 'default-cron-secret'

// Content types for Excel and Word files
const CONTENT_TYPES: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
}

interface SyncResult {
  fileName: string
  driveItemId: string
  r2Path: string
  size: number
  success: boolean
  error?: string
}

// Check R2 configuration
function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME)
}

// Get R2 client (lazy initialization)
function getR2Client() {
  if (!isR2Configured()) {
    throw new Error('R2 credentials not configured')
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  })
}

/**
 * GET - Cron-triggered sync check
 * Called by Vercel Cron every 5 minutes
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  console.log('🔄 Cron sync check started')
  
  try {
    const results = await syncAllFiles()
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Cron sync error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    }, { status: 500 })
  }
}

/**
 * POST - Manual sync trigger
 * Called by admin user
 * 
 * Body params:
 * - driveItemId: (optional) Specific file to sync. If not provided, syncs all files.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin session
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true },
    })
    
    if (!user || user.role !== 'ADMIN' && user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json({ 
        success: false,
        error: 'R2 tidak terkonfigurasi. Hubungi administrator.',
        needsSetup: true
      }, { status: 500 })
    }
    
    // Check Azure/M365 configuration
    if (!isAzureConfigured()) {
      return NextResponse.json({ 
        success: false,
        error: 'Azure AD / Microsoft 365 tidak terkonfigurasi. Hubungi administrator.',
        needsSetup: true
      }, { status: 500 })
    }
    
    // Parse request body
    let body: { driveItemId?: string } = {}
    try {
      const text = await request.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch (parseError) {
      console.warn('Failed to parse request body, using empty body')
    }
    
    const { driveItemId } = body
    
    console.log('🔄 Manual sync triggered by:', userId, 'driveItemId:', driveItemId || 'all')
    
    let results: SyncResult[]
    
    if (driveItemId) {
      // Sync specific file
      const result = await syncSpecificFile(driveItemId)
      results = [result]
    } else {
      // Sync all files
      results = await syncAllFiles()
    }
    
    // Log activity
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'MANUAL_SYNC',
          deskripsi: `Manual sync: ${results.length} files processed`,
        },
      })
    } catch (logError) {
      console.warn('Failed to log activity:', logError)
    }
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Manual sync error:', error)
    
    // Return proper JSON response even on error
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}

/**
 * Sync a specific file by driveItemId
 */
async function syncSpecificFile(driveItemId: string): Promise<SyncResult> {
  console.log(`📥 Syncing specific file: ${driveItemId}`)
  
  // Get file metadata
  const fileMetadata = await getFileMetadata(driveItemId)
  const fileName = fileMetadata.name
  const description = fileMetadata.description || ''
  
  return syncFileToR2(driveItemId, fileName, description)
}

/**
 * Sync all files from OneDrive edit folder to R2
 */
async function syncAllFiles(): Promise<SyncResult[]> {
  const results: SyncResult[] = []
  
  // List all files in edit folder
  const files = await listEditFolderFiles()
  
  console.log(`📁 Found ${files.length} files in edit folder`)
  
  for (const file of files) {
    try {
      // Check if file was modified recently (within 30 minutes for cron)
      const lastModified = new Date(file.lastModifiedDateTime || 0)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      
      // Skip very old files (they might be from abandoned sessions)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      if (lastModified < oneDayAgo) {
        console.log(`⏭️ Skipping old file: ${file.name}`)
        continue
      }
      
      const result = await syncFileToR2(file.id, file.name, file.description || '')
      results.push(result)
      
    } catch (error) {
      console.error(`❌ Failed to sync ${file.name}:`, error)
      results.push({
        fileName: file.name,
        driveItemId: file.id,
        r2Path: '',
        size: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
  
  return results
}

/**
 * Sync single file to R2
 */
async function syncFileToR2(
  driveItemId: string, 
  fileName: string, 
  description: string
): Promise<SyncResult> {
  // Parse R2 path from metadata
  const parsedMeta = parseFileMetadata(description)
  
  if (!parsedMeta.r2Path) {
    // If no R2 path in metadata, construct from filename
    // This is a fallback - ideally metadata should contain the path
    console.warn(`⚠️ No R2 path in metadata for ${fileName}, using default path`)
  }
  
  const r2Path = parsedMeta.r2Path || `sop-files/${fileName}`
  
  console.log(`📥 Syncing: ${fileName} -> ${r2Path}`)
  
  // Download from OneDrive
  const fileContent = await downloadFileFromOneDrive(driveItemId)
  
  // Determine content type
  const fileExt = fileName.split('.').pop()?.toLowerCase() || 'xlsx'
  const contentType = CONTENT_TYPES[fileExt] || CONTENT_TYPES.xlsx
  
  // Get R2 client
  const r2Client = getR2Client()
  
  // Upload to R2
  const putCommand = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME!,
    Key: r2Path,
    Body: new Uint8Array(fileContent),
    ContentType: contentType,
    Metadata: {
      'synced-from': 'onedrive',
      'synced-at': new Date().toISOString(),
      'original-drive-item': driveItemId,
    },
  })
  
  await r2Client.send(putCommand)
  console.log(`✅ Uploaded to R2: ${r2Path} (${fileContent.byteLength} bytes)`)
  
  // Delete from OneDrive
  await deleteFileFromOneDrive(driveItemId)
  
  return {
    fileName,
    driveItemId,
    r2Path,
    size: fileContent.byteLength,
    success: true,
  }
}
