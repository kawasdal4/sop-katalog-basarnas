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
    const pathParam = request.nextUrl.searchParams.get('path')

    if (!documentId && !pathParam) {
      return NextResponse.json({ error: 'Document ID atau Path diperlukan' }, { status: 400 })
    }

    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json({ error: 'R2 storage tidak terkonfigurasi' }, { status: 500 })
    }

    let fileKey = ''
    let fileName = 'document.pdf'
    let judul = 'Dokumen'
    let documentIdForLog = documentId

    if (documentId) {
      // Get document from database
      const document = await db.sopFile.findUnique({
        where: { id: documentId }
      })

      if (!document) {
        // Try sopPembuatan for builders
        const sopPembuatan = await (db as any).sopPembuatan.findUnique({
          where: { id: documentId }
        })

        if (!sopPembuatan) {
          return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 })
        }

        fileKey = sopPembuatan.combinedPdfPath
        fileName = `sop-${sopPembuatan.judul}.pdf`
        judul = sopPembuatan.judul
      } else {
        if (!document.filePath) {
          return NextResponse.json({ error: 'File tidak tersedia' }, { status: 404 })
        }
        fileKey = document.filePath
        fileName = document.fileName
        judul = document.judul
      }
    } else if (pathParam) {
      fileKey = decodeURIComponent(pathParam)
      // Infer filename from path
      const parts = fileKey.split('/')
      fileName = parts[parts.length - 1]
      judul = fileName.replace(/\.pdf$/i, '')
    }

    const fileExtension = fileName.toLowerCase().split('.').pop() || 'pdf'
    const publicUrl = getR2PublicUrl(fileKey)

    console.log(`📄 File request: ${action} - ${judul} (${fileExtension})`)
    console.log(`   R2 key: ${fileKey}`)
    console.log(`   Public URL: ${publicUrl ? 'Available' : 'Not available (will serve directly)'}`)

    // Log activity increment counters
    const logActivity = async (activityType: 'PREVIEW' | 'DOWNLOAD') => {
      if (userId && documentIdForLog) {
        try {
          if (activityType === 'PREVIEW') {
            await db.sopFile.update({
              where: { id: documentIdForLog },
              data: { previewCount: { increment: 1 } }
            }).catch(() => { }) // Ignore if not in sopFile
          } else {
            await db.sopFile.update({
              where: { id: documentIdForLog },
              data: { downloadCount: { increment: 1 } }
            }).catch(() => { }) // Ignore if not in sopFile
          }
          await db.log.create({
            data: {
              userId,
              aktivitas: activityType,
              deskripsi: `${activityType === 'PREVIEW' ? 'Preview' : 'Download'} File: ${judul}`,
              fileId: documentIdForLog
            }
          })
        } catch (logError) {
          console.warn('⚠️ Failed to log activity:', logError)
        }
      }
    }

    // Log the activity
    await logActivity(action === 'download' ? 'DOWNLOAD' : 'PREVIEW')

    // For Excel/Word files - use Office Online via /api/preview-office flow (R2 -> OneDrive -> Office Online)
    if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(fileExtension)) {
      console.log('📊 Office preview flow: R2 -> OneDrive -> Office Online')
      return NextResponse.json({
        success: true,
        usePreviewOffice: true,
        message: 'Gunakan /api/preview-office untuk preview file Office',
        downloadUrl: `/api/download?${documentId ? `id=${documentId}` : `path=${encodeURIComponent(fileKey)}`}`,
        fileName: fileName
      })
    }

    // For PDF files with download action - return JSON with download URL
    if (action === 'download') {
      return NextResponse.json({
        success: true,
        downloadUrl: `/api/download?${documentId ? `id=${documentId}` : `path=${encodeURIComponent(fileKey)}`}`,
        fileName: fileName
      })
    }

    // For PDF preview - download from R2 and return file directly
    // This avoids CORS issues with direct R2 access
    const result = await downloadFromR2(fileKey)
    const fileBuffer = result.buffer
    const contentType = CONTENT_TYPES[fileExtension] || 'application/octet-stream'

    // Generate filename
    const sanitizeFileNameLoc = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)
    const customFileName = `${sanitizeFileNameLoc(judul)}.${fileExtension}`
    const encodedFileName = encodeURIComponent(customFileName)

    // Return PDF file directly for preview
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${customFileName}"; filename*=UTF-8''${encodedFileName}`,
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
