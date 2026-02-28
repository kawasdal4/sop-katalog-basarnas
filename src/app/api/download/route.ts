import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { downloadFromR2, isR2Configured } from '@/lib/r2-storage'

export const dynamic = 'force-dynamic'

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
 * Download file from R2 (Primary Storage) with custom filename
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
      return NextResponse.json({ error: 'File tidak tersedia' }, { status: 404 })
    }

    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json({ error: 'R2 storage tidak terkonfigurasi' }, { status: 500 })
    }

    // Extract file extension
    const fileExt = sop.fileName.split('.').pop()?.toLowerCase() || 'pdf'
    
    // Generate custom filename from judul
    const customFileName = `${sanitizeFileName(sop.judul)}.${fileExt}`
    
    console.log(`📥 [Download] Request: ${sop.judul}`)
    console.log(`📁 [Download] R2 key: ${sop.filePath}`)

    // Get content type
    const contentType = CONTENT_TYPES[fileExt] || 'application/octet-stream'
    
    // Encode filename for Content-Disposition header (RFC 5987)
    const encodedFileName = encodeURIComponent(customFileName)

    // Download from R2 (Primary Storage)
    const result = await downloadFromR2(sop.filePath)
    const fileBuffer = result.buffer

    console.log(`✅ [Download] Sending ${fileBuffer.length} bytes from R2`)

    // Increment download count
    await db.sopFile.update({
      where: { id: sopId },
      data: { downloadCount: { increment: 1 } }
    })

    // Create log
    try {
      const cookieStore = await import('next/headers').then(m => m.cookies())
      const userId = (await cookieStore).get('userId')?.value
      if (userId) {
        await db.log.create({
          data: {
            userId,
            aktivitas: 'DOWNLOAD',
            deskripsi: `Download: ${sop.judul}`,
            fileId: sopId
          }
        })
      }
    } catch {
      // Ignore log errors
    }

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
