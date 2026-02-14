import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// GET - Handle OAuth2 callback from Google
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.json({
      success: false,
      error: error,
      message: 'Authorization was denied or an error occurred'
    }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({
      success: false,
      error: 'No authorization code received'
    }, { status: 400 })
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${request.nextUrl.origin}/api/oauth-callback`
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.refresh_token) {
      return NextResponse.json({
        success: false,
        error: 'No refresh token received',
        message: 'Try again with prompt=consent to force refresh token generation',
        hint: 'Make sure to revoke access and re-authorize: https://myaccount.google.com/permissions'
      }, { status: 400 })
    }

    // Get user info
    oauth2Client.setCredentials(tokens)
    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    const about = await drive.about.get({ fields: 'user(emailAddress, displayName)' })

    // Return success with tokens
    return NextResponse.json({
      success: true,
      message: '✅ Authorization successful! Copy the refresh token below to your .env file',
      user: about.data.user,
      tokens: {
        access_token: tokens.access_token ? '***RECEIVED***' : 'NOT RECEIVED',
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      },
      envConfig: `
# Add this to your .env file:
GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}

# Your current configuration:
GOOGLE_CLIENT_ID=${clientId}
GOOGLE_CLIENT_SECRET=${clientSecret ? '***SET***' : 'NOT SET'}
GOOGLE_DRIVE_FOLDER_ID=${process.env.GOOGLE_DRIVE_FOLDER_ID}
`,
      instructions: [
        '1. Copy the refresh_token value above',
        '2. Open your .env file',
        '3. Set GOOGLE_REFRESH_TOKEN=<paste the token>',
        '4. Restart the application',
        '5. Test with: /api/test-drive'
      ]
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({
      success: false,
      error: errMsg,
      message: 'Failed to exchange authorization code for tokens'
    }, { status: 500 })
  }
}
