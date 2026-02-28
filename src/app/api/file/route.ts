import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { downloadFromR2, isR2Configured, getR2PublicUrl } from '@/lib/r2-storage'

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
 * File handler untuk preview dan download dari Cloudflare R2 (Primary Storage)
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

    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json({ error: 'R2 storage tidak terkonfigurasi' }, { status: 500 })
    }

    // Get document from database
    const document = await db.sopFile.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    if (!document.filePath) {
      return NextResponse.json({ error: 'File tidak tersedia' }, { status: 404 })
    }

    const fileExtension = document.fileName.toLowerCase().split('.').pop() || 'pdf'
    const fileKey = document.filePath
    const publicUrl = getR2PublicUrl(fileKey) || `https://pub-r2.example.com/${fileKey}`

    console.log(`📄 File request: ${action} - ${document.judul} (${fileExtension})`)
    console.log(`   R2 key: ${fileKey}`)

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
              deskripsi: `${activityType === 'PREVIEW' ? 'Preview' : 'Download'} ${document.jenis}: ${document.judul}`,
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

    // For Excel/Word files - return JSON with Office Online Viewer URL
    if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(fileExtension)) {
      const encodedUrl = encodeURIComponent(publicUrl)
      const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`
      
      console.log(`📊 Office Online Viewer URL: ${officeViewerUrl.substring(0, 100)}...`)
      
      return NextResponse.json({
        success: true,
        viewerUrl: officeViewerUrl,
        viewerType: 'microsoft-office',
        downloadUrl: `/api/download?id=${documentId}`,
        fileName: document.fileName
      })
    }

    // For PDF files with download action - return JSON with download URL
    if (action === 'download') {
      return NextResponse.json({
        success: true,
        downloadUrl: `/api/download?id=${documentId}`,
        fileName: document.fileName
      })
    }

    // For PDF preview - download from R2 and return file directly
    // This avoids CORS issues with direct R2 access
    const result = await downloadFromR2(fileKey)
    const fileBuffer = result.buffer
    const contentType = CONTENT_TYPES[fileExtension] || 'application/octet-stream'

    // Sanitize filename for header
    const sanitizedFileName = document.fileName.replace(/[^\w\-.]/g, '_')
    const encodedFileName = encodeURIComponent(document.fileName)

    // Return PDF file directly for preview
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
