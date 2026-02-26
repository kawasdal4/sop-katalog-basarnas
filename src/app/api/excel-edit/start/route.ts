/**
 * Excel Edit API - Start Editing Session (Fixed)
 * 
 * Fixed: Skip user verification step since User.Read.All permission
 * may not be granted. Instead, directly try to access the user's drive.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

// ============================================
// CONFIGURATION
// ============================================
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || process.env.TENANT_ID
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || process.env.CLIENT_ID
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || process.env.CLIENT_SECRET
const M365_SERVICE_ACCOUNT = process.env.M365_SERVICE_ACCOUNT
const M365_EDIT_FOLDER = process.env.M365_EDIT_FOLDER || 'R2-Edit-Temp'

const CONTENT_TYPES: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
}

let r2Client: S3Client | null = null
function getR2Client(): S3Client {
  if (!r2Client) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 credentials not configured')
    }
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  }
  return r2Client
}

let tokenCache: { accessToken: string; expiresAt: number } | null = null

async function getAzureAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 5 * 60 * 1000) {
    return tokenCache.accessToken
  }
  
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    throw new Error('Azure AD credentials not configured')
  }
  
  const tokenUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }).toString(),
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Token failed: ${response.status} - ${data.error_description || data.error}`)
  }
  
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  }
  
  return data.access_token
}

// Graph API helpers
const graphFetch = async (endpoint: string, token: string, options: RequestInit = {}) =>
  fetch(
    endpoint.startsWith('https') ? endpoint : `https://graph.microsoft.com/v1.0${endpoint}`,
    {
      ...options,
      headers: { 'Authorization': `Bearer ${token}`, ...options.headers },
    }
  )

interface StartEditRequest {
  objectKey: string
  fileId?: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let currentStep = 'init'
  
  try {
    // Step 1: Auth
    currentStep = 'auth'
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized', step: currentStep }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true },
    })
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden', step: currentStep }, { status: 403 })
    }
    
    // Step 2: Validate
    currentStep = 'validate'
    const body: StartEditRequest = await request.json()
    const { objectKey, fileId } = body
    
    if (!objectKey) {
      return NextResponse.json({ success: false, error: 'objectKey required', step: currentStep }, { status: 400 })
    }
    
    if (!M365_SERVICE_ACCOUNT) {
      return NextResponse.json({
        success: false,
        error: 'M365_SERVICE_ACCOUNT not configured',
        step: currentStep,
        suggestion: 'Add M365_SERVICE_ACCOUNT=your-user@yourdomain.onmicrosoft.com to .env',
      }, { status: 500 })
    }
    
    const fileName = objectKey.split('/').pop() || objectKey
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'xlsx'
    
    if (!['xlsx', 'xls', 'xlsm'].includes(fileExt)) {
      return NextResponse.json({ success: false, error: 'Only Excel files', step: currentStep }, { status: 400 })
    }
    
    console.log(`📝 [Edit] Starting: ${objectKey}`)
    
    // Step 3: Get Token
    currentStep = 'token'
    const accessToken = await getAzureAccessToken()
    console.log('✅ [Token] Obtained')
    
    // Step 4: Check OneDrive (this also verifies user exists)
    currentStep = 'check-drive'
    const driveResponse = await graphFetch(`/users/${M365_SERVICE_ACCOUNT}/drive`, accessToken)
    
    if (!driveResponse.ok) {
      const errorText = await driveResponse.text()
      let errorData: { error?: { code?: string; message?: string } } = {}
      try { errorData = JSON.parse(errorText) } catch {}
      
      console.error(`❌ [Drive] ${driveResponse.status}`, errorText)
      
      // Specific error messages
      if (driveResponse.status === 404) {
        return NextResponse.json({
          success: false,
          error: `User "${M365_SERVICE_ACCOUNT}" not found in Azure AD`,
          step: currentStep,
          suggestion: 'Verify M365_SERVICE_ACCOUNT email is correct and user exists in your tenant.',
        }, { status: 500 })
      }
      
      if (driveResponse.status === 403) {
        return NextResponse.json({
          success: false,
          error: 'Access denied - user may not have OneDrive, or missing permissions',
          details: errorData.error?.message || errorText,
          step: currentStep,
          suggestion: 'Ensure user has OneDrive license. Grant Files.ReadWrite.All with admin consent.',
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to access OneDrive',
        details: `${driveResponse.status} - ${errorText}`,
        step: currentStep,
      }, { status: 500 })
    }
    
    const driveData = await driveResponse.json()
    console.log(`✅ [Drive] OK: ${driveData.id}`)
    
    // Step 5: Ensure folder
    currentStep = 'ensure-folder'
    const folderResponse = await graphFetch(
      `/users/${M365_SERVICE_ACCOUNT}/drive/root:/${M365_EDIT_FOLDER}`,
      accessToken
    )
    
    if (folderResponse.status === 404) {
      console.log(`📁 [Folder] Creating: ${M365_EDIT_FOLDER}`)
      const createResponse = await graphFetch(
        `/users/${M365_SERVICE_ACCOUNT}/drive/root/children`,
        accessToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: M365_EDIT_FOLDER,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'fail',
          }),
        }
      )
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        return NextResponse.json({
          success: false,
          error: 'Failed to create edit folder',
          details: errorText,
          step: currentStep,
        }, { status: 500 })
      }
      console.log('✅ [Folder] Created')
    } else if (folderResponse.ok) {
      console.log('✅ [Folder] Exists')
    } else {
      const errorText = await folderResponse.text()
      return NextResponse.json({
        success: false,
        error: 'Error checking folder',
        details: errorText,
        step: currentStep,
      }, { status: 500 })
    }
    
    // Step 6: Download from R2
    currentStep = 'download-r2'
    if (!R2_BUCKET_NAME) {
      return NextResponse.json({ success: false, error: 'R2_BUCKET_NAME not set', step: currentStep }, { status: 500 })
    }
    
    const r2Client = getR2Client()
    const r2Response = await r2Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
    }))
    
    if (!r2Response.Body) {
      return NextResponse.json({ success: false, error: 'File not found in R2', step: currentStep }, { status: 404 })
    }
    
    const fileBuffer = Buffer.from(await r2Response.Body.transformToByteArray())
    console.log(`✅ [R2] Downloaded: ${fileBuffer.length} bytes`)
    
    // Step 7: Upload to OneDrive
    currentStep = 'upload'
    const sessionId = `edit-${Date.now()}-${randomUUID().slice(0, 8)}`
    const contentType = CONTENT_TYPES[fileExt] || CONTENT_TYPES.xlsx
    
    const uploadResponse = await graphFetch(
      `/users/${M365_SERVICE_ACCOUNT}/drive/root:/${M365_EDIT_FOLDER}/${fileName}:/content`,
      accessToken,
      {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: fileBuffer,
      }
    )
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      return NextResponse.json({
        success: false,
        error: 'Failed to upload to OneDrive',
        details: errorText,
        step: currentStep,
      }, { status: 500 })
    }
    
    const driveItem = await uploadResponse.json()
    console.log(`✅ [Upload] ${driveItem.id}`)
    
    // Step 8: Create share link
    currentStep = 'share-link'
    const shareResponse = await graphFetch(
      `/users/${M365_SERVICE_ACCOUNT}/drive/items/${driveItem.id}/createLink`,
      accessToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'edit', scope: 'organization' }),
      }
    )
    
    let editUrl = driveItem.webUrl
    
    if (shareResponse.ok) {
      const shareData = await shareResponse.json()
      editUrl = shareData.link?.webUrl || editUrl
      console.log(`✅ [Share] Link created`)
    } else {
      console.warn('⚠️ [Share] Failed, using direct URL')
    }
    
    // Log
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'START_EDIT',
          deskripsi: `Started editing: ${fileName}`,
          fileId: fileId || undefined,
        },
      })
    } catch {}
    
    console.log(`✅ [Edit] Complete in ${Date.now() - startTime}ms`)
    
    return NextResponse.json({
      success: true,
      editUrl,
      driveItemId: driveItem.id,
      sessionId,
      originalPath: objectKey,
      message: 'File ready for editing',
      duration: Date.now() - startTime,
    })
    
  } catch (error) {
    console.error(`❌ [Edit] Error at ${currentStep}:`, error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      step: currentStep,
      duration: Date.now() - startTime,
    }, { status: 500 })
  }
}
