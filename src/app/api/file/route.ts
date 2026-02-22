import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// R2 Public URL from environment
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev'

/**
 * GET /api/file?action=preview|download&id={documentId}
 * 
 * File handler for preview and download from Cloudflare R2
 * Returns public URLs and Office Online viewer URLs
 */
export async function GET(request: NextRequest) {
  try {
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

    const fileExtension = document.fileName.toLowerCase().split('.').pop()
    const fileKey = document.filePath

    console.log(`📄 [FileAPI] ${action} - ${document.nomorSop} (${fileExtension})`)

    // Build public URL
    const publicUrl = `${R2_PUBLIC_URL}/${fileKey}`

    // Handle PDF files
    if (fileExtension === 'pdf') {
      // Update preview counter if preview action
      if (action === 'preview') {
        try {
          await db.sopFile.update({
            where: { id: documentId },
            data: { previewCount: { increment: 1 } }
          })
        } catch {}
      }
      
      return NextResponse.json({
        success: true,
        downloadUrl: publicUrl,
        fileName: document.fileName,
        fileType: 'pdf'
      })
    }

    // Handle Excel files - use Microsoft Office Online Viewer
    if (['xlsx', 'xls', 'xlsm', 'csv'].includes(fileExtension || '')) {
      // Update preview counter
      if (action === 'preview') {
        try {
          await db.sopFile.update({
            where: { id: documentId },
            data: { previewCount: { increment: 1 } }
          })
        } catch {}
      }
      
      if (action === 'download') {
        return NextResponse.json({
          success: true,
          downloadUrl: publicUrl,
          fileName: document.fileName
        })
      }

      // For preview - use Microsoft Office Online Viewer
      const encodedUrl = encodeURIComponent(publicUrl)
      const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`
      
      console.log(`📊 [FileAPI] Excel preview URL generated`)
      
      return NextResponse.json({
        success: true,
        viewerUrl: viewerUrl,
        viewerType: 'microsoft-office',
        downloadUrl: publicUrl,
        fileName: document.fileName
      })
    }

    // Handle Word documents
    if (['docx', 'doc'].includes(fileExtension || '')) {
      if (action === 'preview') {
        try {
          await db.sopFile.update({
            where: { id: documentId },
            data: { previewCount: { increment: 1 } }
          })
        } catch {}
      }

      const encodedUrl = encodeURIComponent(publicUrl)
      const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`
      
      return NextResponse.json({
        success: true,
        viewerUrl: viewerUrl,
        viewerType: 'microsoft-office',
        downloadUrl: publicUrl,
        fileName: document.fileName
      })
    }

    // Other file types - return public URL
    return NextResponse.json({
      success: true,
      downloadUrl: publicUrl,
      fileName: document.fileName
    })

  } catch (error) {
    console.error('[File API] Error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat mengakses file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
