import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { getR2PresignedUrl } from '@/lib/r2-storage'

// R2 Public URL dari environment
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev'

/**
 * GET /api/file?action=preview|download|print&id={documentId}
 * 
 * File handler untuk preview, download, dan print dari Cloudflare R2
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

    const fileExtension = document.fileName.toLowerCase().split('.').pop()
    const fileKey = document.filePath

    console.log(`📄 File request: ${action} - ${document.nomorSop} (${fileExtension})`)

    // Use public URL (no expiration, works for Office Online Viewer)
    const publicUrl = `${R2_PUBLIC_URL}/${fileKey}`

    // Log activity and increment counters
    const logActivity = async (activityType: 'PREVIEW' | 'DOWNLOAD') => {
      if (userId) {
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
      }
    }

    // Handle PDF files
    if (fileExtension === 'pdf') {
      await logActivity(action === 'download' ? 'DOWNLOAD' : 'PREVIEW')
      
      // Redirect directly to PDF
      if (action === 'preview' || action === 'print') {
        return NextResponse.redirect(publicUrl)
      }
      
      return NextResponse.json({
        success: true,
        downloadUrl: publicUrl,
        fileName: document.fileName
      })
    }

    // Handle Excel files - use Microsoft Office Online Viewer
    if (['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
      await logActivity(action === 'download' ? 'DOWNLOAD' : 'PREVIEW')
      
      if (action === 'download') {
        return NextResponse.json({
          success: true,
          downloadUrl: publicUrl,
          fileName: document.fileName
        })
      }

      // For preview - use Microsoft Office Online Viewer
      const encodedUrl = encodeURIComponent(publicUrl)
      const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`
      
      console.log(`📊 Excel preview URL: ${officeViewerUrl.substring(0, 100)}...`)
      
      return NextResponse.json({
        success: true,
        viewerUrl: officeViewerUrl,
        viewerType: 'microsoft-office',
        downloadUrl: publicUrl,
        fileName: document.fileName
      })
    }

    // Handle Word documents
    if (['docx', 'doc'].includes(fileExtension || '')) {
      await logActivity(action === 'download' ? 'DOWNLOAD' : 'PREVIEW')

      if (action === 'download') {
        return NextResponse.json({
          success: true,
          downloadUrl: publicUrl,
          fileName: document.fileName
        })
      }

      // Use Microsoft Office Online Viewer for Word docs
      const encodedUrl = encodeURIComponent(publicUrl)
      const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`
      
      return NextResponse.json({
        success: true,
        viewerUrl: officeViewerUrl,
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
