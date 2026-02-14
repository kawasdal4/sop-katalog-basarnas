import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// GET - Start OAuth2 flow or show instructions
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  // Check if already configured
  if (refreshToken && refreshToken !== 'YOUR_REFRESH_TOKEN_HERE') {
    // Test the connection
    try {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
      oauth2Client.setCredentials({ refresh_token: refreshToken })
      
      const drive = google.drive({ version: 'v3', auth: oauth2Client })
      const about = await drive.about.get({ fields: 'user(emailAddress, displayName)' })
      
      return NextResponse.json({
        status: 'configured',
        message: '✅ Google Drive is already configured!',
        user: about.data.user,
        instructions: 'You can now upload files. No further action needed.'
      })
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      return NextResponse.json({
        status: 'error',
        message: 'Refresh token is invalid or expired',
        error: errMsg
      })
    }
  }

  // Check if client ID/secret are set
  if (!clientId || !clientSecret || clientId === 'YOUR_CLIENT_ID_HERE') {
    return NextResponse.json({
      status: 'not_configured',
      message: '⚠️ Google Drive OAuth2 is not configured',
      steps: [
        '1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials',
        '2. Create "OAuth client ID" (type: Web application)',
        '3. Add authorized redirect URI: http://localhost:3000/api/oauth-callback',
        '4. Copy Client ID and Client Secret to .env file',
        '5. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env',
        '6. Refresh this page to get the authorization URL'
      ],
      envVars: {
        GOOGLE_CLIENT_ID: clientId || 'NOT SET',
        GOOGLE_CLIENT_SECRET: clientSecret ? '***SET***' : 'NOT SET',
        GOOGLE_REFRESH_TOKEN: 'NOT SET',
        GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || 'NOT SET'
      }
    })
  }

  // Generate authorization URL
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${request.nextUrl.origin}/api/oauth-callback`
  )

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive'
    ],
    prompt: 'consent'  // Force to get refresh token
  })

  return NextResponse.json({
    status: 'ready',
    message: 'Click the URL below to authorize your Google account',
    authorizationUrl: authUrl,
    instructions: [
      '1. Click the authorizationUrl above or copy it to your browser',
      '2. Sign in with your Gmail account',
      '3. Grant permission to access Google Drive',
      '4. You will be redirected back with a refresh token',
      '5. Copy the refresh token to your .env file as GOOGLE_REFRESH_TOKEN'
    ]
  })
}
