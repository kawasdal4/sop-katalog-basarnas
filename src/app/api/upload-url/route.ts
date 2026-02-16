import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// Set runtime and max duration for Vercel
export const runtime = 'nodejs'
export const maxDuration = 60

// Create OAuth2 client
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  if (!clientId || !clientSecret || !refreshToken || !folderId) {
    throw new Error('Google Drive credentials not configured')
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret)
  auth.setCredentials({ refresh_token: refreshToken })

  return { auth, folderId }
}

// POST - Create resumable upload URL for large files
export async function POST(request: NextRequest) {
  try {
    const { fileName, mimeType, fileSize } = await request.json()

    if (!fileName || !mimeType || !fileSize) {
      return NextResponse.json({ error: 'fileName, mimeType, dan fileSize diperlukan' }, { status: 400 })
    }

    console.log(`📤 Creating resumable upload URL for: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`)

    const { auth, folderId } = getOAuth2Client()

    // Get access token
    const { token } = await auth.getAccessToken()
    if (!token) {
      return NextResponse.json({ error: 'Failed to get access token' }, { status: 500 })
    }

    // Create resumable upload session
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fileName,
          parents: [folderId],
          mimeType: mimeType,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to create upload session:', errorText)
      return NextResponse.json({ 
        error: 'Failed to create upload session',
        details: errorText 
      }, { status: 500 })
    }

    const uploadUrl = response.headers.get('Location')
    if (!uploadUrl) {
      return NextResponse.json({ error: 'No upload URL returned' }, { status: 500 })
    }

    console.log(`✅ Upload URL created successfully`)

    return NextResponse.json({ 
      success: true,
      uploadUrl,
      fileName
    })
  } catch (error) {
    console.error('Create upload URL error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
