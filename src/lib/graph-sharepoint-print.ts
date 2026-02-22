/**
 * Enterprise Microsoft Graph SharePoint Print Service
 * 
 * STRICT MODE: Excel to PDF conversion with layout preservation
 * 
 * INTERNAL IDENTIFIERS (NO URL/BROWSER PATHS):
 * - Site: basarnas.sharepoint.com
 * - DriveId: b!bxLe5TOxnkyWS_JGrus25CMXcMPoJmVKtC9GnhorGWRjehV4F0I8QaahO_sZWAvA
 * - Template ItemId: 016DYVIFZTTCKHBCRFBZBK4D7SF5KFWMQN
 * 
 * Flow:
 * 1. Copy template by ItemId (never edit source)
 * 2. Lock structure (only update VALUES)
 * 3. Data injection via Excel Table
 * 4. Validate layout integrity
 * 5. Convert via Graph API using DriveId + ItemId
 * 6. Save to /Export folder
 * 
 * DILARANG menggunakan:
 * - URL browser (/:x:/g/, Doc.aspx, AllItems.aspx)
 * - Parameter sourcedoc=
 * - URL share public
 * - Path-based file references
 * 
 * WAJIB menggunakan:
 * - DriveId internal
 * - ItemId internal
 * - Identifier dari file picker SharePoint
 */

// ============================================================
// SHAREPOINT INTERNAL IDENTIFIERS - FROM FILE PICKER
// ============================================================

// Site hostname (bukan URL lengkap)
const SHAREPOINT_SITE = 'basarnas.sharepoint.com'

// Drive ID internal dari SharePoint document library
// Diperoleh dari file picker Power Automate / Graph API
const DRIVE_ID = 'b!bxLe5TOxnkyWS_JGrus25CMXcMPoJmVKtC9GnhorGWRjehV4F0I8QaahO_sZWAvA'

// Template Item ID internal - DIPEROLEH DARI FILE PICKER
// INI BUKAN URL BROWSER, INI IDENTIFIER INTERNAL SHAREPOINT
const TEMPLATE_ITEM_ID = '016DYVIFZTTCKHBCRFBZBK4D7SF5KFWMQN'

// Export folder name (relative path dalam library)
const EXPORT_FOLDER = 'Export'

// Layout Validation Constants
const REQUIRED_LAYOUT = {
  orientation: 'Landscape',
  paperSize: 'A4',
  fitToWidth: 1,
  fitToHeight: false
}

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null

// ============================================================
// AUTHENTICATION
// ============================================================

/**
 * Get Azure AD Access Token (Client Credentials Flow)
 */
export async function getGraphToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token
  }

  const tenantId = process.env.AZURE_TENANT_ID!
  const clientId = process.env.AZURE_CLIENT_ID!
  const clientSecret = process.env.AZURE_CLIENT_SECRET!

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Azure AD credentials not configured')
  }

  console.log('🎫 [Graph] Requesting new token from Azure AD...')

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    }).toString()
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ [Graph] Token request failed:', error)
    throw new Error(`Token request failed: ${response.status}`)
  }

  const data = await response.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000
  }

  console.log('✅ [Graph] Token acquired')
  return data.access_token
}

// ============================================================
// GRAPH API HELPER
// ============================================================

/**
 * Graph API Request Helper - menggunakan endpoint internal
 */
