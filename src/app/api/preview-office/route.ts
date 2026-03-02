/**
 * Preview Office API - Preview files using Microsoft Office Online
 * 
 * Flow:
 * 1. Download file from R2
 * 2. Upload to OneDrive temp folder (R2-Preview-Temp)
 * 3. Create a view-only sharing link
 * 4. Return Office Online viewer URL
 * 5. Track temp files for cleanup (auto-delete after 30 minutes)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { downloadFromR2, isR2Configured, checkR2FileExists } from '@/lib/r2-storage'
import { getAzureAccessToken, getServiceAccount } from '@/lib/azure-auth'

export const dynamic = 'force-dynamic'

// Track temp files for auto-cleanup (in-memory store)
// Key: driveItemId, Value: timestamp when it should be deleted
const tempFilesCleanup: Map<string, { deleteAt: number; fileName: string }> = new Map()

// Cleanup interval (30 minutes for preview files)
const CLEANUP_AFTER_MS = 30 * 60 * 1000

// Start cleanup worker
let cleanupInterval: NodeJS.Timeout | null = null

function startCleanupWorker() {
  if (cleanupInterval) return
  
  cleanupInterval = setInterval(async () => {
    const now = Date.now()
    const toDelete: string[] = []
    
    for (const [id, info] of tempFilesCleanup) {
      if (now >= info.deleteAt) {
        toDelete.push(id)
      }
    }
    
    if (toDelete.length > 0) {
      console.log(`🧹 [Cleanup] Auto-deleting ${toDelete.length} expired preview files`)
      
      try {
        const token = await getAzureAccessToken()
        const serviceAccount = getServiceAccount()
        
        for (const id of toDelete) {
          try {
            await fetch(
              `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/items/${id}`,
              { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
            )
            tempFilesCleanup.delete(id)
            console.log(`  ✅ Deleted: ${id}`)
          } catch (err) {
            console.warn(`  ⚠️ Failed to delete ${id}:`, err)
          }
        }
      } catch (err) {
        console.error('❌ Cleanup worker error:', err)
      }
    }
  }, 60000) // Check every minute
}

// Start the cleanup worker
startCleanupWorker()

// Content types for different file types
const CONTENT_TYPES: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pdf: 'application/pdf',
}

// Temp folder name for preview files
const PREVIEW_TEMP_FOLDER = 'R2-Preview-Temp'

/**
 * Ensure preview temp folder exists
 */
