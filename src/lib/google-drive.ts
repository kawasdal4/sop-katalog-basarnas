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

// Error types for better error handling
export class GoogleDriveError extends Error {
  constructor(
    message: string,
    public code: 'TOKEN_EXPIRED' | 'PERMISSION_DENIED' | 'FILE_NOT_FOUND' | 'CONNECTION_ERROR' | 'UNKNOWN',
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'GoogleDriveError'
  }
}

// Token status interface
export interface TokenStatus {
  valid: boolean
  expired: boolean
  message: string
  lastChecked: Date
}

// Global token cache
let cachedAccessToken: string | null = null
let tokenExpiryTime: number = 0
let lastTokenCheck: Date = new Date(0)

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
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  
  // Check if all required credentials are present and not placeholder values
  const hasClientId = clientId && clientId !== 'your_google_client_id_here' && clientId.length > 10
  const hasClientSecret = clientSecret && clientSecret !== 'your_google_client_secret_here' && clientSecret.length > 10
  const hasRefreshToken = refreshToken && refreshToken !== 'your_refresh_token_here' && refreshToken.length > 10
  const hasFolderId = folderId && folderId !== 'your_folder_id_here' && folderId.length > 10
  
  return !!(hasClientId && hasClientSecret && hasRefreshToken && hasFolderId)
}

// Get missing credentials list
export function getMissingCredentials(): string[] {
  const missing: string[] = []
  
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  
  if (!clientId || clientId === 'your_google_client_id_here' || clientId.length < 10) {
    missing.push('GOOGLE_CLIENT_ID')
  }
  if (!clientSecret || clientSecret === 'your_google_client_secret_here' || clientSecret.length < 10) {
    missing.push('GOOGLE_CLIENT_SECRET')
  }
  if (!refreshToken || refreshToken === 'your_refresh_token_here' || refreshToken.length < 10) {
    missing.push('GOOGLE_REFRESH_TOKEN')
  }
  if (!folderId || folderId === 'your_folder_id_here' || folderId.length < 10) {
    missing.push('GOOGLE_DRIVE_FOLDER_ID')
  }
  
  return missing
}

// Create OAuth2 client with automatic token refresh
function createOAuth2Client() {
  const config = getGoogleDriveConfig()
  
  const auth = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret
  )
  
  auth.setCredentials({
    refresh_token: config.refreshToken
  })
  
  return auth
}

// Get fresh access token with caching
async function getFreshAccessToken(forceRefresh: boolean = false): Promise<string> {
  const now = Date.now()
  
  // Return cached token if still valid (with 5 minute buffer)
  if (!forceRefresh && cachedAccessToken && now < tokenExpiryTime - 300000) {
    return cachedAccessToken
  }
  
  console.log('🔄 Refreshing Google Drive access token...')
  
  const auth = createOAuth2Client()
  
  try {
    const { token } = await auth.getAccessToken()
    
    if (!token) {
      throw new GoogleDriveError(
        'Failed to obtain access token',
        'TOKEN_EXPIRED'
      )
    }
    
    cachedAccessToken = token
    // Set expiry to 1 hour from now (typical Google token lifetime)
    tokenExpiryTime = now + 3600000
    lastTokenCheck = new Date()
    
    console.log('✅ Access token refreshed successfully')
    return token
  } catch (error) {
    console.error('❌ Failed to refresh access token:', error)
    throw new GoogleDriveError(
      'Failed to refresh access token',
      'TOKEN_EXPIRED',
      error
    )
  }
}

// Create Google Drive client with fresh token
async function createDriveClientWithFreshToken() {
  const config = getGoogleDriveConfig()
  const auth = createOAuth2Client()
  
  // Pre-refresh token
  await getFreshAccessToken()
  
  return google.drive({ version: 'v3', auth })
}