async function graphApi(
  token: string,
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    body?: unknown
    headers?: Record<string, string>
  } = {}
): Promise<Response> {
  // SELALU gunakan endpoint Graph API, bukan URL browser
  const url = endpoint.startsWith('http')
    ? endpoint
    : `https://graph.microsoft.com/v1.0${endpoint}`

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
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

// ============================================================
// STEP 1: COPY TEMPLATE (BY INTERNAL ITEM ID)
// ============================================================

/**
 * Get or create Export folder - menggunakan Graph API
 */
async function ensureExportFolder(token: string): Promise<string> {
  console.log(`📁 [Folder] Checking Export folder...`)

  // Gunakan Graph API untuk mendapatkan folder by path relatif
  let response = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/root:/${EXPORT_FOLDER}`
  )

  if (response.ok) {
    const folder = await response.json()
    console.log(`✅ [Folder] Export folder exists with ItemId: ${folder.id}`)
    return folder.id
  }

  // Create folder jika belum ada
  console.log(`📁 [Folder] Creating Export folder...`)
  response = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/root/children`,
    {
      method: 'POST',
      body: {
        name: EXPORT_FOLDER,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      }
    }
  )

  if (response.ok) {
    const folder = await response.json()
    console.log(`✅ [Folder] Export folder created with ItemId: ${folder.id}`)
    return folder.id
  }

  // Retry getting folder
  response = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/root:/${EXPORT_FOLDER}`
  )

  if (response.ok) {
    const folder = await response.json()
    return folder.id
  }

  throw new Error('Failed to create Export folder')
}

/**
 * Copy template file menggunakan INTERNAL ITEM ID
 * 
 * PENTING: Menggunakan ItemId langsung, BUKAN path URL browser
 * Template tidak pernah di-edit, hanya di-copy
 */
export async function copyTemplate(
  token: string,
  outputName?: string
): Promise<{ itemId: string; driveId: string; fileName: string }> {
  const timestamp = Date.now()
  const fileName = outputName || `export-${timestamp}.xlsx`

  console.log(`📋 [Step 1] Copying template using ItemId: ${TEMPLATE_ITEM_ID}`)
  console.log(`   Output: ${fileName}`)

  // VALIDASI: Pastikan TEMPLATE_ITEM_ID sudah dikonfigurasi
  if (!TEMPLATE_ITEM_ID || TEMPLATE_ITEM_ID === '') {
    throw new Error('TEMPLATE_ITEM_ID not configured. Get ItemId from SharePoint file picker.')
  }

  // Get template metadata menggunakan ItemId (BUKAN path)
  const templateResponse = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${TEMPLATE_ITEM_ID}`
  )

  if (!templateResponse.ok) {
    const error = await templateResponse.text()
    console.error('❌ [Step 1] Template not found by ItemId:', error)
    throw new Error(`Template not found with ItemId: ${TEMPLATE_ITEM_ID}. Verify ItemId from SharePoint file picker.`)
  }

  const template = await templateResponse.json()
  console.log(`   Template: ${template.name} (ItemId: ${template.id})`)
  console.log(`   Template has edit permission: ${template.permissions?.length > 0 || 'checking via access'}`)

  // Ensure Export folder exists
  const folderId = await ensureExportFolder(token)

  // Copy template to Export folder menggunakan ItemId
  // INI ADALAH CARA YANG BENAR - menggunakan ItemId, bukan path
  const copyResponse = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${TEMPLATE_ITEM_ID}/copy`,
    {
      method: 'POST',
      body: {
        parentReference: {
          driveId: DRIVE_ID,
          id: folderId
        },
        name: fileName
      }
    }
  )

  // Copy is async - monitor for completion
  if (copyResponse.status === 202) {
    const monitorUrl = copyResponse.headers.get('Location')
    
    if (monitorUrl) {
      // Poll for completion (max 30 seconds)
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 1000))
        
        const monitorResponse = await fetch(monitorUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (monitorResponse.ok) {
          const result = await monitorResponse.json()
          if (result.status === 'completed' && result.resourceId) {
            console.log(`✅ [Step 1] Template copied successfully`)
            console.log(`   New ItemId: ${result.resourceId}`)
            return { 
              itemId: result.resourceId, 
              driveId: DRIVE_ID,
              fileName 
            }
          }
        }
      }
    }

    // Fallback: Search for file by name in Export folder
    await new Promise(r => setTimeout(r, 2000))
    
    const searchResponse = await graphApi(
      token,
      `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/root:/${EXPORT_FOLDER}/${fileName}`
    )
    
    if (searchResponse.ok) {
      const item = await searchResponse.json()
      console.log(`✅ [Step 1] Template copied (fallback)`)
      console.log(`   New ItemId: ${item.id}`)
      return { 
        itemId: item.id, 
        driveId: DRIVE_ID,
        fileName 
      }
    }
  }

  throw new Error('Failed to copy template - copy operation did not complete')
}

// ============================================================
// WORKBOOK SESSION MANAGEMENT
// ============================================================

/**
 * Create workbook session menggunakan ItemId file hasil copy
 */
export async function createSession(
  token: string, 
  itemId: string
): Promise<string> {
  console.log(`📝 [Session] Creating workbook session...`)
  console.log(`   Using ItemId: ${itemId}`)

  const response = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/workbook/createSession`,
    {
      method: 'POST',
      body: { persistChanges: true }
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create session: ${error}`)
  }

  const data = await response.json()
  console.log(`✅ [Session] Created: ${data.id.slice(0, 20)}...`)
  return data.id
}

/**
 * Close workbook session
 */
export async function closeSession(
  token: string,
  itemId: string,
  sessionId: string
): Promise<void> {
  await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/workbook/closeSession`,
    {
      method: 'POST',
      headers: { 'workbook-session-id': sessionId }
    }
  )
  console.log(`🔒 [Session] Closed`)
}

