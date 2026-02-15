import { google } from 'googleapis'
import { Readable } from 'stream'

// Google Drive configuration - supports both OAuth2 and Service Account
interface GoogleDriveConfig {
  // OAuth2 (recommended for personal Gmail)
  clientId?: string
  clientSecret?: string
  refreshToken?: string
  // Service Account (only works with Shared Drive)
  clientEmail?: string
  privateKey?: string
  // Common
  folderId: string
  ownerEmail?: string
}

// Get Google Drive configuration from environment
function getGoogleDriveConfig(): GoogleDriveConfig {
  // OAuth2 credentials
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  
  // Service Account credentials
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  
  // Common
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  const ownerEmail = process.env.GOOGLE_OWNER_EMAIL

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is required in .env')
  }

  // Prefer OAuth2 if available
  if (clientId && clientSecret && refreshToken) {
    console.log('🔐 Using OAuth2 authentication (recommended for personal Gmail)')
    return { 
      clientId, 
      clientSecret, 
      refreshToken, 
      folderId,
      ownerEmail 
    }
  }

  // Fallback to Service Account
  if (clientEmail && privateKey) {
    console.log('🔐 Using Service Account authentication (requires Shared Drive)')
    return { 
      clientEmail, 
      privateKey, 
      folderId,
      ownerEmail 
    }
  }

  throw new Error('Google Drive credentials not configured. Need either OAuth2 (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) or Service Account (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY)')
}

// Check authentication method
export function getAuthMethod(): 'oauth2' | 'service-account' | 'none' {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (clientId && clientSecret && refreshToken) {
    return 'oauth2'
  }
  if (clientEmail && privateKey) {
    return 'service-account'
  }
  return 'none'
}

// Create Google Drive client - supports both OAuth2 and Service Account
function createDriveClient() {
  const config = getGoogleDriveConfig()
  
  let auth
  
  if (config.clientId && config.clientSecret && config.refreshToken) {
    // OAuth2 authentication - works with personal Gmail!
    auth = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    )
    
    // Set refresh token - will auto-refresh access token
    auth.setCredentials({
      refresh_token: config.refreshToken
    })
    
    console.log('   📌 OAuth2: Using refresh token for authentication')
  } else if (config.clientEmail && config.privateKey) {
    // Service Account authentication
    auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.clientEmail,
        private_key: config.privateKey,
      },
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ],
    })
    
    console.log('   📌 Service Account: Using JWT authentication')
  } else {
    throw new Error('No valid authentication method configured')
  }

  return google.drive({ version: 'v3', auth })
}

// Convert Buffer to Readable Stream
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)
  return stream
}

// Upload file to Google Drive
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ id: string; name: string; webViewLink: string }> {
  const drive = createDriveClient()
  const config = getGoogleDriveConfig()

  console.log(`📤 Uploading "${fileName}" to Google Drive...`)
  console.log(`   Folder: ${config.folderId}`)
  console.log(`   Auth method: ${getAuthMethod()}`)

  const fileMetadata = {
    name: fileName,
    parents: [config.folderId],
  }

  const media = {
    mimeType,
    body: bufferToStream(fileBuffer),
  }

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink, owners',
      supportsAllDrives: true,
    })

    const fileId = response.data.id
    if (!fileId) {
      throw new Error('Failed to upload file - no file ID returned')
    }

    console.log(`✅ File uploaded successfully!`)
    console.log(`   File ID: ${fileId}`)
    console.log(`   Owners: ${JSON.stringify(response.data.owners?.map(o => o.emailAddress))}`)

    return {
      id: fileId,
      name: response.data.name || fileName,
      webViewLink: response.data.webViewLink || '',
    }
  } catch (error) {
    console.error('❌ Upload failed:', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

// Download file from Google Drive
export async function downloadFileFromDrive(fileId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  const drive = createDriveClient()

  const metadata = await drive.files.get({
    fileId,
    fields: 'name, mimeType',
    supportsAllDrives: true,
  })

  const response = await drive.files.get(
    {
      fileId,
      alt: 'media',
      supportsAllDrives: true,
    },
    { responseType: 'arraybuffer' }
  )

  const buffer = Buffer.from(response.data as ArrayBuffer)
  const mimeType = metadata.data.mimeType || 'application/octet-stream'
  const fileName = metadata.data.name || 'download'

  return { buffer, mimeType, fileName }
}

// Delete file from Google Drive
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = createDriveClient()
  
  await drive.files.delete({ 
    fileId,
    supportsAllDrives: true,
  })
  console.log(`🗑️ Deleted file from Google Drive: ${fileId}`)
}

// Get file metadata
export async function getFileMetadata(fileId: string) {
  const drive = createDriveClient()

  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, webViewLink, createdTime, modifiedTime, owners',
    supportsAllDrives: true,
  })

  return response.data
}

