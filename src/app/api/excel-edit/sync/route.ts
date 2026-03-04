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
import { uploadToR2, isR2Configured } from '@/lib/r2-storage'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Cron configuration
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
      const result = await syncSpecificFile(driveItemId, userId)
      results = [result]
    } else {
      // Sync all files
      results = await syncAllFiles(userId)
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
async function syncSpecificFile(driveItemId: string, userId?: string): Promise<SyncResult> {
  console.log(`📥 Syncing specific file: ${driveItemId}`)

  // Get file metadata
  const fileMetadata = await getFileMetadata(driveItemId)
  const fileName = fileMetadata.name
  const description = fileMetadata.description || ''

  return syncFileToR2(driveItemId, fileName, description, userId)
}

/**
 * Sync all files from OneDrive edit folder to R2
 */
async function syncAllFiles(userId?: string): Promise<SyncResult[]> {
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

      const result = await syncFileToR2(file.id, file.name, file.description || '', userId)
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
  description: string,
  userId?: string
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

  // Convert ArrayBuffer to Buffer for uploadToR2
  const buffer = Buffer.from(fileContent)

  // Upload to R2 using centralized method
  await uploadToR2(buffer, fileName, contentType, {
    key: r2Path,
    metadata: {
      'synced-from': 'onedrive',
      'synced-at': new Date().toISOString(),
      'original-drive-item': driveItemId,
    }
  })
  console.log(`✅ Uploaded to R2: ${r2Path} (${fileContent.byteLength} bytes)`)

  // Trigger FILE_UPDATED notification to all users (Async)
  // Try to find the related SOP file by filePath
  try {
    const sopFile = await db.sopFile.findFirst({
      where: { filePath: r2Path },
      select: { nomorSop: true, judul: true, id: true }
    })

    if (sopFile) {
      // Update timestamp and last editor
      const updateData: any = { updatedAt: new Date() }
      if (userId) {
        updateData.updatedBy = userId
      }

      await db.sopFile.update({
        where: { id: sopFile.id },
        data: updateData
      })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://e-katalog-sop.cloud';
      const internalApiKey = process.env.INTERNAL_API_KEY || 'sop-basarnas-internal-secret-2024';

      fetch(`${appUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${internalApiKey}`
        },
        body: JSON.stringify({
          type: 'FILE_UPDATED',
          data: {
            nomorSop: sopFile.nomorSop,
            judul: sopFile.judul,
            updatedBy: 'Admin (M365 Sync)'
          }
        })
      }).catch(err => console.warn('⚠️ [Background] Sync notification trigger failed:', err));
    }
  } catch (err) {
    console.warn('⚠️ [Background] Failed to trigger sync notification:', err)
  }

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