// ============================================================
// STEP 3: DATA INJECTION (LOCK STRUCTURE - ONLY VALUES)
// ============================================================

/**
 * Inject data into Excel Table menggunakan ItemId file hasil copy
 * HANYA mengubah VALUES, tidak mengubah struktur
 */
export async function injectDataToTable(
  token: string,
  itemId: string,
  sessionId: string,
  tableName: string,
  data: Record<string, unknown>[]
): Promise<void> {
  console.log(`💉 [Step 3] Injecting ${data.length} rows into table: ${tableName}`)
  console.log(`   Using ItemId: ${itemId}`)

  // Get table menggunakan ItemId
  const tableResponse = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/workbook/tables/${tableName}`,
    { headers: { 'workbook-session-id': sessionId } }
  )

  if (!tableResponse.ok) {
    const error = await tableResponse.text()
    throw new Error(`Table "${tableName}" not found: ${error}`)
  }

  // Get column headers
  const columnsResponse = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/workbook/tables/${tableName}/columns`,
    { headers: { 'workbook-session-id': sessionId } }
  )

  if (!columnsResponse.ok) {
    throw new Error('Failed to get table columns')
  }

  const columnsData = await columnsResponse.json()
  const headerNames = columnsData.value.map((col: { name: string }) => col.name)

  // Get existing rows
  const rowsResponse = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/workbook/tables/${tableName}/rows`,
    { headers: { 'workbook-session-id': sessionId } }
  )

  // Clear existing data rows (keep header row)
  if (rowsResponse.ok) {
    const rowsData = await rowsResponse.json()
    // Delete from bottom to top to maintain indices
    for (let i = rowsData.value.length - 1; i >= 0; i--) {
      await graphApi(
        token,
        `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/workbook/tables/${tableName}/rows/${rowsData.value[i].index}`,
        {
          method: 'DELETE',
          headers: { 'workbook-session-id': sessionId }
        }
      )
    }
  }

  // Insert new rows with data
  for (const row of data) {
    const values = headerNames.map((header: string) => {
      const value = row[header]
      return value !== undefined ? value : ''
    })

    await graphApi(
      token,
      `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/workbook/tables/${tableName}/rows`,
      {
        method: 'POST',
        headers: { 'workbook-session-id': sessionId },
        body: { values: [values] }
      }
    )
  }

  console.log(`✅ [Step 3] Data injected successfully`)
}

/**
 * Update cell value (for single cells outside tables)
 */
export async function updateCell(
  token: string,
  itemId: string,
  sessionId: string,
  worksheet: string,
  address: string,
  value: unknown
): Promise<void> {
  await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/workbook/worksheets/${worksheet}/range(address='${address}')`,
    {
      method: 'PATCH',
      headers: { 'workbook-session-id': sessionId },
      body: { values: [[value]] }
    }
  )
}

