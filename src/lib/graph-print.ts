/**
 * Microsoft Graph Print Helper
 * 
 * Handles Excel to PDF conversion with multi-sheet support
 * using Microsoft Graph API via Client Credentials Flow
 * 
 * Features:
 * - Set A4, Landscape, FitToWidth for ALL worksheets
 * - Proper margin settings (1cm = 28.35 points)
 * - Workbook session management
 * - Auto cleanup temp files
 */

// Azure AD Configuration
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID!
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID!
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!
const M365_SERVICE_ACCOUNT = process.env.M365_SERVICE_ACCOUNT!

// Print temp folder
const PRINT_TEMP_FOLDER = 'R2-Print-Temp'

// Margin constant: 1 cm = 28.35 points
const MARGIN_1CM = 28.35

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get Azure AD Access Token (Client Credentials Flow)
 */
export async function getGraphToken(): Promise<string> {
  // Check cache
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    console.log('🎫 [GraphPrint] Using cached token')
    return cachedToken.token
  }

  console.log('🎫 [GraphPrint] Requesting new token from Azure AD...')

  const tokenUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`

  const params = new URLSearchParams({
    client_id: AZURE_CLIENT_ID,
    client_secret: AZURE_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ [GraphPrint] Token request failed:', errorText)
    throw new Error(`Failed to get Azure AD token: ${response.status}`)
  }

  const data = await response.json()
  
  // Cache token (subtract 5 minutes for safety)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000
  }

  console.log('✅ [GraphPrint] Token acquired, expires in', Math.round(data.expires_in / 60), 'minutes')
  
  return data.access_token
}

/**
 * Make authenticated Graph API request
 */
async function graphRequest(
  accessToken: string,
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    body?: unknown
    headers?: Record<string, string>
  } = {}
): Promise<Response> {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `https://graph.microsoft.com/v1.0${endpoint}`

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    ...options.headers
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  return fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
}

/**
 * Ensure print temp folder exists
 */
export async function ensurePrintFolder(accessToken: string): Promise<string> {
  console.log(`📁 [GraphPrint] Checking temp folder: ${PRINT_TEMP_FOLDER}`)

  // Try to get folder
  const response = await graphRequest(
    accessToken,
    `/users/${M365_SERVICE_ACCOUNT}/drive/root:/${PRINT_TEMP_FOLDER}`
  )

  if (response.ok) {
    const data = await response.json()
    console.log(`✅ [GraphPrint] Folder exists: ${data.id}`)
    return data.id
  }

  // Create folder if not exists
  console.log(`📁 [GraphPrint] Creating temp folder...`)

  const createResponse = await graphRequest(
    accessToken,
    `/users/${M365_SERVICE_ACCOUNT}/drive/root/children`,
    {
      method: 'POST',
      body: {
        name: PRINT_TEMP_FOLDER,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      }
    }
  )

  if (!createResponse.ok) {
    const errorText = await createResponse.text()
    console.error('❌ [GraphPrint] Failed to create folder:', errorText)
    throw new Error('Failed to create print temp folder')
  }

  const data = await createResponse.json()
  console.log(`✅ [GraphPrint] Folder created: ${data.id}`)
  
  return data.id
}

/**
 * STEP 1: Upload file to OneDrive temp folder
 */
export async function uploadToPrintFolder(
  accessToken: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<{ itemId: string; driveId: string }> {
  console.log(`📤 [GraphPrint] Step 1: Uploading to OneDrive: ${fileName}`)

  // Generate unique filename
  const timestamp = Date.now()
  const uniqueFileName = `print_${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`

  // Upload using OneDrive API
  const uploadUrl = `https://graph.microsoft.com/v1.0/users/${M365_SERVICE_ACCOUNT}/drive/root:/${PRINT_TEMP_FOLDER}/${uniqueFileName}:/content`

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    body: fileBuffer
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ [GraphPrint] Upload failed:', errorText)
    throw new Error(`Failed to upload file to OneDrive: ${response.status}`)
  }

  const data = await response.json()
  console.log(`✅ [GraphPrint] File uploaded, item ID: ${data.id}`)

  return {
    itemId: data.id,
    driveId: data.parentReference?.driveId
  }
}

