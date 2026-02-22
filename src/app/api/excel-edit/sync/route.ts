/**
 * Manual Sync Endpoint
 * 
 * Can be called:
 * 1. By cron job for polling-based sync
 * 2. Manually by admin to force sync
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  listEditFolderFiles, 
  downloadFileFromOneDrive, 
  parseFileMetadata,
  deleteFileFromOneDrive 
} from '@/lib/graph-api'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!
const CRON_SECRET = process.env.CRON_SECRET || 'default-cron-secret'

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

// Content types
const CONTENT_TYPES: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
}

interface SyncResult {
  fileName: string
  driveItemId: string
  r2Path: string
  size: number
  success: boolean
  error?: string
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
      select: { role: true },
    })
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    console.log('🔄 Manual sync triggered by:', userId)
    
    const results = await syncAllFiles()
    
    // Log activity
    await db.log.create({
      data: {
        userId,
        aktivitas: 'MANUAL_SYNC',
        deskripsi: `Manual sync: ${results.length} files processed`,
      },
    })
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Manual sync error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    }, { status: 500 })
  }
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
  
  // Upload to R2
  const putCommand = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
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