/**
 * Update range values (for bulk updates)
 */
export async function updateRange(
  token: string,
  itemId: string,
  sessionId: string,
  worksheet: string,
  range: string,
  values: unknown[][]
): Promise<void> {
  await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/workbook/worksheets/${worksheet}/range(address='${range}')`,
    {
      method: 'PATCH',
      headers: { 'workbook-session-id': sessionId },
      body: { values }
    }
  )
}

// ============================================================
// STEP 4: VALIDATE LAYOUT INTEGRITY
// ============================================================

/**
 * Validate page layout menggunakan ItemId file hasil copy
 */
export async function validateLayout(
  token: string,
  itemId: string,
  sessionId: string
): Promise<{ valid: boolean; errors: string[] }> {
  console.log(`🔍 [Step 4] Validating layout integrity...`)
  console.log(`   Using ItemId: ${itemId}`)

  const errors: string[] = []

  // Get all worksheets
  const worksheetsResponse = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/workbook/worksheets`,
    { headers: { 'workbook-session-id': sessionId } }
  )

  if (!worksheetsResponse.ok) {
    return { valid: false, errors: ['Failed to get worksheets'] }
  }

  const worksheetsData = await worksheetsResponse.json()

  for (const ws of worksheetsData.value) {
    console.log(`   Checking: ${ws.name}`)

    // Get page layout
    const layoutResponse = await graphApi(
      token,
      `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/workbook/worksheets/${ws.id}/pageLayout`,
      { headers: { 'workbook-session-id': sessionId } }
    )

    if (!layoutResponse.ok) {
      errors.push(`[${ws.name}] Failed to get page layout`)
      continue
    }

    const layout = await layoutResponse.json()

    // Validate orientation
    const orientation = (layout.orientation || '').toLowerCase()
    if (orientation !== REQUIRED_LAYOUT.orientation.toLowerCase()) {
      errors.push(`[${ws.name}] Orientation: "${orientation}" (expected: "${REQUIRED_LAYOUT.orientation}")`)
    }

    // Validate paper size
    const paperSize = (layout.paperSize || '').toLowerCase()
    if (paperSize !== REQUIRED_LAYOUT.paperSize.toLowerCase()) {
      errors.push(`[${ws.name}] PaperSize: "${paperSize}" (expected: "${REQUIRED_LAYOUT.paperSize}")`)
    }

    // Validate fit to width
    if (layout.fitToWidth !== REQUIRED_LAYOUT.fitToWidth) {
      errors.push(`[${ws.name}] FitToWidth: "${layout.fitToWidth}" (expected: "${REQUIRED_LAYOUT.fitToWidth}")`)
    }

    // Validate fit to height (should be false/0/null)
    const fitToHeightOk = layout.fitToHeight === false || 
                          layout.fitToHeight === 0 || 
                          layout.fitToHeight === null
    if (!fitToHeightOk) {
      errors.push(`[${ws.name}] FitToHeight: "${layout.fitToHeight}" (expected: false)`)
    }

    // Check for manual page breaks
    try {
      const hBreaksResponse = await graphApi(
        token,
        `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/workbook/worksheets/${ws.id}/pageLayout/horizontalPageBreaks`,
        { headers: { 'workbook-session-id': sessionId } }
      )

      if (hBreaksResponse.ok) {
        const breaks = await hBreaksResponse.json()
        if (breaks.value?.length > 0) {
          errors.push(`[${ws.name}] Found ${breaks.value.length} manual horizontal page breaks`)
        }
      }

      const vBreaksResponse = await graphApi(
        token,
        `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/workbook/worksheets/${ws.id}/pageLayout/verticalPageBreaks`,
        { headers: { 'workbook-session-id': sessionId } }
      )

      if (vBreaksResponse.ok) {
        const breaks = await vBreaksResponse.json()
        if (breaks.value?.length > 0) {
          errors.push(`[${ws.name}] Found ${breaks.value.length} manual vertical page breaks`)
        }
      }
    } catch {
      // Page breaks endpoint might not be available
    }
  }

  if (errors.length > 0) {
    console.error(`❌ [Step 4] Layout validation FAILED:`)
    errors.forEach(e => console.error(`   - ${e}`))
  } else {
    console.log(`✅ [Step 4] Layout integrity validated`)
  }

  return { valid: errors.length === 0, errors }
}