/**
 * STEP 2: Create workbook session
 */
export async function createWorkbookSession(
  accessToken: string,
  itemId: string
): Promise<string> {
  console.log(`📝 [GraphPrint] Step 2: Creating workbook session...`)

  const response = await graphRequest(
    accessToken,
    `/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}/workbook/createSession`,
    {
      method: 'POST',
      body: { persistChanges: true }
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ [GraphPrint] Create session failed:', errorText)
    throw new Error(`Failed to create workbook session: ${response.status}`)
  }

  const data = await response.json()
  const sessionId = data.id
  
  console.log(`✅ [GraphPrint] Session created: ${sessionId.slice(0, 20)}...`)
  
  return sessionId
}

/**
 * STEP 3: Get all worksheets
 */
export async function getWorksheets(
  accessToken: string,
  itemId: string,
  sessionId: string
): Promise<Array<{ id: string; name: string }>> {
  console.log(`📋 [GraphPrint] Step 3: Getting worksheets...`)

  const response = await graphRequest(
    accessToken,
    `/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}/workbook/worksheets`,
    {
      headers: { 'workbook-session-id': sessionId }
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ [GraphPrint] Get worksheets failed:', errorText)
    throw new Error(`Failed to get worksheets: ${response.status}`)
  }

  const data = await response.json()
  const worksheets = data.value || []
  
  console.log(`✅ [GraphPrint] Found ${worksheets.length} worksheets:`, worksheets.map((w: { name: string }) => w.name).join(', '))
  
  return worksheets.map((w: { id: string; name: string }) => ({ id: w.id, name: w.name }))
}

/**
 * STEP 4: Set page layout for a worksheet
 */
export async function setWorksheetPageLayout(
  accessToken: string,
  itemId: string,
  worksheetId: string,
  sessionId: string,
  worksheetName: string
): Promise<void> {
  console.log(`📐 [GraphPrint] Step 4: Setting page layout for: ${worksheetName}`)

  // Page layout settings
  // A4, Landscape, FitToWidth=1, FitToHeight=false, Margin 1cm (28.35 points)
  const pageLayout = {
    orientation: 'Landscape',
    paperSize: 'A4',
    zoom: null,
    fitToWidth: 1,
    fitToHeight: false,
    margins: {
      top: MARGIN_1CM,      // 1 cm
      bottom: MARGIN_1CM,   // 1 cm
      left: MARGIN_1CM,     // 1 cm
      right: MARGIN_1CM     // 1 cm
    }
  }

  const response = await graphRequest(
    accessToken,
    `/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}/workbook/worksheets/${worksheetId}/pageLayout`,
    {
      method: 'PATCH',
      body: pageLayout,
      headers: { 'workbook-session-id': sessionId }
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.warn(`⚠️ [GraphPrint] Page layout failed for ${worksheetName}:`, errorText)
    // Don't throw - continue with other sheets
  } else {
    console.log(`✅ [GraphPrint] Page layout set for: ${worksheetName}`)
  }
}

/**
 * STEP 5: Close workbook session
 */
export async function closeWorkbookSession(
  accessToken: string,
  itemId: string,
  sessionId: string
): Promise<void> {
  console.log(`🔒 [GraphPrint] Step 5: Closing workbook session...`)

  const response = await graphRequest(
    accessToken,
    `/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}/workbook/closeSession`,
    {
      method: 'POST',
      headers: { 'workbook-session-id': sessionId }
    }
  )

  if (response.ok) {
    console.log(`✅ [GraphPrint] Session closed`)
  } else {
    console.warn(`⚠️ [GraphPrint] Failed to close session (non-critical)`)
  }
}

/**
 * STEP 6: Convert to PDF
 */
export async function convertToPdf(
  accessToken: string,
  itemId: string
): Promise<ArrayBuffer> {
  console.log(`📄 [GraphPrint] Step 6: Converting to PDF...`)

  const convertUrl = `https://graph.microsoft.com/v1.0/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}/content?format=pdf`

  const response = await fetch(convertUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/pdf'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ [GraphPrint] PDF conversion failed:', errorText)
    throw new Error(`Failed to convert Excel to PDF: ${response.status}`)
  }

  const pdfBuffer = await response.arrayBuffer()
  console.log(`✅ [GraphPrint] PDF converted, size: ${pdfBuffer.byteLength} bytes`)

  return pdfBuffer
}

/**
 * Delete file from OneDrive (cleanup)
 */
export async function deleteFromPrintFolder(
  accessToken: string,
  itemId: string
): Promise<void> {
  console.log(`🗑️ [GraphPrint] Cleaning up temp file: ${itemId}`)

  const response = await graphRequest(
    accessToken,
    `/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}`,
    { method: 'DELETE' }
  )

  if (response.ok) {
    console.log(`✅ [GraphPrint] Temp file deleted`)
  } else {
    console.warn(`⚠️ [GraphPrint] Failed to delete temp file (non-critical)`)
  }
}

/**
 * STEP 7: Download modified Excel file
 */
export async function downloadExcel(
  accessToken: string,
  itemId: string
): Promise<Buffer> {
  console.log(`📥 [GraphPrint] Step 7: Downloading modified Excel...`)

  const downloadUrl = `https://graph.microsoft.com/v1.0/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}/content`

  const response = await fetch(downloadUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ [GraphPrint] Excel download failed:', errorText)
    throw new Error(`Failed to download Excel file: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const excelBuffer = Buffer.from(arrayBuffer)
  console.log(`✅ [GraphPrint] Excel downloaded, size: ${excelBuffer.length} bytes`)

  return excelBuffer
}

/**
 * Complete print flow with multi-sheet support
 * 
 * Flow:
 * 1. Upload file to OneDrive temp
 * 2. Create workbook session
 * 3. Get all worksheets
 * 4. Set page layout for EACH worksheet (A4, Landscape, FitToWidth)
 * 5. Close workbook session
 * 6. Convert to PDF
 * 7. Return PDF buffer and cleanup function
 */
export async function excelToPdfWithLayout(
  fileName: string,
  fileBuffer: Buffer
): Promise<{ pdfBuffer: ArrayBuffer; cleanup: () => Promise<void> }> {
  const startTime = Date.now()
  
  // Get token
  const token = await getGraphToken()

  // Ensure folder exists
  await ensurePrintFolder(token)

  // STEP 1: Upload
  const { itemId } = await uploadToPrintFolder(token, fileName, fileBuffer)

  let sessionId: string | null = null

  try {
    // STEP 2: Create workbook session
    sessionId = await createWorkbookSession(token, itemId)

    // STEP 3: Get all worksheets
    const worksheets = await getWorksheets(token, itemId, sessionId)

    // STEP 4: Set page layout for EACH worksheet
    for (const worksheet of worksheets) {
      await setWorksheetPageLayout(
        token,
        itemId,
        worksheet.id,
        sessionId,
        worksheet.name
      )
    }

    // STEP 5: Close workbook session
    await closeWorkbookSession(token, itemId, sessionId)

  } catch (error) {
    console.error('❌ [GraphPrint] Error during workbook processing:', error)
    
    // Try to close session if exists
    if (sessionId) {
      try {
        await closeWorkbookSession(token, itemId, sessionId)
      } catch {
        // Ignore
      }
    }
    
    // Continue to PDF conversion even if page layout failed
    console.log('⚠️ [GraphPrint] Proceeding to PDF conversion with default settings...')
  }

  // STEP 6: Convert to PDF
  const pdfBuffer = await convertToPdf(token, itemId)

  console.log(`✅ [GraphPrint] Complete in ${Date.now() - startTime}ms`)

  // Return PDF and cleanup function
  return {
    pdfBuffer,
    cleanup: async () => {
      try {
        await deleteFromPrintFolder(token, itemId)
      } catch (error) {
        console.warn('⚠️ [GraphPrint] Cleanup failed:', error)
      }
    }
  }
}

/**
 * SYNC FLOW: Apply permanent print layout to Excel file
 * 
 * This function is used during the SYNC process to apply
 * permanent page layout settings to an Excel file before
 * uploading it to R2.
 * 
 * Flow:
 * 1. Upload file to OneDrive temp folder
 * 2. Create workbook session (persistChanges: true)
 * 3. Get all worksheets
 * 4. Set page layout for EACH worksheet (A4, Landscape, FitToWidth=1, Margin 1cm)
 * 5. Close workbook session (saves changes permanently)
 * 6. Download modified Excel file
 * 7. Return modified Excel buffer and cleanup function
 */
export async function applyPermanentPrintLayout(
  fileName: string,
  fileBuffer: Buffer
): Promise<{ 
  modifiedBuffer: Buffer
  worksheetsCount: number
  cleanup: () => Promise<void>
}> {
  const startTime = Date.now()
  const syncTempFolder = 'R2-Sync-Temp'
  
  console.log(`🔄 [GraphSync] Starting permanent layout application for: ${fileName}`)
  console.log(`📊 [GraphSync] File size: ${fileBuffer.length} bytes`)
  
  // Get token
  const token = await getGraphToken()

  // ============================================
  // STEP 1: Ensure sync temp folder exists
  // ============================================
  console.log(`📁 [GraphSync] Step 1: Checking temp folder: ${syncTempFolder}`)

  let folderResponse = await graphRequest(
    token,
    `/users/${M365_SERVICE_ACCOUNT}/drive/root:/${syncTempFolder}`
  )

  if (!folderResponse.ok) {
    // Create folder if not exists
    console.log(`📁 [GraphSync] Creating sync temp folder...`)
    
    folderResponse = await graphRequest(
      token,
      `/users/${M365_SERVICE_ACCOUNT}/drive/root/children`,
      {
        method: 'POST',
        body: {
          name: syncTempFolder,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename'
        }
      }
    )

    if (!folderResponse.ok) {
      const errorText = await folderResponse.text()
      console.error('❌ [GraphSync] Failed to create folder:', errorText)
      throw new Error('Failed to create sync temp folder')
    }
  }

  // ============================================
  // STEP 2: Upload file to OneDrive temp folder
  // ============================================
  console.log(`📤 [GraphSync] Step 2: Uploading to OneDrive...`)

  const timestamp = Date.now()
  const uniqueFileName = `sync_${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`

  const uploadUrl = `https://graph.microsoft.com/v1.0/users/${M365_SERVICE_ACCOUNT}/drive/root:/${syncTempFolder}/${uniqueFileName}:/content`

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    body: fileBuffer
  })

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    console.error('❌ [GraphSync] Upload failed:', errorText)
    throw new Error(`Failed to upload file to OneDrive: ${uploadResponse.status}`)
  }

  const uploadData = await uploadResponse.json()
  const itemId = uploadData.id
  console.log(`✅ [GraphSync] File uploaded, item ID: ${itemId}`)

  let sessionId: string | null = null
  let worksheetsCount = 0

  try {
    // ============================================
    // STEP 3: Create workbook session (persistChanges: true)
    // ============================================
    console.log(`📝 [GraphSync] Step 3: Creating workbook session...`)

    const sessionResponse = await graphRequest(
      token,
      `/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}/workbook/createSession`,
      {
        method: 'POST',
        body: { persistChanges: true }
      }
    )

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text()
      console.error('❌ [GraphSync] Create session failed:', errorText)
      throw new Error(`Failed to create workbook session: ${sessionResponse.status}`)
    }

    const sessionData = await sessionResponse.json()
    sessionId = sessionData.id
    console.log(`✅ [GraphSync] Session created: ${sessionId.slice(0, 20)}...`)

    // ============================================
    // STEP 4: Get all worksheets
    // ============================================
    console.log(`📋 [GraphSync] Step 4: Getting worksheets...`)

    const worksheetsResponse = await graphRequest(
      token,
      `/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}/workbook/worksheets`,
      {
        headers: { 'workbook-session-id': sessionId }
      }
    )

    if (!worksheetsResponse.ok) {
      const errorText = await worksheetsResponse.text()
      console.error('❌ [GraphSync] Get worksheets failed:', errorText)
      throw new Error(`Failed to get worksheets: ${worksheetsResponse.status}`)
    }

    const worksheetsData = await worksheetsResponse.json()
    const worksheets = worksheetsData.value || []
    worksheetsCount = worksheets.length
    
    console.log(`✅ [GraphSync] Found ${worksheetsCount} worksheets:`, worksheets.map((w: { name: string }) => w.name).join(', '))

    // ============================================
    // STEP 5: LOOP all worksheets and PATCH pageLayout
    // ============================================
    console.log(`📐 [GraphSync] Step 5: Setting page layout for all worksheets...`)

    const pageLayoutSettings = {
      orientation: 'Landscape',
      paperSize: 'A4',
      zoom: null,
      fitToWidth: 1,
      fitToHeight: false,
      margins: {
        top: MARGIN_1CM,      // 1 cm = 28.35 points
        bottom: MARGIN_1CM,   // 1 cm
        left: MARGIN_1CM,     // 1 cm
        right: MARGIN_1CM     // 1 cm
      }
    }

    const failedSheets: string[] = []

    for (const worksheet of worksheets) {
      const worksheetId = worksheet.id
      const worksheetName = worksheet.name

      console.log(`📐 [GraphSync] Setting layout for: ${worksheetName}`)

      const layoutResponse = await graphRequest(
        token,
        `/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}/workbook/worksheets/${worksheetId}/pageLayout`,
        {
          method: 'PATCH',
          body: pageLayoutSettings,
          headers: { 'workbook-session-id': sessionId }
        }
      )

      if (!layoutResponse.ok) {
        const errorText = await layoutResponse.text()
        console.warn(`⚠️ [GraphSync] Page layout failed for ${worksheetName}:`, errorText)
        failedSheets.push(worksheetName)
      } else {
        console.log(`✅ [GraphSync] Page layout set for: ${worksheetName}`)
      }
    }

    if (failedSheets.length > 0) {
      console.warn(`⚠️ [GraphSync] Failed to set layout for ${failedSheets.length} sheets: ${failedSheets.join(', ')}`)
    }

    // ============================================
    // STEP 6: Close workbook session (saves changes)
    // ============================================
    console.log(`🔒 [GraphSync] Step 6: Closing workbook session (saving changes)...`)

    const closeResponse = await graphRequest(
      token,
      `/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}/workbook/closeSession`,
      {
        method: 'POST',
        headers: { 'workbook-session-id': sessionId }
      }
    )

    if (closeResponse.ok) {
      console.log(`✅ [GraphSync] Session closed, changes saved permanently`)
    } else {
      console.warn(`⚠️ [GraphSync] Failed to close session properly`)
    }

  } catch (error) {
    console.error('❌ [GraphSync] Error during workbook processing:', error)
    
    // Try to close session if exists
    if (sessionId) {
      try {
        await graphRequest(
          token,
          `/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}/workbook/closeSession`,
          {
            method: 'POST',
            headers: { 'workbook-session-id': sessionId }
          }
        )
      } catch {
        // Ignore
      }
    }
    
    // Re-throw the error - don't continue if layout failed
    throw error
  }

  // ============================================
  // STEP 7: Download modified Excel file
  // ============================================
  console.log(`📥 [GraphSync] Step 7: Downloading modified Excel...`)

  const downloadUrl = `https://graph.microsoft.com/v1.0/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}/content`

  const downloadResponse = await fetch(downloadUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  })

  if (!downloadResponse.ok) {
    const errorText = await downloadResponse.text()
    console.error('❌ [GraphSync] Excel download failed:', errorText)
    throw new Error(`Failed to download modified Excel: ${downloadResponse.status}`)
  }

  const arrayBuffer = await downloadResponse.arrayBuffer()
  const modifiedBuffer = Buffer.from(arrayBuffer)
  
  console.log(`✅ [GraphSync] Excel downloaded, size: ${modifiedBuffer.length} bytes`)
  console.log(`✅ [GraphSync] Complete in ${Date.now() - startTime}ms`)

  // Return modified buffer and cleanup function
  return {
    modifiedBuffer,
    worksheetsCount,
    cleanup: async () => {
      try {
        console.log(`🗑️ [GraphSync] Cleaning up temp file: ${itemId}`)
        const deleteResponse = await graphRequest(
          token,
          `/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}`,
          { method: 'DELETE' }
        )
        
        if (deleteResponse.ok) {
          console.log(`✅ [GraphSync] Temp file deleted`)
        } else {
          console.warn(`⚠️ [GraphSync] Failed to delete temp file (non-critical)`)
        }
      } catch (error) {
        console.warn('⚠️ [GraphSync] Cleanup failed:', error)
      }
    }
  }
}
