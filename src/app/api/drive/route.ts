import { NextResponse } from 'next/server'
import { testDriveConnection, isGoogleDriveConfigured } from '@/lib/google-drive'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check if Google Drive credentials are configured
    const isConfigured = isGoogleDriveConfigured()
    
    if (!isConfigured) {
      return NextResponse.json({
        connected: false,
        status: 'disconnected',
        message: 'Google Drive credentials not configured',
        details: {
          hasClientId: !!process.env.GOOGLE_CLIENT_ID,
          hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
          hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
          hasFolderId: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
        }
      })
    }
    
    // Test actual connection to Google Drive
    const connectionTest = await testDriveConnection()
    
    if (connectionTest.success) {
      return NextResponse.json({
        connected: true,
        status: 'connected',
        message: connectionTest.message,
        details: connectionTest.details
      })
    } else {
      return NextResponse.json({
        connected: false,
        status: 'error',
        message: connectionTest.message,
        details: connectionTest.details
      })
    }
  } catch (error) {
    console.error('Drive status check error:', error)
    return NextResponse.json({
      connected: false,
      status: 'error',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
