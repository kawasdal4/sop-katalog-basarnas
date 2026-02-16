import { NextResponse } from 'next/server'
import { testDriveConnection, isGoogleDriveConfigured } from '@/lib/google-drive'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check if Google Drive credentials are configured
    if (!isGoogleDriveConfigured()) {
      return NextResponse.json({
        connected: false,
        status: 'disconnected',
        message: 'Google Drive credentials not configured',
        details: {
          missingCredentials: getMissingCredentials()
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
        message: connectionTest.message
      })
    }
  } catch (error) {
    console.error('Drive status error:', error)
    return NextResponse.json({
      connected: false,
      status: 'error',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
}

function getMissingCredentials(): string[] {
  const missing: string[] = []
  
  if (!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID')
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET')
  if (!process.env.GOOGLE_REFRESH_TOKEN) missing.push('GOOGLE_REFRESH_TOKEN')
  if (!process.env.GOOGLE_DRIVE_FOLDER_ID) missing.push('GOOGLE_DRIVE_FOLDER_ID')
  
  return missing
}
