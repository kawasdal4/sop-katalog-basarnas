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
 * Check if filePath is an R2 key or Google Drive ID
 */
function isR2Key(path: string | null): boolean {
  if (!path) return false
  // R2 keys typically have folder structure like "sop-files/filename.ext"
  return path.includes('/') || path.startsWith('sop-files')
}

/**
 * GET /api/download?id={sopId}
 * 
 * Download file with custom filename (No SOP - Judul SOP)
 * Supports fallback to Google Drive if R2 fails
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

    if (!sop.filePath && !sop.driveFileId) {
      return NextResponse.json({ error: 'File tidak tersedia di storage manapun' }, { status: 404 })
    }

    // Extract file extension
    const fileExt = sop.fileName.split('.').pop()?.toLowerCase() || 'pdf'
    
    // Generate custom filename
    const customFileName = `${sanitizeFileName(sop.nomorSop)} - ${sanitizeFileName(sop.judul)}.${fileExt}`
    
    console.log(`📥 [Download] Request: ${sop.nomorSop}`)
    console.log(`📁 [Download] Custom filename: ${customFileName}`)
    console.log(`   File path: ${sop.filePath}`)
    console.log(`   Drive ID: ${sop.driveFileId || 'N/A'}`)

    // Get content type
    const contentType = CONTENT_TYPES[fileExt] || 'application/octet-stream'
    
    // Encode filename for Content-Disposition header (RFC 5987)
    const encodedFileName = encodeURIComponent(customFileName)

    let fileBuffer: Buffer | null = null
    let usedFallback = false

    // STEP 1: Try R2 if configured and filePath looks like R2 key
    if (isR2Configured() && isR2Key(sop.filePath)) {
      console.log(`📥 [Download] Trying R2: ${sop.filePath}`)
      try {
        const result = await downloadFromR2(sop.filePath)
        fileBuffer = result.buffer
        console.log(`✅ [Download] Got ${fileBuffer.length} bytes from R2`)
      } catch (r2Error) {
        console.warn('⚠️ [Download] R2 failed:', r2Error instanceof Error ? r2Error.message : r2Error)
        fileBuffer = null
      }
    }

    // STEP 2: Fallback to Google Drive if R2 failed or not available
    if (!fileBuffer && sop.driveFileId) {
      console.log(`📥 [Download] Trying Google Drive fallback: ${sop.driveFileId}`)
      try {
        const gd = await import('@/lib/google-drive')
        fileBuffer = await gd.downloadFileFromDrive(sop.driveFileId)
        usedFallback = true
        console.log(`✅ [Download] Got ${fileBuffer.length} bytes from Google Drive`)
      } catch (driveError) {
        console.error('❌ [Download] Google Drive fallback also failed:', driveError instanceof Error ? driveError.message : driveError)
        fileBuffer = null
      }
    }

    // STEP 3: Last resort - redirect to Google Drive URL
    if (!fileBuffer && sop.driveFileId) {
      console.log(`🔗 [Download] Redirecting to Google Drive URL`)
      const driveUrl = `https://drive.google.com/uc?export=download&id=${sop.driveFileId}`
      return NextResponse.redirect(driveUrl)
    }

    // If still no file, return error
    if (!fileBuffer) {
      return NextResponse.json({ 
        error: 'File tidak ditemukan di storage',
        details: 'File tidak tersedia di R2 maupun Google Drive'
      }, { status: 404 })
    }

    console.log(`✅ [Download] Sending ${fileBuffer.length} bytes${usedFallback ? ' (via Google Drive fallback)' : ''}`)

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
