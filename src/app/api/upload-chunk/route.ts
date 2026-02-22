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

// POST - Upload file to Google Drive using resumable upload
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string
    const mimeType = formData.get('mimeType') as string

    if (!file || !fileName || !mimeType) {
      return NextResponse.json({ error: 'File, fileName, dan mimeType diperlukan' }, { status: 400 })
    }

    console.log(`📤 Uploading file to Google Drive: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

    const { auth, folderId } = getOAuth2Client()

    // Get access token
    const { token } = await auth.getAccessToken()
    if (!token) {
      return NextResponse.json({ error: 'Failed to get access token' }, { status: 500 })
    }

    // Step 1: Create resumable upload session
    const sessionResponse = await fetch(
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

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text()
      console.error('Failed to create upload session:', errorText)
      return NextResponse.json({ 
        error: 'Failed to create upload session',
        details: errorText 
      }, { status: 500 })
    }

    const uploadUrl = sessionResponse.headers.get('Location')
    if (!uploadUrl) {
      return NextResponse.json({ error: 'No upload URL returned' }, { status: 500 })
    }

    console.log(`   ✅ Upload session created`)

    // Step 2: Upload file content
    const fileBuffer = await file.arrayBuffer()
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': file.size.toString(),
      },
      body: fileBuffer,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('Upload failed:', errorText)
      return NextResponse.json({ 
        error: 'Upload failed',
        details: errorText 
      }, { status: 500 })
    }

    const driveFileData = await uploadResponse.json()
    const driveFileId = driveFileData.id

    if (!driveFileId) {
      return NextResponse.json({ error: 'No file ID returned' }, { status: 500 })
    }

    console.log(`   ✅ File uploaded: ${driveFileId}`)

    // Step 3: Set file to public
    const drive = google.drive({ version: 'v3', auth })
    try {
      await drive.permissions.create({
        fileId: driveFileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
      })
      console.log(`   ✅ File set to public`)
    } catch (permError) {
      console.warn('   ⚠️ Could not set file to public:', permError)
    }

    return NextResponse.json({ 
      success: true,
      driveFileId,
      fileName,
      webViewLink: `https://drive.google.com/file/d/${driveFileId}/view`
    })
  } catch (error) {
    console.error('Upload chunk error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
