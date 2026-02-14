import { NextResponse } from 'next/server'

// Test Google Drive connection
export async function GET() {
  try {
    // Dynamic import to avoid build issues
    const { testDriveConnection, isGoogleDriveConfigured, getFolderInfo } = await import('@/lib/google-drive')
    
    // Check if configured
    if (!isGoogleDriveConfigured()) {
      return NextResponse.json({
        success: false,
        message: '❌ Google Drive tidak dikonfigurasi',
        details: {
          GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL ? '✅ Set' : '❌ Missing',
          GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? '✅ Set' : '❌ Missing',
          GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID ? '✅ Set' : '❌ Missing',
        }
      })
    }
    
    // Get folder info
    let folderInfo = null
    try {
      folderInfo = await getFolderInfo()
    } catch (e) {
      console.error('Failed to get folder info:', e)
    }
    
    // Test connection
    const result = await testDriveConnection()
    
    return NextResponse.json({
      ...result,
      details: {
        ...result.details,
        folderInfo,
      }
    })
  } catch (error) {
    console.error('Test drive error:', error)
    return NextResponse.json({
      success: false,
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }, { status: 500 })
  }
}