async function ensurePreviewTempFolder(token: string): Promise<string> {
  const serviceAccount = getServiceAccount()
  
  // Try to get existing folder
  const folderRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/root:/${PREVIEW_TEMP_FOLDER}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  
  if (folderRes.ok) {
    const folder = await folderRes.json()
    return folder.id
  }
  
  // Create folder if not exists
  const createRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/root/children`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: PREVIEW_TEMP_FOLDER,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail'
      })
    }
  )
  
  if (createRes.ok) {
    const folder = await createRes.json()
    return folder.id
  }
  
  // If conflict (folder already exists), try to get it again
  const retryRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/root:/${PREVIEW_TEMP_FOLDER}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  
  if (retryRes.ok) {
    const folder = await retryRes.json()
    return folder.id
  }
  
  throw new Error('Failed to ensure preview temp folder')
}

/**
 * Upload file to OneDrive temp folder and get a publicly accessible URL
 */
async function uploadToTempFolder(
  token: string,
  fileName: string,
  content: Buffer,
  contentType: string
): Promise<{ id: string; name: string; webUrl: string; downloadUrl: string }> {
  const serviceAccount = getServiceAccount()
  
  // Generate unique filename with timestamp
  const timestamp = Date.now()
  const uniqueName = `preview_${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  
  // Upload file
  console.log(`📤 [Upload] Uploading ${uniqueName} (${content.length} bytes)...`)
  
  const uploadRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/root:/${PREVIEW_TEMP_FOLDER}/${uniqueName}:/content`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType
      },
      body: new Uint8Array(content)
    }
  )
  
  if (!uploadRes.ok) {
    const error = await uploadRes.text()
    throw new Error(`Upload failed: ${uploadRes.status} ${error}`)
  }
  
  const driveItem = await uploadRes.json()
  console.log(`✅ [Upload] Drive item created: ${driveItem.id}`)
  console.log(`📥 [Upload] Direct download URL: ${driveItem['@microsoft.graph.downloadUrl']?.substring(0, 100)}...`)
  
  // Get the direct download URL - this is publicly accessible without auth for a limited time
  const directDownloadUrl = driveItem['@microsoft.graph.downloadUrl']
  
  if (!directDownloadUrl) {
    // If no download URL, try to get it via a separate API call
    const itemRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/items/${driveItem.id}?select=@microsoft.graph.downloadUrl,id,name,webUrl`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    
    if (itemRes.ok) {
      const itemData = await itemRes.json()
      console.log(`📥 [Upload] Fetched download URL: ${itemData['@microsoft.graph.downloadUrl']?.substring(0, 100)}...`)
      
      return {
        id: driveItem.id,
        name: uniqueName,
        webUrl: driveItem.webUrl,
        downloadUrl: itemData['@microsoft.graph.downloadUrl'] || driveItem.webUrl
      }
    }
  }
  
  // Try to create an anonymous sharing link as backup
  let shareUrl = directDownloadUrl
  
  try {
    const shareRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/items/${driveItem.id}/createLink`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'view',
          scope: 'anonymous'
        })
      }
    )
    
    if (shareRes.ok) {
      const shareResult = await shareRes.json()
      console.log(`🔗 [Share] Anonymous link created: ${shareResult.link?.webUrl?.substring(0, 80)}...`)
    } else {
      const shareError = await shareRes.text()
      console.warn(`⚠️ [Share] Could not create anonymous link: ${shareRes.status}`)
    }
  } catch (shareErr) {
    console.warn(`⚠️ [Share] Error:`, shareErr)
  }
  
  return {
    id: driveItem.id,
    name: uniqueName,
    webUrl: driveItem.webUrl,
    downloadUrl: directDownloadUrl || driveItem.webUrl
  }
}

/**
 * POST /api/preview-office
 * 
 * Request: { fileId: string }
 * Response: { viewerUrl: string, driveItemId: string }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check environment variables first (support multiple naming conventions)
    const azureConfigured = !!(
      (process.env.AZURE_TENANT_ID || process.env.TENANT_ID) &&
      (process.env.AZURE_CLIENT_ID || process.env.CLIENT_ID) &&
      (process.env.AZURE_CLIENT_SECRET || process.env.CLIENT_SECRET)
    )
    if (!azureConfigured) {
      console.error('❌ [Preview-Office] Azure AD not configured', {
        hasTenantId: !!(process.env.AZURE_TENANT_ID || process.env.TENANT_ID),
        hasClientId: !!(process.env.AZURE_CLIENT_ID || process.env.CLIENT_ID),
        hasClientSecret: !!(process.env.AZURE_CLIENT_SECRET || process.env.CLIENT_SECRET),
        hasServiceAccount: !!process.env.M365_SERVICE_ACCOUNT
      })
      return NextResponse.json({ 
        error: 'Azure AD tidak terkonfigurasi. Hubungi administrator.',
        details: 'Missing AZURE_TENANT_ID/TENANT_ID, AZURE_CLIENT_ID/CLIENT_ID, or AZURE_CLIENT_SECRET/CLIENT_SECRET'
      }, { status: 500 })
    }
    
    // Check R2 configuration
    if (!isR2Configured()) {
      console.error('❌ [Preview-Office] R2 not configured', {
        hasAccountId: !!process.env.R2_ACCOUNT_ID,
        hasAccessKey: !!(process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY),
        hasSecretKey: !!(process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY),
        bucketName: process.env.R2_BUCKET_NAME
      })
      return NextResponse.json({ 
        error: 'R2 storage tidak terkonfigurasi. Hubungi administrator.',
        details: 'Missing R2 credentials'
      }, { status: 500 })
    }
    
    // Authentication check
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    // Allow preview without auth for public access
    const body = await request.json()
    const { fileId } = body
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID diperlukan' }, { status: 400 })
    }
    
    // Get file from database
    const sopFile = await db.sopFile.findUnique({
      where: { id: fileId }
    })
    
    if (!sopFile) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }
    
    if (!sopFile.filePath) {
      return NextResponse.json({ error: 'File tidak tersedia di storage' }, { status: 404 })
    }
    
    const fileExtension = sopFile.fileName.toLowerCase().split('.').pop() || ''
    
    // Check if file type is supported for Office Online preview
    if (!['xlsx', 'xls', 'xlsm', 'docx', 'doc'].includes(fileExtension)) {
      return NextResponse.json({ 
        error: 'Hanya file Excel dan Word yang bisa di-preview dengan Office Online',
        suggestion: 'Gunakan download untuk file tipe lain'
      }, { status: 400 })
    }
    
    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json({ error: 'R2 storage tidak terkonfigurasi' }, { status: 500 })
    }
    
    console.log(`👁️ [Preview-Office] Starting preview for: ${sopFile.judul}`)
    console.log(`   File name in DB: ${sopFile.fileName}`)
    console.log(`   File path in DB: ${sopFile.filePath}`)
    
    // Check if file exists in R2 before attempting download
    const fileExists = await checkR2FileExists(sopFile.filePath)
    
    if (!fileExists) {
      console.error(`❌ [Preview-Office] File not found in R2: ${sopFile.filePath}`)
      return NextResponse.json({ 
        error: 'File tidak ditemukan di storage',
        details: `File dengan path "${sopFile.filePath}" tidak ditemukan di R2. File mungkin telah dihapus atau dipindahkan.`,
        filePath: sopFile.filePath,
        fileName: sopFile.fileName
      }, { status: 404 })
    }
    
    // Download from R2
    console.log(`📥 [Preview-Office] Downloading from R2: ${sopFile.filePath}`)
    const result = await downloadFromR2(sopFile.filePath)
    const fileBuffer = result.buffer
    console.log(`✅ [Preview-Office] Downloaded ${fileBuffer.length} bytes`)
    
    // Get Azure access token
    const token = await getAzureAccessToken()
    
    // Ensure temp folder exists
    await ensurePreviewTempFolder(token)
    
    // Upload to OneDrive temp folder
    const contentType = CONTENT_TYPES[fileExtension] || 'application/octet-stream'
    const driveItem = await uploadToTempFolder(token, sopFile.fileName, fileBuffer, contentType)
    
    console.log(`📤 [Preview-Office] Uploaded to OneDrive: ${driveItem.id}`)
    console.log(`🔗 [Preview-Office] WebUrl: ${driveItem.webUrl}`)
    console.log(`📥 [Preview-Office] DownloadUrl: ${driveItem.downloadUrl ? driveItem.downloadUrl.substring(0, 100) + '...' : 'N/A'}`)
    
    // Register for auto-cleanup (will be deleted after 30 minutes if not cleaned by frontend)
    tempFilesCleanup.set(driveItem.id, {
      deleteAt: Date.now() + CLEANUP_AFTER_MS,
      fileName: sopFile.fileName
    })
    console.log(`⏰ [Preview-Office] Auto-cleanup scheduled for ${new Date(Date.now() + CLEANUP_AFTER_MS).toISOString()}`)
    
    // Determine the best URL for Office Online viewer
    // Priority: downloadUrl (direct, no auth) > webUrl (might need auth)
    let viewerSourceUrl = driveItem.downloadUrl || driveItem.webUrl
    
    // Create Office Online viewer URL
    const encodedUrl = encodeURIComponent(viewerSourceUrl)
    const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`
    console.log(`📊 [Preview-Office] Office Viewer URL: ${officeViewerUrl.substring(0, 150)}...`)
    
    // Also provide direct OneDrive URL as fallback
    const oneDriveViewerUrl = driveItem.webUrl
    
    // Increment preview count
    try {
      await db.sopFile.update({
        where: { id: fileId },
        data: { previewCount: { increment: 1 } }
      })
    } catch (updateError) {
      console.warn('⚠️ Failed to increment preview count:', updateError)
    }
    
    // Log activity
    if (userId) {
      try {
        await db.log.create({
          data: {
            userId,
            aktivitas: 'PREVIEW',
            deskripsi: `Preview Office Online: ${sopFile.judul}`,
            fileId: sopFile.id
          }
        })
      } catch (logError) {
        console.warn('⚠️ Failed to create log:', logError)
      }
    }
    
    console.log(`✅ [Preview-Office] Complete in ${Date.now() - startTime}ms`)
    
    return NextResponse.json({
      success: true,
      viewerUrl: officeViewerUrl,
      oneDriveUrl: oneDriveViewerUrl,
      driveItemId: driveItem.id,
      message: 'File berhasil diupload ke OneDrive temp. Buka URL di tab baru.'
    })
    
  } catch (error) {
    console.error('❌ [Preview-Office] Error:', error)
    return NextResponse.json({
      error: 'Gagal mempersiapkan preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/preview-office
 * 
 * Delete temp file from OneDrive after preview is closed
 * Request: { driveItemId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { driveItemId } = body
    
    if (!driveItemId) {
      return NextResponse.json({ error: 'Drive Item ID diperlukan' }, { status: 400 })
    }
    
    const token = await getAzureAccessToken()
    const serviceAccount = getServiceAccount()
    
    // Delete file from OneDrive
    const deleteRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/items/${driveItemId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    
    if (deleteRes.ok || deleteRes.status === 404) {
      // Also remove from cleanup tracking
      tempFilesCleanup.delete(driveItemId)
      console.log(`🗑️ [Preview-Office] Deleted temp file: ${driveItemId}`)
      return NextResponse.json({ success: true, message: 'Temp file deleted' })
    }
    
    const error = await deleteRes.text()
    throw new Error(`Delete failed: ${deleteRes.status} ${error}`)
    
  } catch (error) {
    console.error('❌ [Preview-Office] Delete error:', error)
    return NextResponse.json({
      error: 'Gagal menghapus file temp',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
