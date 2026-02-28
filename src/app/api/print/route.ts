/**
 * Print API - Convert files to PDF and prepare for printing
 * 
 * Workflow:
 * 1. Download file from R2 (primary storage)
 * 2. Upload to OneDrive temp folder (R2-Print-Temp)
 * 3. Convert to PDF using Microsoft Graph API (preserves Office print settings)
 * 4. Return PDF for print dialog
 * 
 * Supported formats: PDF (direct), Excel (.xlsx, .xls, .xlsm), Word (.docx, .doc)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { downloadFromR2, isR2Configured } from '@/lib/r2-storage'
import { getAzureAccessToken, getServiceAccount } from '@/lib/azure-auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Temp folder name for print files
const PRINT_TEMP_FOLDER = 'R2-Print-Temp'

// Content types for different file types
const CONTENT_TYPES: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pdf: 'application/pdf',
}

// In-memory store for print tokens (valid for 5 minutes)
// Key: token, Value: { fileId, userId, createdAt, useCount }
const printTokens: Map<string, { fileId: string; userId: string; createdAt: number; useCount: number }> = new Map()

// Maximum uses per token (allows for HEAD + GET + embed load)
const MAX_TOKEN_USES = 5

// Track temp files for cleanup
const tempFilesCleanup: Map<string, { deleteAt: number; fileName: string }> = new Map()

// Start cleanup worker
let cleanupInterval: NodeJS.Timeout | null = null

function startCleanupWorker() {
  if (cleanupInterval) return
  
  cleanupInterval = setInterval(async () => {
    const now = Date.now()
    
    // Clean up expired print tokens (older than 5 minutes)
    for (const [token, info] of printTokens) {
      if (now - info.createdAt > 5 * 60 * 1000) {
        printTokens.delete(token)
      }
    }
    
    // Clean up expired temp files
    const toDelete: string[] = []
    for (const [id, info] of tempFilesCleanup) {
      if (now >= info.deleteAt) {
        toDelete.push(id)
      }
    }
    
    if (toDelete.length > 0) {
      console.log(`🧹 [Print-Cleanup] Auto-deleting ${toDelete.length} expired print files`)
      
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
        console.error('❌ Print cleanup worker error:', err)
      }
    }
  }, 60000) // Check every minute
}

// Start the cleanup worker
startCleanupWorker()

/**
 * Ensure print temp folder exists in OneDrive
 */
async function ensurePrintTempFolder(token: string): Promise<void> {
  const serviceAccount = getServiceAccount()
  
  // Try to get existing folder
  const folderRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/root:/${PRINT_TEMP_FOLDER}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  
  if (folderRes.ok) {
    return // Folder exists
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
        name: PRINT_TEMP_FOLDER,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail'
      })
    }
  )
  
  if (!createRes.ok && createRes.status !== 409) {
    // 409 = conflict (folder already exists), which is fine
    const error = await createRes.text()
    console.warn(`⚠️ [Print] Could not create temp folder: ${error}`)
  }
}

/**
 * Upload file to OneDrive temp folder
 */
async function uploadToTempFolder(
  token: string,
  fileName: string,
  content: Buffer,
  contentType: string
): Promise<{ id: string; name: string }> {
  const serviceAccount = getServiceAccount()
  
  // Generate unique filename with timestamp
  const timestamp = Date.now()
  const uniqueName = `print_${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  
  console.log(`📤 [Print] Uploading ${uniqueName} (${content.length} bytes) to OneDrive...`)
  
  // Upload file
  const uploadRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/root:/${PRINT_TEMP_FOLDER}/${uniqueName}:/content`,
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
    throw new Error(`Upload to OneDrive failed: ${uploadRes.status} ${error}`)
  }
  
  const driveItem = await uploadRes.json()
  console.log(`✅ [Print] Uploaded to OneDrive: ${driveItem.id}`)
  
  return {
    id: driveItem.id,
    name: uniqueName
  }
}

/**
 * Convert Office file to PDF using Graph API
 * This preserves the print settings (page layout, margins, print area, etc.)
 */
