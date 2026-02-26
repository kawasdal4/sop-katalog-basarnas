/**
 * Webhook Handler for Microsoft Graph Notifications
 * 
 * Handles:
 * - Validation requests (GET)
 * - Change notifications (POST) - triggers sync back to R2
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  downloadFileFromOneDrive, 
  getFileMetadata, 
  parseFileMetadata,
  deleteFileFromOneDrive 
} from '@/lib/graph-api'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!
const WEBHOOK_VALIDATION_TOKEN = process.env.WEBHOOK_VALIDATION_TOKEN || 'default-validation-token'

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

// Content types for Excel and Word files
const CONTENT_TYPES: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
}

interface WebhookNotification {
  value: Array<{
    subscriptionId: string
    changeType: 'updated' | 'created' | 'deleted'
    resource: string
    resourceData?: {
      '@odata.type': string
      '@odata.id': string
      id: string
    }
    tenantId: string
    clientState: string
  }>
}

/**
 * GET - Webhook Validation
 * Microsoft sends this when creating a subscription
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const validationToken = searchParams.get('validationToken')
  
  console.log('🔔 Webhook validation request received')
  
  if (validationToken) {
    // Return plain text validation token
    console.log('✅ Webhook validated')
    return new Response(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
  
  return new Response('No validation token', { status: 400 })
}

/**
 * POST - Handle Change Notifications
 * Called when files in edit folder are modified
 */
export async function POST(request: NextRequest) {
  try {
    const notification: WebhookNotification = await request.json()
    
    console.log('📬 Webhook notification received:', notification.value?.length || 0, 'changes')
    
    // Validate client state
    for (const item of notification.value || []) {
      if (item.clientState !== WEBHOOK_VALIDATION_TOKEN) {
        console.warn('⚠️ Invalid client state, ignoring notification')
        continue
      }
      
      // Process file changes
      if ((item.changeType === 'updated' || item.changeType === 'created') && item.resourceData?.id) {
        // Process async - don't block the response
        processFileChange(item.resourceData.id, item.changeType)
          .catch(err => console.error('❌ Error processing file change:', err))
      }
    }
    
    // Must return 202 quickly (within 30 seconds)
    return new Response(null, { status: 202 })
    
  } catch (error) {
    console.error('❌ Webhook handler error:', error)
    return new Response('Error processing notification', { status: 500 })
  }
}

/**
 * Process file change - sync back to R2
 */
async function processFileChange(driveItemId: string, changeType: string): Promise<void> {
  console.log(`🔄 Processing ${changeType} for item: ${driveItemId}`)
  
  try {
    // Get file metadata to find R2 path
    const metadata = await getFileMetadata(driveItemId)
    const parsedMeta = parseFileMetadata(metadata.description)
    
    if (!parsedMeta.r2Path) {
      console.warn('⚠️ No R2 path found in metadata, skipping sync')
      return
    }
    
    const r2Path = parsedMeta.r2Path
    const fileName = metadata.name || 'unknown.xlsx'
    
    console.log(`📁 Syncing: ${fileName} -> ${r2Path}`)
    
    // Download from OneDrive
    const fileContent = await downloadFileFromOneDrive(driveItemId)
    
    // Determine content type
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'xlsx'
    const contentType = CONTENT_TYPES[fileExt] || CONTENT_TYPES.xlsx
    
    // Upload to R2 (overwrite)
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
    console.log(`✅ Synced to R2: ${r2Path} (${fileContent.byteLength} bytes)`)
    
    // Delete from OneDrive (cleanup)
    try {
      await deleteFileFromOneDrive(driveItemId)
      console.log('🗑️ Cleaned up from OneDrive')
    } catch (deleteError) {
      console.warn('⚠️ Could not delete from OneDrive:', deleteError)
    }
    
    // Log sync activity
    console.log(`📝 Sync complete: ${fileName}`)
    
  } catch (error) {
    console.error('❌ Failed to process file change:', error)
    throw error
  }
}
