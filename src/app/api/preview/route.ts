import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { downloadFromR2, isR2Configured } from '@/lib/r2-storage'

export const dynamic = 'force-dynamic'

// GET - Preview file from R2
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
    }
    
    const sopFile = await db.sopFile.findUnique({ where: { id } })
    
    if (!sopFile) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }

    if (!sopFile.filePath) {
      return NextResponse.json({ error: 'File tidak tersedia di storage' }, { status: 404 })
    }

    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json({ 
        error: 'Cloudflare R2 tidak terkonfigurasi. Hubungi administrator.',
        needsSetup: true
      }, { status: 500 })
    }

    console.log(`👁️ [Preview] Fetching from R2: ${sopFile.filePath}`)

    // Download from R2
    let fileBuffer: Buffer
    try {
      const result = await downloadFromR2(sopFile.filePath)
      fileBuffer = result.buffer
    } catch (downloadError) {
      console.error('R2 download error:', downloadError)
      return NextResponse.json({ 
        error: 'File tidak ditemukan di R2',
        details: downloadError instanceof Error ? downloadError.message : 'Unknown error'
      }, { status: 404 })
    }
    
    // Increment preview count
    await db.sopFile.update({
      where: { id },
      data: { previewCount: { increment: 1 } }
    })
    
    // Create log (optional - don't fail if no user session)
    try {
      // For PDF, return the file as base64
      if (sopFile.fileType === 'pdf') {
        const base64 = fileBuffer.toString('base64')
        return NextResponse.json({
          type: 'pdf',
          data: base64,
          fileName: sopFile.fileName
        })
      }
      
      // For Excel, return as base64 (client will parse)
      const base64 = fileBuffer.toString('base64')
      return NextResponse.json({
        type: 'excel',
        data: base64,
        fileName: sopFile.fileName
      })
    } catch (logError) {
      console.error('Log error (non-critical):', logError)
      // Still return the file even if logging fails
      if (sopFile.fileType === 'pdf') {
        const base64 = fileBuffer.toString('base64')
        return NextResponse.json({
          type: 'pdf',
          data: base64,
          fileName: sopFile.fileName
        })
      }
      
      const base64 = fileBuffer.toString('base64')
      return NextResponse.json({
        type: 'excel',
        data: base64,
        fileName: sopFile.fileName
      })
    }
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
