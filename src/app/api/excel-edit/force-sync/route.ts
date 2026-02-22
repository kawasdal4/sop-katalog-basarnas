/**
 * Excel Edit - Force Sync API with Permanent Print Layout
 * 
 * Used when conflict is detected and user chooses to force overwrite.
 * This will overwrite the file in R2 regardless of changes made by others.
 * 
 * Includes permanent print layout application via Microsoft Graph API.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import {
  forceCompleteSession,
  calculateHash
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
 * POST /api/excel-edit/force-sync
 * 
 * Force overwrite file even when conflict detected.
 * Request: FormData with file, sessionId, and confirmed=true
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
        error: 'Forbidden - Hanya admin yang dapat melakukan force sync',
      }, { status: 403 })
    }
    
    // ============================================
    // STEP 2: Parse Request
    // ============================================
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sessionId = formData.get('sessionId') as string | null
    const confirmed = formData.get('confirmed') === 'true'
    
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
    
    if (!confirmed) {
      return NextResponse.json({
        success: false,
        error: 'Konfirmasi diperlukan untuk force sync. Kirim confirmed=true',
      }, { status: 400 })
    }
    
    console.log(`⚠️ [ForceSync] Starting force sync for session: ${sessionId}`)
    console.log(`⚠️ [ForceSync] File: ${file.name}, Size: ${file.size} bytes`)
    
    // ============================================
    // STEP 3: Validate Session
    // ============================================
    const session = await db.fileEditSession.findUnique({
      where: { id: sessionId }
    })
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Session tidak ditemukan',
      }, { status: 404 })
    }
    
    // Check ownership
    if (session.editorUserId !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Session ini bukan milik Anda',
      }, { status: 403 })
    }
    
    // Check status
    if (session.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: `Session sudah ${session.status}`,
      }, { status: 400 })
    }
    
    // Check expiry
    if (session.expiresAt < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'Session sudah kadaluarsa',
      }, { status: 400 })
    }
    
    // ============================================
    // STEP 4: Calculate New Hash
    // ============================================
    const fileArrayBuffer = await file.arrayBuffer()
    const newFileBuffer = Buffer.from(fileArrayBuffer)
    const newHash = calculateHash(newFileBuffer)
    
    console.log(`🔐 [ForceSync] New file hash: ${newHash.slice(0, 16)}...`)
    console.log(`🔐 [ForceSync] Original hash: ${session.originalHash.slice(0, 16)}...`)
    
    // ============================================
    // STEP 5: Apply Permanent Print Layout via Microsoft Graph API
    // ============================================
    console.log(`📐 [ForceSync] Applying permanent print layout via Microsoft Graph API...`)
    
    let finalBuffer: Buffer
    let worksheetsCount = 0
    
    try {
      const layoutResult = await applyPermanentPrintLayout(file.name, newFileBuffer)
      
      finalBuffer = layoutResult.modifiedBuffer
      worksheetsCount = layoutResult.worksheetsCount
      cleanup = layoutResult.cleanup
      
      console.log(`✅ [ForceSync] Print layout applied to ${worksheetsCount} worksheets`)
      console.log(`📊 [ForceSync] Modified file size: ${finalBuffer.length} bytes`)
      
    } catch (layoutError) {
      console.error('❌ [ForceSync] Failed to apply print layout:', layoutError)
      
      // Jika gagal di salah satu step, jangan overwrite R2
      return NextResponse.json({
        success: false,
        error: 'Gagal menerapkan print layout ke file Excel',
        details: layoutError instanceof Error ? layoutError.message : 'Unknown error',
        hint: 'Pastikan koneksi ke Microsoft Graph API tersedia dan file dalam format Excel yang valid',
      }, { status: 500 })
    }
    
    // ============================================
    // STEP 6: Upload to R2 (Force Overwrite)
    // ============================================
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'xlsx'
    const contentType = CONTENT_TYPES[fileExt] || CONTENT_TYPES.xlsx
    
    const finalHash = calculateHash(finalBuffer)
    
    console.log(`⚠️ [ForceSync] Force uploading to R2: ${session.objectKey}`)
    
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: session.objectKey, // Same key = overwrite
      Body: finalBuffer,
      ContentType: contentType,
      Metadata: {
        'edited-by': user.email,
        'edit-session': sessionId,
        'force-sync': 'true',
        'original-hash': session.originalHash.slice(0, 16),
        'new-hash': finalHash.slice(0, 16),
        'print-layout-applied': 'true',
        'worksheets-count': worksheetsCount.toString(),
      }
    })
    
    await r2Client.send(putCommand)
    console.log(`✅ [ForceSync] File force uploaded successfully with permanent print layout`)
    
    // ============================================
    // STEP 7: Complete Session (Force)
    // ============================================
    await forceCompleteSession(sessionId, finalHash)
    
    // ============================================
    // STEP 8: Log Activity
    // ============================================
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'EXCEL_EDIT_FORCE_SYNC',
          deskripsi: `Force Sync Excel: ${session.objectKey} (${file.size} bytes) - Print layout applied to ${worksheetsCount} worksheets - ME TIMPA PERUBAHAN USER LAIN`,
          fileId: session.sopFileId || undefined,
          metadata: JSON.stringify({
            objectKey: session.objectKey,
            sessionId: sessionId,
            originalHash: session.originalHash.slice(0, 16) + '...',
            newHash: finalHash.slice(0, 16) + '...',
            fileSize: file.size,
            forceSync: true,
            printLayoutApplied: true,
            worksheetsCount: worksheetsCount,
            editDuration: Math.round((Date.now() - session.lockedAt.getTime()) / 1000 / 60),
          }),
        },
      })
    } catch (logError) {
      console.warn('⚠️ Failed to create log:', logError)
    }
    
    console.log(`✅ [ForceSync] Complete in ${Date.now() - startTime}ms`)
    
    // ============================================
    // STEP 9: Cleanup temp files from OneDrive
    // ============================================
    if (cleanup) {
      try {
        await cleanup()
        console.log(`✅ [ForceSync] OneDrive temp file cleaned up`)
      } catch (cleanupError) {
        console.warn('⚠️ [ForceSync] Failed to cleanup OneDrive temp file (non-critical):', cleanupError)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'File berhasil disinkronkan dan print layout diperbarui',
      data: {
        objectKey: session.objectKey,
        fileSize: file.size,
        originalHash: session.originalHash.slice(0, 16) + '...',
        newHash: finalHash.slice(0, 16) + '...',
        editDuration: Math.round((Date.now() - session.lockedAt.getTime()) / 1000 / 60) + ' menit',
        forceSync: true,
        printLayoutApplied: true,
        worksheetsCount: worksheetsCount,
      }
    })
    
  } catch (error) {
    console.error('❌ [ForceSync] Error:', error)
    
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
      error: 'Gagal melakukan force sync',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
