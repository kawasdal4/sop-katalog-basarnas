import { google } from 'googleapis'
import { Readable } from 'stream'

// Google Drive configuration - OAuth2
interface GoogleDriveConfig {
  clientId?: string
  clientSecret?: string
  refreshToken?: string
  folderId: string
  ownerEmail?: string
}

// Get Google Drive configuration from environment
function getGoogleDriveConfig(): GoogleDriveConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  const ownerEmail = process.env.GOOGLE_OWNER_EMAIL

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is required in .env')
  }

  if (clientId && clientSecret && refreshToken) {
    return { clientId, clientSecret, refreshToken, folderId, ownerEmail }
  }

  throw new Error('Google Drive credentials not configured')
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

// Create Google Drive client
function createDriveClient() {
  const config = getGoogleDriveConfig()
  
  const auth = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret
  )
  
  auth.setCredentials({
    refresh_token: config.refreshToken
  })

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

  const fileMetadata = {
    name: fileName,
    parents: [config.folderId],
    mimeType: mimeType,
  }

  const media = {
    mimeType,
    body: bufferToStream(fileBuffer),
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink, owners, mimeType',
    supportsAllDrives: true,
  })

  const fileId = response.data.id
  if (!fileId) {
    throw new Error('Failed to upload file - no file ID returned')
  }

  // Set file to public
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,
    })
    console.log(`   ✅ File set to public (anyone with link can view)`)
  } catch (permError) {
    console.warn(`   ⚠️ Could not set public permission:`, permError)
  }

  return {
    id: fileId,
    name: response.data.name || fileName,
    webViewLink: response.data.webViewLink || '',
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
  await drive.files.delete({ fileId, supportsAllDrives: true })
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

// Set file permission to public (anyone with link can view)
export async function setFilePublic(fileId: string): Promise<{ success: boolean; isGoogleSheet: boolean; mimeType?: string }> {
  const drive = createDriveClient()
  
  try {
    // Get file metadata
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'mimeType, permissions(id, type, role)',
      supportsAllDrives: true,
    })
    
    const mimeType = fileMetadata.data.mimeType || ''
    const isGoogleSheet = mimeType === 'application/vnd.google-apps.spreadsheet'
    
    console.log(`   📄 File MIME type: ${mimeType}`)
    console.log(`   📊 Is Google Sheet: ${isGoogleSheet}`)
    
    // Check if already public
    const hasPublicAccess = fileMetadata.data.permissions?.some(
      (p) => p.type === 'anyone' && p.role === 'reader'
    )
    
    if (hasPublicAccess) {
      console.log(`   📁 File ${fileId} already public`)
      return { success: true, isGoogleSheet, mimeType }
    }
    
    // Set to public
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,
    })
    
    console.log(`   ✅ File ${fileId} set to public`)
    return { success: true, isGoogleSheet, mimeType }
  } catch (error) {
    console.error(`   ❌ Failed to set file public:`, error)
    return { success: false, isGoogleSheet: false }
  }
}

// Get Microsoft Office Viewer URL with direct download link
export function getMicrosoftOfficeViewerUrl(fileId: string): string {
  // Direct download URL format for Google Drive
  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(directUrl)}`
}

// Get Google Sheets preview URL
export function getGoogleSheetsPreviewUrl(fileId: string): string {
  return `https://docs.google.com/spreadsheets/d/${fileId}/preview`
}

// Get Google Drive folder info
export async function getFolderInfo(): Promise<{
  id: string
  name: string
  ownerEmail?: string
}> {
  const drive = createDriveClient()
  const config = getGoogleDriveConfig()

  const folderInfo = await drive.files.get({
    fileId: config.folderId,
    fields: 'id, name, owners',
    supportsAllDrives: true,
  })

  return {
    id: folderInfo.data.id || config.folderId,
    name: folderInfo.data.name || 'Unknown',
    ownerEmail: folderInfo.data.owners?.[0]?.emailAddress ?? undefined,
  }
}

// Test Google Drive connection
export async function testDriveConnection(): Promise<{
  success: boolean
  message: string
  details?: Record<string, unknown>
}> {
  try {
    const drive = createDriveClient()
    const config = getGoogleDriveConfig()

    const folderInfo = await drive.files.get({
      fileId: config.folderId,
      fields: 'id, name, owners',
      supportsAllDrives: true,
    })

    return {
      success: true,
      message: '✅ Google Drive terhubung!',
      details: {
        folderId: folderInfo.data.id,
        folderName: folderInfo.data.name,
        folderOwner: folderInfo.data.owners?.[0]?.emailAddress,
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ Koneksi gagal: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// Export Google Sheets to Excel
export async function exportSheetsToExcel(fileId: string): Promise<{ buffer: Buffer; fileName: string }> {
  const drive = createDriveClient()

  const metadata = await drive.files.get({
    fileId,
    fields: 'name',
    supportsAllDrives: true,
  })

  const originalName = metadata.data.name || 'spreadsheet'
  const xlsxName = originalName.replace(/\.[^.]+$/, '.xlsx')

  const response = await drive.files.export(
    {
      fileId,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    { responseType: 'arraybuffer' }
  )

  const buffer = Buffer.from(response.data as ArrayBuffer)
  return { buffer, fileName: xlsxName }
}
