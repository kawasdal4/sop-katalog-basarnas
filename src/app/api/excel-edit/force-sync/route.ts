/**
 * Excel Edit - Force Sync API
 * 
 * Used when conflict is detected and user chooses to force overwrite.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { forceCompleteSession, calculateHash } from '@/lib/file-lock-service'

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
    const confirmed = formData.get('confirmed') === 'true'
    
    if (!file || !sessionId) {
      return NextResponse.json({ success: false, error: 'File dan Session ID diperlukan' }, { status: 400 })
    }
    
    if (!confirmed) {
      return NextResponse.json({ success: false, error: 'Konfirmasi diperlukan' }, { status: 400 })
    }
    
    const session = await db.fileEditSession.findUnique({ where: { id: sessionId } })
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session tidak ditemukan' }, { status: 404 })
    }
    
    if (session.editorUserId !== userId) {
      return NextResponse.json({ success: false, error: 'Session ini bukan milik Anda' }, { status: 403 })
    }
    
    if (session.status !== 'active' || session.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'Session sudah tidak valid' }, { status: 400 })
    }
    
    const fileArrayBuffer = await file.arrayBuffer()
    const newFileBuffer = Buffer.from(fileArrayBuffer)
    const newHash = calculateHash(newFileBuffer)
    
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'xlsx'
    const contentType = CONTENT_TYPES[fileExt] || CONTENT_TYPES.xlsx
    
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: session.objectKey,
      Body: newFileBuffer,
      ContentType: contentType,
      Metadata: {
        'edited-by': user.email,
        'edit-session': sessionId,
        'force-sync': 'true',
      }
    }))
    
    await forceCompleteSession(sessionId, newHash)
    
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'EXCEL_EDIT_FORCE_SYNC',
          deskripsi: `Force Sync Excel: ${session.objectKey}`,
          fileId: session.sopFileId || undefined,
          metadata: JSON.stringify({ objectKey: session.objectKey, sessionId, forceSync: true }),
        },
      })
    } catch {}
    
    return NextResponse.json({
      success: true,
      message: 'File berhasil disinkronkan (force)',
      data: {
        objectKey: session.objectKey,
        fileSize: file.size,
        forceSync: true,
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Gagal melakukan force sync',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
