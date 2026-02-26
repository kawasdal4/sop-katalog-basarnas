import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
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

// Content types
const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
}

/**
 * GET /api/file?action=preview|download&id={documentId}
 * 
 * File handler untuk preview dan download dari Cloudflare R2
 * Proxies file through API to avoid CORS issues
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    // Allow access without auth for public documents
    const action = request.nextUrl.searchParams.get('action') || 'preview'
    const documentId = request.nextUrl.searchParams.get('id')
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID diperlukan' }, { status: 400 })
    }

    // Get document from database
    const document = await db.sopFile.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    if (!document.filePath) {
      return NextResponse.json({ error: 'File tidak tersedia di storage' }, { status: 404 })
    }

    const fileExtension = document.fileName.toLowerCase().split('.').pop() || 'pdf'
    const fileKey = document.filePath

    console.log(`📄 File request: ${action} - ${document.nomorSop} (${fileExtension})`)

    // Download file from R2
    const r2Response = await r2Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    }))

    if (!r2Response.Body) {
      return NextResponse.json({ error: 'File tidak ditemukan di storage' }, { status: 404 })
    }

    const fileBuffer = Buffer.from(await r2Response.Body.transformToByteArray())
    const contentType = CONTENT_TYPES[fileExtension] || 'application/octet-stream'

    // Log activity and increment counters
    const logActivity = async (activityType: 'PREVIEW' | 'DOWNLOAD') => {
      if (userId) {
        try {
          if (activityType === 'PREVIEW') {
            await db.sopFile.update({
              where: { id: documentId },
              data: { previewCount: { increment: 1 } }
            })
          } else {
            await db.sopFile.update({
              where: { id: documentId },
              data: { downloadCount: { increment: 1 } }
            })
          }
          await db.log.create({
            data: {
              userId,
              aktivitas: activityType,
              deskripsi: `${activityType === 'PREVIEW' ? 'Preview' : 'Download'} ${document.jenis}: ${document.nomorSop}`,
              fileId: documentId
            }
          })
        } catch (logError) {
          console.warn('⚠️ Failed to log activity:', logError)
        }
      }
    }

    // Log the activity
    await logActivity(action === 'download' ? 'DOWNLOAD' : 'PREVIEW')

    // Sanitize filename for header
    const sanitizedFileName = document.fileName.replace(/[^\w\-.]/g, '_')
    const encodedFileName = encodeURIComponent(document.fileName)

    // For PDF preview - return file directly with CORS headers
    if (fileExtension === 'pdf' && action === 'preview') {
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${sanitizedFileName}"; filename*=UTF-8''${encodedFileName}`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600',
          // CORS headers for cross-origin access
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    // For download or other file types
    const disposition = action === 'download' ? 'attachment' : 'inline'
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${sanitizedFileName}"; filename*=UTF-8''${encodedFileName}`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
        // CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

  } catch (error) {
    console.error('[File API] Error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat mengakses file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