async function convertToPdf(
  token: string,
  driveItemId: string,
  originalFileName: string
): Promise<ArrayBuffer> {
  const serviceAccount = getServiceAccount()
  
  console.log(`📄 [Print] Converting ${originalFileName} to PDF via Graph API...`)
  
  // Wait a moment for file to be processed by OneDrive
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Convert to PDF using Graph API
  // This endpoint uses Microsoft's rendering engine which preserves print settings
  const pdfRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/items/${driveItemId}/content?format=pdf`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf'
      }
    }
  )
  
  if (!pdfRes.ok) {
    const error = await pdfRes.text()
    throw new Error(`PDF conversion failed: ${pdfRes.status} ${error}`)
  }
  
  const pdfBuffer = await pdfRes.arrayBuffer()
  console.log(`✅ [Print] Converted to PDF: ${pdfBuffer.byteLength} bytes`)
  
  return pdfBuffer
}

/**
 * Delete temp file from OneDrive
 */
async function deleteTempFile(token: string, driveItemId: string): Promise<void> {
  const serviceAccount = getServiceAccount()
  
  try {
    await fetch(
      `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/items/${driveItemId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    tempFilesCleanup.delete(driveItemId)
    console.log(`🗑️ [Print] Deleted temp file: ${driveItemId}`)
  } catch (err) {
    console.warn(`⚠️ [Print] Failed to delete temp file:`, err)
  }
}

