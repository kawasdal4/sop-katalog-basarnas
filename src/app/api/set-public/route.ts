import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// GET - Set file to public and return viewer URL
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionData = cookieStore.get('session')?.value
    
    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    
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
    
    // Determine which viewer to use
    let viewerUrl: string
    let viewerType: string
    
    if (result.isGoogleSheet) {
      // For Google Sheets, use Google Sheets preview
      viewerUrl = gd.getGoogleSheetsPreviewUrl(fileId)
      viewerType = 'google-sheets'
      console.log(`📊 File is Google Sheet - using Google Sheets preview`)
    } else {
      // For Excel files, use Microsoft Office Viewer with direct download link
      viewerUrl = gd.getMicrosoftOfficeViewerUrl(fileId)
      viewerType = 'microsoft-office'
      console.log(`📊 File is Excel - using Microsoft Office Viewer`)
    }
    
    console.log(`✅ File set to public`)
    console.log(`   Viewer URL: ${viewerUrl.substring(0, 80)}...`)
    
    return NextResponse.json({ 
      success: true, 
      viewerUrl,
      viewerType,
      isGoogleSheet: result.isGoogleSheet,
      mimeType: result.mimeType,
      directDownloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`
    })
    
  } catch (error) {
    console.error('Set public error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat mengatur permission file' 
    }, { status: 500 })
  }
}