// Retry wrapper with automatic token refresh on 401
async function withRetry<T>(
  operation: (drive: Awaited<ReturnType<typeof createDriveClientWithFreshToken>>) => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: unknown = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const drive = await createDriveClientWithFreshToken()
      return await operation(drive)
    } catch (error: unknown) {
      lastError = error
      
      // Check if it's a 401 error (token expired)
      const isAuthError = isUnauthorizedError(error)
      
      if (isAuthError && attempt < maxRetries) {
        console.log(`⚠️ Auth error on attempt ${attempt}, refreshing token and retrying...`)
        // Force token refresh on next attempt
        cachedAccessToken = null
        tokenExpiryTime = 0
        continue
      }
      
      // Check if it's a 403 error (permission denied)
      const isPermissionError = isForbiddenError(error)
      if (isPermissionError) {
        throw new GoogleDriveError(
          'Permission denied. You do not have access to this file.',
          'PERMISSION_DENIED',
          error
        )
      }
      
      // Check if it's a 404 error (file not found)
      const isNotFoundError = isFileNotFoundError(error)
      if (isNotFoundError) {
        throw new GoogleDriveError(
          'File not found in Google Drive.',
          'FILE_NOT_FOUND',
          error
        )
      }
      
      // Log the failure
      console.error(`❌ Operation failed on attempt ${attempt}:`, error)
      
      if (attempt >= maxRetries) {
        throw new GoogleDriveError(
          `Operation failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'CONNECTION_ERROR',
          error
        )
      }
    }
  }
  
  throw new GoogleDriveError(
    'Operation failed unexpectedly',
    'UNKNOWN',
    lastError
  )
}

// Helper to detect error types
function isUnauthorizedError(error: unknown): boolean {
  if (!error) return false
  
  const errorObj = error as Record<string, unknown>
  const status = (errorObj as Record<string, unknown>)?.status || 
                 (errorObj as Record<string, unknown>)?.code ||
                 (errorObj as { response?: { status?: number } })?.response?.status
  
  if (status === 401) return true
  
  const message = (error as Error)?.message?.toLowerCase() || ''
  return message.includes('unauthorized') || 
         message.includes('invalid credentials') ||
         message.includes('token') && message.includes('expired')
}

function isForbiddenError(error: unknown): boolean {
  if (!error) return false
  
  const errorObj = error as Record<string, unknown>
  const status = (errorObj as Record<string, unknown>)?.status || 
                 (errorObj as Record<string, unknown>)?.code ||
                 (errorObj as { response?: { status?: number } })?.response?.status
  
  if (status === 403) return true
  
  const message = (error as Error)?.message?.toLowerCase() || ''
  return message.includes('forbidden') || message.includes('permission denied')
}

function isFileNotFoundError(error: unknown): boolean {
  if (!error) return false
  
  const errorObj = error as Record<string, unknown>
  const status = (errorObj as Record<string, unknown>)?.status || 
                 (errorObj as Record<string, unknown>)?.code ||
                 (errorObj as { response?: { status?: number } })?.response?.status
  
  if (status === 404) return true
  
  const message = (error as Error)?.message?.toLowerCase() || ''
  return message.includes('not found') || message.includes('file not found')
}

// Convert Buffer to Readable Stream
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)
  return stream
}

// Upload file to Google Drive (supports large files)
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ id: string; name: string; webViewLink: string }> {
  const config = getGoogleDriveConfig()

  const fileSize = fileBuffer.length
  console.log(`📤 Uploading "${fileName}" to Google Drive...`)
  console.log(`   File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

  return withRetry(async (drive) => {
    const fileMetadata = {
      name: fileName,
      parents: [config.folderId],
      mimeType: mimeType,
    }

    // For large files (>5MB), use resumable upload
    if (fileSize > 5 * 1024 * 1024) {
      console.log(`   Using resumable upload for large file...`)
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
  })
}

// Create upload session for resumable upload (for very large files)
export async function createResumableUploadSession(
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<string> {
  const config = getGoogleDriveConfig()
  const auth = createOAuth2Client()
  
  // Get access token
  const { token } = await auth.getAccessToken()
  if (!token) {
    throw new Error('Failed to get access token')
  }

  // Create resumable upload session
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fileName,
        parents: [config.folderId],
        mimeType: mimeType,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to create upload session: ${response.statusText}`)
  }

  const uploadUrl = response.headers.get('Location')
  if (!uploadUrl) {
    throw new Error('No upload URL returned')
  }

  return uploadUrl
}

// Upload chunk to resumable session
export async function uploadChunk(
  uploadUrl: string,
  chunk: Buffer,
  startByte: number,
  totalSize: number
): Promise<{ complete: boolean; fileId?: string }> {
  const endByte = startByte + chunk.length - 1

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': chunk.length.toString(),
      'Content-Range': `bytes ${startByte}-${endByte}/${totalSize}`,
    },
    body: chunk,
  })

  if (response.status === 308) {
    // Partial upload - continue
    return { complete: false }
  }

  if (response.status === 200 || response.status === 201) {
    // Upload complete
    const data = await response.json()
    return { complete: true, fileId: data.id }
  }

  throw new Error(`Upload failed: ${response.statusText}`)
}

// Validate file permission before download
export async function validateFilePermission(fileId: string): Promise<{
  hasAccess: boolean
  mimeType?: string
  fileName?: string
  isPublic: boolean
  error?: string
}> {
  try {
    return await withRetry(async (drive) => {
      const response = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, permissions(id, type, role)',
        supportsAllDrives: true,
      })
      
      const permissions = response.data.permissions || []
      const isPublic = permissions.some(
        (p) => p.type === 'anyone' && p.role === 'reader'
      )
      
      return {
        hasAccess: true,
        mimeType: response.data.mimeType || undefined,
        fileName: response.data.name || undefined,
        isPublic
      }
    })
  } catch (error) {
    if (error instanceof GoogleDriveError) {
      return {
        hasAccess: false,
        error: error.message
      }
    }
    return {
      hasAccess: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Download file from Google Drive with retry and permission check
export async function downloadFileFromDrive(fileId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  console.log(`📥 Downloading file from Google Drive: ${fileId}`)
  
  // First validate permission
  const permissionCheck = await validateFilePermission(fileId)
  
  if (!permissionCheck.hasAccess) {
    throw new GoogleDriveError(
      permissionCheck.error || 'Permission denied',
      'PERMISSION_DENIED'
    )
  }
  
  console.log(`   ✅ Permission validated: ${permissionCheck.fileName}`)

  return withRetry(async (drive) => {
    // Get file metadata
    const metadata = await drive.files.get({
      fileId,
      fields: 'name, mimeType',
      supportsAllDrives: true,
    })

    // Download file using alt:media
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

    console.log(`   ✅ Downloaded: ${fileName} (${buffer.length} bytes)`)

    return { buffer, mimeType, fileName }
  })
}

// Delete file from Google Drive
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  await withRetry(async (drive) => {
    await drive.files.delete({ fileId, supportsAllDrives: true })
    console.log(`🗑️ Deleted file from Google Drive: ${fileId}`)
  })
}

// Get file metadata
export async function getFileMetadata(fileId: string) {
  return withRetry(async (drive) => {
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, webViewLink, createdTime, modifiedTime, owners',
      supportsAllDrives: true,
    })
    return response.data
  })
}

// Set file permission to public (anyone with link can view)
export async function setFilePublic(fileId: string): Promise<{ success: boolean; isGoogleSheet: boolean; mimeType?: string }> {
  try {
    return await withRetry(async (drive) => {
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
    })
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
  const config = getGoogleDriveConfig()

  return withRetry(async (drive) => {
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
  })
}

// Test Google Drive connection and token validity
export async function testDriveConnection(): Promise<{
  success: boolean
  message: string
  details?: Record<string, unknown>
}> {
  try {
    const config = getGoogleDriveConfig()
    
    // Try to get fresh token first
    await getFreshAccessToken(true)

    const drive = await createDriveClientWithFreshToken()

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
        tokenValid: true,
      }
    }
  } catch (error) {
    const isTokenError = error instanceof GoogleDriveError && error.code === 'TOKEN_EXPIRED'
    
    return {
      success: false,
      message: isTokenError 
        ? '❌ Token kadaluarsa. Silakan reconnect Google Drive.'
        : `❌ Koneksi gagal: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        tokenValid: false,
        requiresReconnect: isTokenError
      }
    }
  }
}

// Check token validity without full connection test
export async function checkTokenValidity(): Promise<TokenStatus> {
  try {
    const token = await getFreshAccessToken()
    
    return {
      valid: !!token,
      expired: false,
      message: 'Token is valid',
      lastChecked: new Date()
    }
  } catch (error) {
    return {
      valid: false,
      expired: true,
      message: error instanceof Error ? error.message : 'Token validation failed',
      lastChecked: new Date()
    }
  }
}

// Export Google Sheets to Excel
export async function exportSheetsToExcel(fileId: string): Promise<{ buffer: Buffer; fileName: string }> {
  return withRetry(async (drive) => {
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
  })
}

// List all files in a Google Drive folder
export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: number
  createdTime?: string
  modifiedTime?: string
  webViewLink?: string
  parents?: string[]
}

