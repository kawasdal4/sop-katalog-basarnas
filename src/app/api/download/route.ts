import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

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

// Content types for different file types
const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
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
 * GET /api/download?id={sopId}
 * 
 * Download file with custom filename (No SOP - Judul SOP)
 */
export async function GET(request: NextRequest) {
  try {
    const sopId = request.nextUrl.searchParams.get('id')
    
    if (!sopId) {
      return NextResponse.json({ error: 'ID SOP diperlukan' }, { status: 400 })
    }

    // Get SOP data from database
    const sop = await db.sopFile.findUnique({
      where: { id: sopId }
    })

    if (!sop) {
      return NextResponse.json({ error: 'SOP tidak ditemukan' }, { status: 404 })
    }

    if (!sop.filePath) {
      return NextResponse.json({ error: 'File tidak tersedia di storage' }, { status: 404 })
    }

    // Extract file extension
    const fileExt = sop.fileName.split('.').pop()?.toLowerCase() || 'pdf'
    
    // Generate custom filename
    const customFileName = `${sanitizeFileName(sop.nomorSop)} - ${sanitizeFileName(sop.judul)}.${fileExt}`
    
    console.log(`📥 [Download] Fetching from R2: ${sop.filePath}`)
    console.log(`📁 [Download] Custom filename: ${customFileName}`)

    // Download from R2
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: sop.filePath,
    })
    
    const r2Response = await r2Client.send(getCommand)
    
    if (!r2Response.Body) {
      return NextResponse.json({ error: 'File tidak ditemukan di R2' }, { status: 404 })
    }

    // Convert stream to buffer
    const fileBuffer = Buffer.from(await r2Response.Body.transformToByteArray())
    
    // Get content type
    const contentType = CONTENT_TYPES[fileExt] || 'application/octet-stream'
    
    // Encode filename for Content-Disposition header (RFC 5987)
    const encodedFileName = encodeURIComponent(customFileName)
    
    console.log(`✅ [Download] Sending ${fileBuffer.length} bytes`)

    // Return file with custom filename
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
    
  } catch (error) {
    console.error('[Download API] Error:', error)
    return NextResponse.json({ 
      error: 'Gagal mengunduh file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