/**
 * POST /api/print
 * 
 * Generate a print token for the file
 * Request: { fileId: string }
 * Response: { token: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { fileId } = body
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID diperlukan' }, { status: 400 })
    }
    
    // Verify file exists
    const sopFile = await db.sopFile.findUnique({
      where: { id: fileId },
      select: { id: true, fileName: true }
    })
    
    if (!sopFile) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }
    
    // Generate a secure token
    const printToken = crypto.randomBytes(32).toString('hex')
    
    // Store token with file info
    printTokens.set(printToken, {
      fileId,
      userId,
      createdAt: Date.now(),
      useCount: 0
    })
    
    console.log(`🎫 [Print] Generated token for file: ${sopFile.fileName}`)
    
    return NextResponse.json({
      success: true,
      token: printToken
    })
    
  } catch (error) {
    console.error('❌ [Print] Token generation error:', error)
    return NextResponse.json({
      error: 'Gagal membuat token print',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/print?token=xxx
 * 
 * Download file, convert to PDF if needed, and return for printing
 * Uses token for authentication (works with embed/iframe)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const fileId = searchParams.get('id')
    
    let authenticatedUserId: string | null = null
    let targetFileId: string | null = null
    
    // Try token authentication first (for embed/iframe)
    if (token) {
      const tokenInfo = printTokens.get(token)
      if (tokenInfo && Date.now() - tokenInfo.createdAt < 5 * 60 * 1000) {
        // Check if token has exceeded max uses
        if (tokenInfo.useCount >= MAX_TOKEN_USES) {
          printTokens.delete(token)
          return NextResponse.json({ error: 'Token sudah tidak valid' }, { status: 403 })
        }
        // Increment use count
        tokenInfo.useCount++
        authenticatedUserId = tokenInfo.userId
        targetFileId = tokenInfo.fileId
        console.log(`🎫 [Print] Token used (count: ${tokenInfo.useCount})`)
      } else {
        return NextResponse.json({ error: 'Token tidak valid atau kadaluarsa' }, { status: 403 })
      }
    } else {
      // Fallback to cookie authentication (for direct API calls)
      const cookieStore = await cookies()
      const userId = cookieStore.get('userId')?.value
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      authenticatedUserId = userId
      targetFileId = fileId
    }
    
    if (!targetFileId) {
      return NextResponse.json({ error: 'File ID diperlukan' }, { status: 400 })
    }
    
    // Get file from database
    const sopFile = await db.sopFile.findUnique({
      where: { id: targetFileId }
    })
    
    if (!sopFile) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }
    
    if (!sopFile.filePath) {
      return NextResponse.json({ error: 'File tidak tersedia di storage' }, { status: 404 })
    }
    
    const fileExtension = sopFile.fileName.toLowerCase().split('.').pop() || ''
    
    // Check supported file types
    if (!['pdf', 'xlsx', 'xls', 'xlsm', 'docx', 'doc'].includes(fileExtension)) {
      return NextResponse.json({ 
        error: 'Hanya file PDF, Excel (.xlsx, .xls), dan Word (.docx, .doc) yang bisa di-print',
        fileType: fileExtension 
      }, { status: 400 })
    }
    
    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json({ error: 'R2 storage tidak terkonfigurasi' }, { status: 500 })
    }
    
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🖨️ [Print] Starting print workflow for: ${sopFile.judul}`)
    console.log(`   File: ${sopFile.fileName} (${fileExtension.toUpperCase()})`)
    console.log(`${'='.repeat(60)}\n`)
    
    // Step 1: Download from R2
    console.log(`📥 [Print] Step 1: Downloading from R2: ${sopFile.filePath}`)
    const result = await downloadFromR2(sopFile.filePath)
    const fileBuffer = result.buffer
    console.log(`✅ [Print] Downloaded ${fileBuffer.length} bytes from R2`)
    
    let pdfBuffer: ArrayBuffer
    let driveItemId: string | null = null
    
    // Step 2: Process based on file type
    if (fileExtension === 'pdf') {
      // PDF files don't need conversion
      console.log(`📄 [Print] File is PDF, no conversion needed`)
      pdfBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
    } else {
      // Office files need to be uploaded to OneDrive and converted
      console.log(`📤 [Print] Step 2: Getting Azure access token...`)
      const graphToken = await getAzureAccessToken()
      
      // Ensure temp folder exists
      console.log(`📁 [Print] Step 3: Ensuring temp folder exists...`)
      await ensurePrintTempFolder(graphToken)
      
      // Upload to OneDrive temp folder
      console.log(`📤 [Print] Step 4: Uploading to OneDrive temp folder...`)
      const contentType = CONTENT_TYPES[fileExtension] || 'application/octet-stream'
      const driveItem = await uploadToTempFolder(graphToken, sopFile.fileName, fileBuffer, contentType)
      driveItemId = driveItem.id
      
      // Register for auto-cleanup (delete after 5 minutes)
      tempFilesCleanup.set(driveItemId, {
        deleteAt: Date.now() + 5 * 60 * 1000,
        fileName: sopFile.fileName
      })
      
      // Step 3: Convert to PDF using Graph API
      // This uses Microsoft's rendering engine which preserves Excel/Word print settings
      console.log(`📄 [Print] Step 5: Converting to PDF using Graph API...`)
      console.log(`   (PDF akan mengikuti print settings dari Office: page layout, margins, print area, dll)`)
      pdfBuffer = await convertToPdf(graphToken, driveItemId, sopFile.fileName)
      
      // Step 4: Cleanup - delete temp file from OneDrive
      console.log(`🧹 [Print] Step 6: Cleaning up temp file...`)
      await deleteTempFile(graphToken, driveItemId)
    }
    
    // Log print activity
    if (authenticatedUserId) {
      try {
        await db.log.create({
          data: {
            userId: authenticatedUserId,
            aktivitas: 'PRINT',
            deskripsi: `Print ${sopFile.jenis}: ${sopFile.judul} (${fileExtension.toUpperCase()})`,
            fileId: sopFile.id,
          },
        })
      } catch (logError) {
        console.warn('⚠️ [Print] Failed to log activity:', logError)
      }
    }
    
    // Generate filename from judul
    const sanitizeFileName = (name: string) => 
      name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)
    const printFileName = `${sanitizeFileName(sopFile.judul)}.pdf`
    
    console.log(`\n✅ [Print] Complete in ${Date.now() - startTime}ms`)
    console.log(`   Output: ${printFileName} (${pdfBuffer.byteLength} bytes)\n`)
    
    // Return PDF with headers for print dialog
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(printFileName)}"; filename*=UTF-8''${encodeURIComponent(printFileName)}`,
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'X-File-Title': encodeURIComponent(sopFile.judul),
      },
    })
    
  } catch (error) {
    console.error('❌ [Print] Error:', error)
    return NextResponse.json({
      error: 'Gagal mempersiapkan file untuk print',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