// ============================================================
// STEP 5: CONVERT TO PDF (DRIVEID + ITEMID)
// ============================================================

/**
 * Convert Excel to PDF menggunakan DriveId + ItemId
 * 
 * PENTING: Menggunakan ItemId file hasil copy, BUKAN template
 */
export async function convertToPdf(
  token: string,
  itemId: string
): Promise<ArrayBuffer> {
  console.log(`📄 [Step 5] Converting to PDF via Graph API...`)
  console.log(`   DriveId: ${DRIVE_ID}`)
  console.log(`   ItemId: ${itemId}`)

  // VALIDASI: Pastikan menggunakan ItemId yang valid
  if (!itemId || itemId === '') {
    throw new Error('ItemId is required for PDF conversion')
  }

  // Gunakan endpoint Graph API dengan DriveId + ItemId
  // INI BUKAN URL BROWSER - ini endpoint Graph API resmi
  const convertUrl = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/content?format=pdf`

  console.log(`   Endpoint: /sites/{site}/drives/{driveId}/items/{itemId}/content?format=pdf`)

  const response = await fetch(convertUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/pdf'
    }
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`❌ [Step 5] PDF conversion FAILED:`, errorBody)
    throw new Error(`PDF conversion failed (${response.status}): ${errorBody}`)
  }

  const pdfBuffer = await response.arrayBuffer()
  console.log(`✅ [Step 5] PDF generated: ${pdfBuffer.byteLength} bytes`)

  // Validasi PDF tidak blank
  if (pdfBuffer.byteLength < 1000) {
    console.warn(`⚠️ [Step 5] PDF size is very small, might be blank`)
  }

  return pdfBuffer
}

// ============================================================
// CLEANUP
// ============================================================

/**
 * Delete file from SharePoint menggunakan ItemId
 */
export async function deleteFile(token: string, itemId: string): Promise<void> {
  console.log(`🗑️ [Cleanup] Deleting file with ItemId: ${itemId}`)
  
  await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}`,
    { method: 'DELETE' }
  )
  
  console.log(`✅ [Cleanup] File deleted`)
}

// ============================================================
// MAIN FLOW
// ============================================================

export interface PrintOptions {
  tableName?: string
  data?: Record<string, unknown>[]
  cellUpdates?: Array<{ worksheet: string; address: string; value: unknown }>
  rangeUpdates?: Array<{ worksheet: string; range: string; values: unknown[][] }>
  outputFileName?: string
}

export interface PrintResult {
  success: boolean
  pdfBuffer?: ArrayBuffer
  exportItemId?: string
  exportFileName?: string
  error?: string
  layoutErrors?: string[]
}

/**
 * Complete Print Flow - Enterprise Grade
 * 
 * Flow:
 * 1. Copy template by ItemId (never edit source)
 * 2. Lock structure (only update VALUES)
 * 3. Data injection via Excel Table
 * 4. Validate layout integrity
 * 5. Convert via Graph API using DriveId + ItemId
 * 6. Return PDF
 * 
 * SEMUA OPERASI MENGGUNAKAN INTERNAL IDENTIFIERS:
 * - DriveId: dari file picker
 * - ItemId: dari file picker (template) atau hasil copy (output)
 */
