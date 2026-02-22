import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// GET - Set file to public and return viewer URL
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userIdCookie = cookieStore.get('userId')?.value

    // Allow public access for file viewing (but still validate)
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id') || searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ error: 'File ID diperlukan' }, { status: 400 })
    }

    // Import Google Drive module
    const gd = await import('@/lib/google-drive')

    if (!gd.isGoogleDriveConfigured()) {
      return NextResponse.json({ error: 'Google Drive tidak terkonfigurasi' }, { status: 500 })
    }

    console.log(`🔓 Setting file to public: ${fileId}`)

    // Set file to public
    const result = await gd.setFilePublic(fileId)

    if (!result.success) {
      return NextResponse.json({
        error: 'Gagal mengatur permission file. Pastikan file ada di Google Drive.'
      }, { status: 500 })
    }

    // Determine which viewer to use based on MIME type
    let viewerUrl: string
    let viewerType: string
    const mimeType = result.mimeType || ''

    if (result.isGoogleSheet || mimeType.includes('spreadsheet')) {
      // For Google Sheets, use Google Sheets preview
      viewerUrl = gd.getGoogleSheetsPreviewUrl(fileId)
      viewerType = 'google-sheets'
      console.log(`📊 File is Google Sheet - using Google Sheets preview`)
    } else if (mimeType.includes('pdf')) {
      // For PDF files, use Google Drive viewer
      viewerUrl = `https://drive.google.com/file/d/${fileId}/view`
      viewerType = 'google-drive-pdf'
      console.log(`📄 File is PDF - using Google Drive viewer`)
    } else {
      // For Excel/Word/PowerPoint files - use Microsoft Office Viewer
      // This provides PDF-like output (mirror imaging - no changes to original)
      viewerUrl = gd.getMicrosoftOfficeViewerUrl(fileId)
      viewerType = 'microsoft-office'
      console.log(`📊 File is Office document - using Microsoft Office Viewer`)
    }

    console.log(`✅ File set to public`)
    console.log(`   MIME Type: ${mimeType}`)
    console.log(`   Viewer Type: ${viewerType}`)
    console.log(`   Viewer URL: ${viewerUrl.substring(0, 100)}...`)

    return NextResponse.json({
      success: true,
      viewerUrl,
      viewerType,
      isGoogleSheet: result.isGoogleSheet,
      mimeType: result.mimeType,
      directDownloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      fileId
    })

  } catch (error) {
    console.error('Set public error:', error)
    return NextResponse.json({
      error: 'Terjadi kesalahan saat mengatur permission file'
    }, { status: 500 })
  }
}
