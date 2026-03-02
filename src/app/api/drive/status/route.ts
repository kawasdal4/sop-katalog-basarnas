import { NextResponse } from 'next/server'
import { testDriveConnection, isGoogleDriveConfigured, checkTokenValidity, getMissingCredentials } from '@/lib/google-drive'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check if Google Drive credentials are configured
    if (!isGoogleDriveConfigured()) {
      const missing = getMissingCredentials()
      return NextResponse.json({
        connected: false,
        status: 'not_configured',
        message: 'Google Drive credentials not configured',
        requiresReconnect: false,
        needsSetup: true,
        details: {
          missingCredentials: missing,
          setupInstructions: getSetupInstructions(missing)
        }
      })
    }

    // Check token validity first
    const tokenStatus = await checkTokenValidity()
    
    if (!tokenStatus.valid) {
      return NextResponse.json({
        connected: false,
        status: 'token_expired',
        message: 'Session expired – silakan reconnect Google Drive',
        requiresReconnect: true,
        needsSetup: false,
        details: {
          tokenValid: false,
          tokenExpired: true,
          lastChecked: tokenStatus.lastChecked
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
        requiresReconnect: false,
        needsSetup: false,
        details: {
          ...connectionTest.details,
          tokenValid: true,
          lastChecked: new Date()
        }
      })
    } else {
      const requiresReconnect = connectionTest.details?.requiresReconnect || false
      
      return NextResponse.json({
        connected: false,
        status: requiresReconnect ? 'token_expired' : 'error',
        message: connectionTest.message,
        requiresReconnect,
        needsSetup: false,
        details: connectionTest.details
      })
    }
  } catch (error) {
    console.error('Drive status error:', error)
    return NextResponse.json({
      connected: false,
      status: 'error',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      requiresReconnect: true,
      needsSetup: false
    })
  }
}

// Health check endpoint - lightweight token validation
export async function HEAD() {
  try {
    if (!isGoogleDriveConfigured()) {
      return new NextResponse(null, { status: 503, headers: { 'X-Drive-Status': 'not-configured' } })
    }
    
    const tokenStatus = await checkTokenValidity()
    
    if (!tokenStatus.valid) {
      return new NextResponse(null, { status: 401, headers: { 'X-Drive-Status': 'token-expired' } })
    }
    
    return new NextResponse(null, { status: 200, headers: { 'X-Drive-Status': 'connected' } })
  } catch {
    return new NextResponse(null, { status: 503, headers: { 'X-Drive-Status': 'error' } })
  }
}

function getSetupInstructions(missing: string[]): Record<string, string> {
  const instructions: Record<string, string> = {}
  
  if (missing.includes('GOOGLE_CLIENT_ID')) {
    instructions.GOOGLE_CLIENT_ID = 'Get from Google Cloud Console > APIs & Services > Credentials'
  }
  if (missing.includes('GOOGLE_CLIENT_SECRET')) {
    instructions.GOOGLE_CLIENT_SECRET = 'Get from Google Cloud Console > APIs & Services > Credentials'
  }
  if (missing.includes('GOOGLE_REFRESH_TOKEN')) {
    instructions.GOOGLE_REFRESH_TOKEN = 'Generate using OAuth2 Playground with Drive API scope'
  }
  if (missing.includes('GOOGLE_DRIVE_FOLDER_ID')) {
    instructions.GOOGLE_DRIVE_FOLDER_ID = 'Get from Google Drive folder URL (the ID in the URL)'
  }
  
  return instructions
}