export async function generatePdfFromTemplate(options: PrintOptions = {}): Promise<PrintResult> {
  const startTime = Date.now()
  let token: string
  let copiedItemId: string | null = null
  let sessionId: string | null = null

  try {
    // Get token
    token = await getGraphToken()

    // STEP 1: Copy template menggunakan ItemId
    const copyResult = await copyTemplate(token, options.outputFileName)
    copiedItemId = copyResult.itemId  // Gunakan ItemId hasil copy untuk semua operasi downstream

    console.log(`📌 All downstream operations will use copied ItemId: ${copiedItemId}`)

    // Create workbook session dengan ItemId hasil copy
    sessionId = await createSession(token, copiedItemId)

    // STEP 3: Inject data (if provided) menggunakan ItemId hasil copy
    if (options.tableName && options.data && options.data.length > 0) {
      await injectDataToTable(token, copiedItemId, sessionId, options.tableName, options.data)
    }

    // Apply cell updates (if provided)
    if (options.cellUpdates) {
      for (const update of options.cellUpdates) {
        await updateCell(token, copiedItemId, sessionId, update.worksheet, update.address, update.value)
      }
      console.log(`✅ Updated ${options.cellUpdates.length} cells`)
    }

    // Apply range updates (if provided)
    if (options.rangeUpdates) {
      for (const update of options.rangeUpdates) {
        await updateRange(token, copiedItemId, sessionId, update.worksheet, update.range, update.values)
      }
      console.log(`✅ Updated ${options.rangeUpdates.length} ranges`)
    }

    // STEP 4: Validate layout menggunakan ItemId hasil copy
    const validation = await validateLayout(token, copiedItemId, sessionId)

    if (!validation.valid) {
      // Close session and delete file
      await closeSession(token, copiedItemId, sessionId!)
      await deleteFile(token, copiedItemId)

      return {
        success: false,
        error: 'Layout integrity compromised',
        layoutErrors: validation.errors
      }
    }

    // Close session (save changes)
    await closeSession(token, copiedItemId, sessionId)
    sessionId = null

    // STEP 5: Convert to PDF menggunakan ItemId hasil copy
    const pdfBuffer = await convertToPdf(token, copiedItemId)

    console.log(`✅ [Complete] Total time: ${Date.now() - startTime}ms`)

    return {
      success: true,
      pdfBuffer,
      exportItemId: copiedItemId,
      exportFileName: copyResult.fileName
    }

  } catch (error) {
    console.error(`❌ [Flow] FAILED:`, error)

    // Cleanup on error
    if (sessionId && copiedItemId) {
      try { await closeSession(token!, copiedItemId, sessionId) } catch {}
    }
    if (copiedItemId) {
      try { await deleteFile(token!, copiedItemId) } catch {}
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Print existing Excel file from SharePoint by ItemId
 */
export async function printExistingFile(itemId: string): Promise<PrintResult> {
  let token: string
  let sessionId: string | null = null

  // VALIDASI: ItemId harus ada
  if (!itemId || itemId === '') {
    return {
      success: false,
      error: 'ItemId is required. Use internal SharePoint ItemId, not browser URL.'
    }
  }

  try {
    token = await getGraphToken()
    sessionId = await createSession(token, itemId)

    // Validate layout
    const validation = await validateLayout(token, itemId, sessionId)

    await closeSession(token, itemId, sessionId)
    sessionId = null

    if (!validation.valid) {
      return {
        success: false,
        error: 'Layout integrity compromised',
        layoutErrors: validation.errors
      }
    }

    // Convert to PDF menggunakan ItemId
    const pdfBuffer = await convertToPdf(token, itemId)

    return {
      success: true,
      pdfBuffer
    }

  } catch (error) {
    if (sessionId) {
      try { await closeSession(token!, itemId, sessionId) } catch {}
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get file metadata by ItemId
 * Berguna untuk debugging dan validasi
 */
export async function getFileMetadata(token: string, itemId: string): Promise<{
  id: string
  name: string
  size: number
  createdDateTime: string
  lastModifiedDateTime: string
  webUrl: string
}> {
  const response = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}`
  )

  if (!response.ok) {
    throw new Error(`Failed to get file metadata for ItemId: ${itemId}`)
  }

  return response.json()
}