// Check if Google Drive is configured
export function isGoogleDriveConfigured(): boolean {
  try {
    getGoogleDriveConfig()
    return true
  } catch {
    return false
  }
}

// Test Google Drive connection and permissions
export async function testDriveConnection(): Promise<{
  success: boolean
  message: string
  details?: Record<string, unknown>
}> {
  try {
    const drive = createDriveClient()
    const config = getGoogleDriveConfig()
    const authMethod = getAuthMethod()

    console.log('🔍 Testing Google Drive connection...')
    console.log(`   Auth method: ${authMethod}`)
    console.log(`   Target Folder ID: ${config.folderId}`)

    // Get folder info
    const folderInfo = await drive.files.get({
      fileId: config.folderId,
      fields: 'id, name, mimeType, owners, capabilities, driveId',
      supportsAllDrives: true,
    })

    console.log(`📁 Folder found: ${folderInfo.data.name}`)
    console.log(`   Owner: ${folderInfo.data.owners?.map(o => o.emailAddress).join(', ')}`)
    console.log(`   Is Shared Drive: ${!!folderInfo.data.driveId}`)

    const caps = folderInfo.data.capabilities || {}
    console.log(`   Can add children: ${caps.canAddChildren}`)

    // Try to create a test file
    let canCreate = false
    let createError = null
    let testFileId = null
    
    try {
      console.log('📝 Attempting to create test file...')
      
      const testFile = await drive.files.create({
        requestBody: {
          name: 'TEST_CONNECTION_' + Date.now() + '.txt',
          parents: [config.folderId],
        },
        media: {
          mimeType: 'text/plain',
          body: 'Test file for connection verification.',
        },
        fields: 'id, name, owners',
        supportsAllDrives: true,
      })

      testFileId = testFile.data.id
      
      if (testFileId) {
        console.log(`   ✅ Test file created: ${testFileId}`)
        console.log(`   File owners: ${JSON.stringify(testFile.data.owners?.map(o => o.emailAddress))}`)
        
        // Clean up
        await drive.files.delete({ 
          fileId: testFileId,
          supportsAllDrives: true,
        })
        console.log('   Test file cleaned up')
        canCreate = true
      }
    } catch (err) {
      createError = err instanceof Error ? err.message : 'Unknown error'
      console.error(`   ❌ Test failed: ${createError}`)
    }

    if (canCreate) {
      return {
        success: true,
        message: '✅ Google Drive terhubung! Upload file akan berhasil.',
        details: {
          authMethod: authMethod,
          folderId: folderInfo.data.id,
          folderName: folderInfo.data.name,
          folderOwner: folderInfo.data.owners?.[0]?.emailAddress,
          isSharedDrive: !!folderInfo.data.driveId,
        }
      }
    } else {
      return {
        success: false,
        message: `❌ Tidak dapat upload file ke Google Drive`,
        details: {
          authMethod: authMethod,
          folderId: folderInfo.data.id,
          folderName: folderInfo.data.name,
          folderOwner: folderInfo.data.owners?.[0]?.emailAddress,
          error: createError,
          isSharedDrive: !!folderInfo.data.driveId,
          solution: authMethod === 'service-account' 
            ? 'Service Account memerlukan Shared Drive. Gunakan OAuth2 untuk personal Gmail.'
            : 'Periksa kredensial OAuth2 atau folder permissions.',
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Connection test failed:', errorMessage)
    
    return {
      success: false,
      message: `❌ Koneksi gagal: ${errorMessage}`,
    }
  }
}

// Get folder info
export async function getFolderInfo(): Promise<{
  id: string
  name: string
  ownerEmail?: string
  isSharedDrive?: boolean
}> {
  const drive = createDriveClient()
  const config = getGoogleDriveConfig()

  const folderInfo = await drive.files.get({
    fileId: config.folderId,
    fields: 'id, name, owners, driveId',
    supportsAllDrives: true,
  })

  return {
    id: folderInfo.data.id || config.folderId,
    name: folderInfo.data.name || 'Unknown',
    ownerEmail: folderInfo.data.owners?.[0]?.emailAddress,
    isSharedDrive: !!folderInfo.data.driveId,
  }
}
// trigger rebuild
