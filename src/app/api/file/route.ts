import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-${R2_ACCOUNT_ID}.r2.dev`

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
 * File handler untuk preview dan download dari Cloudflare R2 dengan fallback ke Google Drive
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

    if (!document.filePath && !document.driveFileId) {
      return NextResponse.json({ error: 'File tidak tersedia di storage' }, { status: 404 })
    }

    const fileExtension = document.fileName.toLowerCase().split('.').pop() || 'pdf'
    const fileKey = document.filePath
    const publicUrl = `${R2_PUBLIC_URL}/${fileKey}`

    console.log(`📄 File request: ${action} - ${document.nomorSop} (${fileExtension})`)
    console.log(`   File path: ${fileKey}`)
    console.log(`   Drive ID: ${document.driveFileId || 'N/A'}`)

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

    // Helper function to get Google Drive download URL
    const getGoogleDriveUrl = (driveFileId: string) => {
      return `https://drive.google.com/uc?export=download&id=${driveFileId}`
    }

    // Helper function to check if filePath is an R2 key or Google Drive ID
    const isR2Key = (path: string | null) => {
      if (!path) return false
      // R2 keys typically have folder structure like "sop-files/filename.ext"
      return path.includes('/') || path.startsWith('sop-files')
    }

    // For Excel/Word files - return JSON with Office Online Viewer URL
    if (['xlsx', 'xls', 'csv', 'docx', 'doc'].includes(fileExtension)) {
      // Determine which URL to use for Office Online Viewer
      let viewerFileUrl: string
      
      if (isR2Key(fileKey)) {
        // Use R2 public URL
        viewerFileUrl = publicUrl
      } else if (document.driveFileId) {
        // Fallback to Google Drive - need to use proxy for Office Online
        // Office Online can't directly access Google Drive, so we'll use a workaround
        // Return the Google Drive preview URL instead
        const drivePreviewUrl = `https://drive.google.com/file/d/${document.driveFileId}/preview`
        
        console.log(`📊 Using Google Drive fallback: ${drivePreviewUrl}`)
        
        return NextResponse.json({
          success: true,
          viewerUrl: drivePreviewUrl,
          viewerType: 'google-drive',
          downloadUrl: getGoogleDriveUrl(document.driveFileId),
          fileName: document.fileName,
          fallback: true,
          message: 'File tersedia di Google Drive'
        })
      } else {
        // No valid storage
        return NextResponse.json({ 
          error: 'File tidak ditemukan di storage manapun' 
        }, { status: 404 })
      }
      
      const encodedUrl = encodeURIComponent(viewerFileUrl)
      const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`
      
      console.log(`📊 Office Online Viewer URL: ${officeViewerUrl.substring(0, 100)}...`)
      
      return NextResponse.json({
        success: true,
        viewerUrl: officeViewerUrl,
        viewerType: 'microsoft-office',
        downloadUrl: viewerFileUrl,
        fileName: document.fileName
      })
    }

    // For PDF files with download action - return JSON with download URL
    if (action === 'download') {
      let downloadUrl: string
      
      if (isR2Key(fileKey)) {
        downloadUrl = publicUrl
      } else if (document.driveFileId) {
        downloadUrl = getGoogleDriveUrl(document.driveFileId)
      } else {
        return NextResponse.json({ 
          error: 'File tidak ditemukan di storage manapun' 
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: true,
        downloadUrl,
        fileName: document.fileName
      })
    }

    // For PDF preview - download from R2 and return file directly
    // This avoids CORS issues with direct R2 access
    if (isR2Key(fileKey)) {
      try {
        const r2Response = await r2Client.send(new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: fileKey,
        }))

        if (r2Response.Body) {
          const fileBuffer = Buffer.from(await r2Response.Body.transformToByteArray())
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
        }
      } catch (r2Error) {
        console.warn('⚠️ R2 access failed, trying Google Drive fallback:', r2Error)
      }
    }

    // Fallback to Google Drive
    if (document.driveFileId) {
      console.log(`📥 Using Google Drive fallback for: ${document.nomorSop}`)
      
      // Try to download from Google Drive and proxy
      try {
        const gd = await import('@/lib/google-drive')
        const fileBuffer = await gd.downloadFileFromDrive(document.driveFileId)
        
        const contentType = CONTENT_TYPES[fileExtension] || 'application/octet-stream'
        const sanitizedFileName = document.fileName.replace(/[^\w\-.]/g, '_')
        const encodedFileName = encodeURIComponent(document.fileName)

        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${sanitizedFileName}"; filename*=UTF-8''${encodedFileName}`,
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      } catch (driveError) {
        console.error('❌ Google Drive fallback also failed:', driveError)
        
        // Last resort: return Google Drive URL
        const driveUrl = `https://drive.google.com/file/d/${document.driveFileId}/preview`
        return NextResponse.json({
          success: true,
          viewerUrl: driveUrl,
          viewerType: 'google-drive',
          downloadUrl: getGoogleDriveUrl(document.driveFileId),
          fileName: document.fileName,
          fallback: true,
          message: 'File tersedia di Google Drive'
        })
      }
    }

    return NextResponse.json({ 
      error: 'File tidak ditemukan di storage',
      details: 'File tidak tersedia di R2 maupun Google Drive'
    }, { status: 404 })

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