export async function listFilesFromDrive(
  folderId?: string,
  options?: {
    pageSize?: number
    pageToken?: string
    orderBy?: string
  }
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const config = getGoogleDriveConfig()
  const targetFolderId = folderId || config.folderId

  return withRetry(async (drive) => {
    const response = await drive.files.list({
      q: `'${targetFolderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents)',
      pageSize: options?.pageSize || 100,
      pageToken: options?.pageToken,
      orderBy: options?.orderBy || 'modifiedTime desc',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })

    const files: DriveFile[] = (response.data.files || []).map(file => ({
      id: file.id || '',
      name: file.name || '',
      mimeType: file.mimeType || '',
      size: file.size ? parseInt(file.size) : undefined,
      createdTime: file.createdTime || undefined,
      modifiedTime: file.modifiedTime || undefined,
      webViewLink: file.webViewLink || undefined,
      parents: file.parents || undefined,
    }))

    console.log(`📋 Listed ${files.length} files from Google Drive folder`)

    return {
      files,
      nextPageToken: response.data.nextPageToken || undefined,
    }
  })
}

// List ALL files in a folder (handles pagination)
export async function listAllFilesFromDrive(folderId?: string): Promise<DriveFile[]> {
  const allFiles: DriveFile[] = []
  let pageToken: string | undefined
  
  do {
    const result = await listFilesFromDrive(folderId, { pageToken })
    allFiles.push(...result.files)
    pageToken = result.nextPageToken
  } while (pageToken)
  
  console.log(`📋 Total files in Google Drive: ${allFiles.length}`)
  return allFiles
}

// Upload file to specific folder
export async function uploadFileToDriveFolder(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<{ id: string; name: string; webViewLink: string }> {
  const config = getGoogleDriveConfig()
  const targetFolderId = folderId || config.folderId

  const fileSize = fileBuffer.length
  console.log(`📤 Uploading "${fileName}" to Google Drive folder ${targetFolderId}...`)
  console.log(`   File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

  return withRetry(async (drive) => {
    const fileMetadata = {
      name: fileName,
      parents: [targetFolderId],
      mimeType: mimeType,
    }

    const media = {
      mimeType,
      body: bufferToStream(fileBuffer),
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    })

    const fileId = response.data.id
    if (!fileId) {
      throw new Error('Failed to upload file - no file ID returned')
    }

    console.log(`   ✅ Uploaded: ${response.data.name} (ID: ${fileId})`)

    return {
      id: fileId,
      name: response.data.name || fileName,
      webViewLink: response.data.webViewLink || '',
    }
  })
}

// Watch for changes in Google Drive (returns changes token)
export async function getDriveChangesStartToken(): Promise<string> {
  return withRetry(async (drive) => {
    const response = await drive.changes.getStartToken({
      supportsAllDrives: true,
    })
    return response.data.startPageToken || ''
  })
}

// Get changes since last token
export async function getDriveChanges(
  pageToken: string,
  folderId?: string
): Promise<{
  changes: Array<{
    fileId: string
    type: 'file' | 'drive'
    changeType: 'created' | 'modified' | 'deleted'
    file?: DriveFile
  }>
  newStartPageToken: string
}> {
  const config = getGoogleDriveConfig()
  const targetFolderId = folderId || config.folderId
  
  return withRetry(async (drive) => {
    const response = await drive.changes.list({
      pageToken,
      fields: 'nextPageToken, newStartPageToken, changes(fileId, type, changeType, file(id, name, mimeType, size, modifiedTime, parents))',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })

    const changes = (response.data.changes || [])
      .filter(change => {
        // Only include files in our target folder
        if (change.type === 'file' && change.file?.parents?.includes(targetFolderId)) {
          return true
        }
        return false
      })
      .map(change => ({
        fileId: change.fileId || '',
        type: change.type as 'file' | 'drive',
        changeType: (change.changeType || 'modified') as 'created' | 'modified' | 'deleted',
        file: change.file ? {
          id: change.file.id || '',
          name: change.file.name || '',
          mimeType: change.file.mimeType || '',
          size: change.file.size ? parseInt(change.file.size) : undefined,
          modifiedTime: change.file.modifiedTime || undefined,
        } : undefined,
      }))

    return {
      changes,
      newStartPageToken: response.data.newStartPageToken || response.data.nextPageToken || pageToken,
    }
  })
}

// Export the error class for use in other modules
export { GoogleDriveError as GoogleDriveError }
