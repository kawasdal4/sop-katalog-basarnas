/**
 * Excel Edit - Download API with File Locking
 * 
 * STEP 1: Check file lock
 * STEP 2: Download file from R2
 * STEP 3: Calculate SHA-256 hash
 * STEP 4: Create edit session (lock the file)
 * STEP 5: Return file with session token
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'crypto'
import {
  checkFileLock,
  createEditSession,
  calculateHash,
  getLastEditor
} from '@/lib/file-lock-service'

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
 * Sanitize filename by removing invalid characters
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

/**
 * POST /api/excel-edit/download
 * 
 * Request body: { objectKey: string, fileId?: string, sopNumber?: string, sopTitle?: string }
 * Response: File download + session token in header
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
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
        error: 'Forbidden - Hanya admin yang dapat mengedit file',
      }, { status: 403 })
    }
    
    // ============================================
    // STEP 2: Validate Request
    // ============================================
    const body = await request.json()
    const { objectKey, fileId, sopNumber, sopTitle } = body
    
    if (!objectKey) {
      return NextResponse.json({
        success: false,
        error: 'objectKey diperlukan',
      }, { status: 400 })
    }
    
    // ============================================
    // STEP 3: Check File Lock
    // ============================================
    console.log(`🔒 [Download] Checking lock for: ${objectKey}`)
    
    const lockCheck = await checkFileLock(objectKey, userId)
    
    if (!lockCheck.canProceed) {
      console.log(`⚠️ [Download] File is locked: ${lockCheck.message}`)
      
      return NextResponse.json({
        success: false,
        error: 'FILE_LOCKED',
        message: lockCheck.message,
        lockedBy: lockCheck.lockedBy
      }, { status: 423 }) // 423 Locked
    }
    
    // If locked by same user, warn but allow
    if (lockCheck.isLocked && lockCheck.lockedBy) {
      console.log(`ℹ️ [Download] User has existing session`)
    }
    
    // ============================================
    // STEP 4: Download from R2
    // ============================================
    const originalFileName = objectKey.split('/').pop() || objectKey
    const fileExt = originalFileName.split('.').pop()?.toLowerCase() || 'xlsx'
    
    // Validate file type
    if (!['xlsx', 'xls', 'xlsm'].includes(fileExt)) {
      return NextResponse.json({
        success: false,
        error: 'Hanya file Excel (.xlsx, .xls, .xlsm) yang dapat diedit',
      }, { status: 400 })
    }
    
    console.log(`📥 [Download] Starting download for: ${objectKey}`)
    
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
    })
    
    const r2Response = await r2Client.send(getCommand)
    
    if (!r2Response.Body) {
      return NextResponse.json({
        success: false,
        error: 'File tidak ditemukan di storage',
      }, { status: 404 })
    }
    
    // Convert stream to buffer
    const fileBuffer = Buffer.from(await r2Response.Body.transformToByteArray())
    console.log(`✅ [Download] File downloaded: ${fileBuffer.length} bytes`)
    
    // ============================================
    // STEP 5: Calculate Hash
    // ============================================
    const originalHash = calculateHash(fileBuffer)
    console.log(`🔐 [Hash] Original hash: ${originalHash.slice(0, 16)}...`)
    
    // ============================================
    // STEP 6: Create Edit Session (Lock the file)
    // ============================================
    const session = await createEditSession(
      objectKey,
      fileId,
      userId,
      user.email,
      user.name,
      originalHash
    )
    
    console.log(`🎫 [Session] Created session: ${session.id}`)
    
    // ============================================
    // STEP 7: Get Last Editor Info
    // ============================================
    const lastEditor = await getLastEditor(objectKey)
    
    // ============================================
    // STEP 8: Log Activity
    // ============================================
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'EXCEL_EDIT_START',
          deskripsi: `Mulai edit Excel: ${originalFileName} (${objectKey})`,
          fileId: fileId,
          metadata: JSON.stringify({
            objectKey,
            sessionId: session.id,
            originalHash: originalHash.slice(0, 16) + '...',
            fileSize: fileBuffer.length,
          }),
        },
      })
    } catch (logError) {
      console.warn('⚠️ Failed to create log:', logError)
    }
    
    // ============================================
    // STEP 9: Generate Custom Filename
    // ============================================
    let fileName: string
    if (sopNumber && sopTitle) {
      const sanitizedNumber = sanitizeFileName(sopNumber)
      const sanitizedTitle = sanitizeFileName(sopTitle)
      fileName = `${sanitizedNumber} - ${sanitizedTitle}.${fileExt}`
      console.log(`📝 [Download] Custom filename: "${fileName}"`)
    } else {
      fileName = originalFileName
    }
    
    // ============================================
    // STEP 10: Return File with Session
    // ============================================
    const contentType = CONTENT_TYPES[fileExt] || CONTENT_TYPES.xlsx
    const encodedFileName = encodeURIComponent(fileName)
    
    console.log(`✅ [Download] Complete in ${Date.now() - startTime}ms`)
    
    // Return the file with session info in headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
        'Content-Length': fileBuffer.length.toString(),
        // Session info
        'X-Edit-Session-Id': session.id,
        'X-Edit-Session-Expires': session.expiresAt.toISOString(),
        'X-Original-Hash': originalHash,
        'X-Custom-Filename': fileName,
        // Last editor info
        'X-Last-Editor-Email': lastEditor?.email || '',
        'X-Last-Editor-Name': lastEditor?.name || '',
        'X-Last-Editor-Time': lastEditor?.timestamp?.toISOString() || '',
      },
    })
    
  } catch (error) {
    console.error('❌ [Download] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Gagal mengunduh file',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
