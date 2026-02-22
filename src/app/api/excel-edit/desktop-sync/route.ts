/**
 * Excel Edit - Desktop Sync API with Conflict Detection
 * 
 * Note: Print layout is preserved during editing. LibreOffice handles PDF conversion.
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

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

const CONTENT_TYPES: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true, email: true },
    })
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sessionId = formData.get('sessionId') as string | null
    
    if (!file || !sessionId) {
      return NextResponse.json({ success: false, error: 'File dan Session ID diperlukan' }, { status: 400 })
    }
    
    const existingSession = await db.fileEditSession.findUnique({
      where: { id: sessionId }
    })
    
    if (!existingSession) {
      return NextResponse.json({ success: false, error: 'Session tidak ditemukan' }, { status: 404 })
    }
    
    let currentR2Hash: string
    try {
      const r2Response = await r2Client.send(new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: existingSession.objectKey,
      }))
      
      if (r2Response.Body) {
        const currentBuffer = Buffer.from(await r2Response.Body.transformToByteArray())
        currentR2Hash = calculateHash(currentBuffer)
      } else {
        currentR2Hash = ''
      }
    } catch {
      currentR2Hash = ''
    }
    
    const validation = await validateSession(sessionId, userId, currentR2Hash)
    
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 })
    }
    
    if (validation.conflict?.hasConflict) {
      return NextResponse.json({
        success: false,
        error: 'CONFLICT_DETECTED',
        message: validation.conflict.message,
        conflict: validation.conflict,
        sessionId,
        requiresForceSync: true,
      }, { status: 409 })
    }
    
    const fileArrayBuffer = await file.arrayBuffer()
    const newFileBuffer = Buffer.from(fileArrayBuffer)
    const newHash = calculateHash(newFileBuffer)
    
    if (newHash === existingSession.originalHash) {
      await completeSession(sessionId, newHash)
      return NextResponse.json({ success: true, message: 'File tidak berubah', unchanged: true })
    }
    
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'xlsx'
    const contentType = CONTENT_TYPES[fileExt] || CONTENT_TYPES.xlsx
    
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: existingSession.objectKey,
      Body: newFileBuffer,
      ContentType: contentType,
      Metadata: {
        'edited-by': user.email,
        'edit-session': sessionId,
      }
    }))
    
    await completeSession(sessionId, newHash)
    
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'EXCEL_EDIT_SYNC',
          deskripsi: `Sync Excel: ${existingSession.objectKey}`,
          fileId: existingSession.sopFileId || undefined,
          metadata: JSON.stringify({ objectKey: existingSession.objectKey, sessionId }),
        },
      })
    } catch {}
    
    const lastEditor = await getLastEditor(existingSession.objectKey)
    
    return NextResponse.json({
      success: true,
      message: 'File berhasil disinkronkan',
      data: {
        objectKey: existingSession.objectKey,
        fileSize: file.size,
        editDuration: Math.round((Date.now() - existingSession.lockedAt.getTime()) / 1000 / 60) + ' menit',
        lastEditor: lastEditor ? { email: lastEditor.email, name: lastEditor.name } : null,
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Gagal menyinkronkan file',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
