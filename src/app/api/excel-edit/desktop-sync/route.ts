/**
 * Excel Edit - Desktop Sync API with Conflict Detection & Permanent Print Layout
 * 
 * STEP 1: Validate session (ownership, expiry)
 * STEP 2: Get current file hash from R2
 * STEP 3: Check for conflicts (hash changed since session started)
 * STEP 4: Apply permanent print layout via Microsoft Graph API
 * STEP 5: Upload modified file to R2 (overwrite)
 * STEP 6: Complete session
 * STEP 7: Log activity
 * STEP 8: Cleanup temp files from OneDrive
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import {
  validateSession,
  completeSession,
  calculateHash,
  getLastEditor
} from '@/lib/file-lock-service'
import { applyPermanentPrintLayout } from '@/lib/graph-print'

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

// Content types for Excel files
const CONTENT_TYPES: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
}

/**
 * POST /api/excel-edit/desktop-sync
 * 
 * Request: FormData with file and sessionToken
 * Response: Sync result with conflict warning if applicable
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let cleanup: (() => Promise<void>) | null = null
  
  try {
    // ============================================
    // STEP 1: Authentication Check
    // ============================================
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Silakan login terlebih dahulu',
      }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true, email: true },
    })
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Forbidden - Hanya admin yang dapat melakukan sync',
      }, { status: 403 })
    }
    
    // ============================================
    // STEP 2: Parse Request
    // ============================================
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sessionId = formData.get('sessionId') as string | null
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'File tidak ditemukan dalam request',
      }, { status: 400 })
    }
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID diperlukan',
      }, { status: 400 })
    }
    
    console.log(`📤 [Sync] Starting sync for session: ${sessionId}`)
    console.log(`📤 [Sync] File: ${file.name}, Size: ${file.size} bytes`)
    
    // ============================================
    // STEP 3: Get Current File from R2 (for hash comparison)
    // ============================================
    // First get the session to find the objectKey
    const existingSession = await db.fileEditSession.findUnique({
      where: { id: sessionId }
    })
    
    if (!existingSession) {
      return NextResponse.json({
        success: false,
        error: 'Session tidak ditemukan',
      }, { status: 404 })
    }
    
    console.log(`📥 [Sync] Fetching current file from R2: ${existingSession.objectKey}`)
    
    let currentR2Hash: string
    try {
      const getCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: existingSession.objectKey,
      })
      
      const r2Response = await r2Client.send(getCommand)
      
      if (r2Response.Body) {
        const currentBuffer = Buffer.from(await r2Response.Body.transformToByteArray())
        currentR2Hash = calculateHash(currentBuffer)
        console.log(`🔐 [Sync] Current R2 hash: ${currentR2Hash.slice(0, 16)}...`)
      } else {
        // File doesn't exist in R2 anymore - allow upload
        currentR2Hash = ''
        console.log(`⚠️ [Sync] File not found in R2, will create new`)
      }
    } catch (r2Error) {
      // File might not exist - allow upload
      currentR2Hash = ''
      console.log(`⚠️ [Sync] Error fetching from R2: ${r2Error}, proceeding with upload`)
    }
    
    // ============================================
    // STEP 4: Validate Session & Check Conflicts
    // ============================================
    const validation = await validateSession(sessionId, userId, currentR2Hash)
    
    if (!validation.valid) {
      console.log(`❌ [Sync] Session validation failed: ${validation.error}`)
      
      return NextResponse.json({
        success: false,
        error: validation.error,
      }, { status: 400 })
    }
    
    // Check for conflict
    if (validation.conflict?.hasConflict) {
      console.log(`⚠️ [Sync] Conflict detected! Original: ${validation.conflict.originalHash.slice(0, 16)}... Current: ${validation.conflict.currentHash.slice(0, 16)}...`)
      
      return NextResponse.json({
        success: false,
        error: 'CONFLICT_DETECTED',
        message: validation.conflict.message,
        conflict: {
          originalHash: validation.conflict.originalHash,
          currentHash: validation.conflict.currentHash,
          lastEditor: validation.conflict.lastEditor,
        },
        sessionId: sessionId,
        requiresForceSync: true,
      }, { status: 409 }) // 409 Conflict
    }
    
    // ============================================
    // STEP 5: Calculate New Hash
    // ============================================
    const fileArrayBuffer = await file.arrayBuffer()
    const newFileBuffer = Buffer.from(fileArrayBuffer)
    const newHash = calculateHash(newFileBuffer)
    
    console.log(`🔐 [Sync] New file hash: ${newHash.slice(0, 16)}...`)
    
    // Check if file actually changed
    if (newHash === existingSession.originalHash) {
      console.log(`ℹ️ [Sync] File unchanged (same hash)`)
      
      // Complete session without upload
      await completeSession(sessionId, newHash)
      
      return NextResponse.json({
        success: true,
        message: 'File tidak berubah, tidak perlu upload ulang',
        unchanged: true,
      })
    }
    
    // ============================================
    // STEP 6: Apply Permanent Print Layout via Microsoft Graph API
    // ============================================
    console.log(`📐 [Sync] Applying permanent print layout via Microsoft Graph API...`)
    
    let finalBuffer: Buffer
    let worksheetsCount = 0
    
    try {
      const layoutResult = await applyPermanentPrintLayout(file.name, newFileBuffer)
      
      finalBuffer = layoutResult.modifiedBuffer
      worksheetsCount = layoutResult.worksheetsCount
      cleanup = layoutResult.cleanup
      
      console.log(`✅ [Sync] Print layout applied to ${worksheetsCount} worksheets`)
      console.log(`📊 [Sync] Modified file size: ${finalBuffer.length} bytes`)
      
    } catch (layoutError) {
      console.error('❌ [Sync] Failed to apply print layout:', layoutError)
      
      // Jika gagal di salah satu step, jangan overwrite R2
      return NextResponse.json({
        success: false,
        error: 'Gagal menerapkan print layout ke file Excel',
        details: layoutError instanceof Error ? layoutError.message : 'Unknown error',
        hint: 'Pastikan koneksi ke Microsoft Graph API tersedia dan file dalam format Excel yang valid',
      }, { status: 500 })
    }
    
    // ============================================
    // STEP 7: Upload to R2 (Overwrite)
    // ============================================
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'xlsx'
    const contentType = CONTENT_TYPES[fileExt] || CONTENT_TYPES.xlsx
    
    console.log(`📤 [Sync] Uploading to R2: ${existingSession.objectKey}`)
    
    const finalHash = calculateHash(finalBuffer)
    
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: existingSession.objectKey, // Same key = overwrite
      Body: finalBuffer,
      ContentType: contentType,
      Metadata: {
        'edited-by': user.email,
        'edit-session': sessionId,
        'original-hash': existingSession.originalHash.slice(0, 16),
        'new-hash': finalHash.slice(0, 16),
        'print-layout-applied': 'true',
        'worksheets-count': worksheetsCount.toString(),
      }
    })
    
    await r2Client.send(putCommand)
    console.log(`✅ [Sync] File uploaded successfully with permanent print layout`)
    
    // ============================================
    // STEP 8: Complete Session
    // ============================================
    await completeSession(sessionId, finalHash)
    
    // ============================================
    // STEP 9: Log Activity
    // ============================================
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'EXCEL_EDIT_SYNC',
          deskripsi: `Sync Excel: ${existingSession.objectKey} (${file.size} bytes) - Print layout applied to ${worksheetsCount} worksheets`,
          fileId: existingSession.sopFileId || undefined,
          metadata: JSON.stringify({
            objectKey: existingSession.objectKey,
            sessionId: sessionId,
            originalHash: existingSession.originalHash.slice(0, 16) + '...',
            newHash: finalHash.slice(0, 16) + '...',
            fileSize: file.size,
            editDuration: Math.round((Date.now() - existingSession.lockedAt.getTime()) / 1000 / 60),
            printLayoutApplied: true,
            worksheetsCount: worksheetsCount,
          }),
        },
      })
    } catch (logError) {
      console.warn('⚠️ Failed to create log:', logError)
    }
    
    console.log(`✅ [Sync] Complete in ${Date.now() - startTime}ms`)
    
    // ============================================
    // STEP 10: Cleanup temp files from OneDrive
    // ============================================
    if (cleanup) {
      try {
        await cleanup()
        console.log(`✅ [Sync] OneDrive temp file cleaned up`)
      } catch (cleanupError) {
        console.warn('⚠️ [Sync] Failed to cleanup OneDrive temp file (non-critical):', cleanupError)
      }
    }
    
    // Get last editor for response
    const lastEditor = await getLastEditor(existingSession.objectKey)
    
    return NextResponse.json({
      success: true,
      message: 'File berhasil disinkronkan dan print layout diperbarui',
      data: {
        objectKey: existingSession.objectKey,
        fileSize: file.size,
        originalHash: existingSession.originalHash.slice(0, 16) + '...',
        newHash: finalHash.slice(0, 16) + '...',
        editDuration: Math.round((Date.now() - existingSession.lockedAt.getTime()) / 1000 / 60) + ' menit',
        printLayoutApplied: true,
        worksheetsCount: worksheetsCount,
        lastEditor: lastEditor ? {
          email: lastEditor.email,
          name: lastEditor.name,
          syncedAt: lastEditor.timestamp,
        } : null,
      }
    })
    
  } catch (error) {
    console.error('❌ [Sync] Error:', error)
    
    // Cleanup on error
    if (cleanup) {
      try {
        await cleanup()
      } catch {
        // Ignore cleanup errors
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Gagal menyinkronkan file',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
