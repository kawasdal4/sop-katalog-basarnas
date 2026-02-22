/**
 * Enterprise Microsoft Graph SharePoint Print Service
 * 
 * STRICT MODE: Excel to PDF conversion with layout preservation
 * 
 * Template: /template-layout-master.xlsx
 * Site: basarnas.sharepoint.com
 * Drive: b!bxLe5TOxnkyWS_JGrus25CMXcMPoJmVKtC9GnhorGWRjehV4F0I8QaahO_sZWAvA
 * 
 * Flow:
 * 1. Copy template (never edit source)
 * 2. Lock structure (only update VALUES)
 * 3. Data injection via Excel Table
 * 4. Validate layout integrity
 * 5. Convert via Graph API (SharePoint endpoint)
 * 6. Save to /Export folder
 */

// SharePoint Configuration
const SHAREPOINT_SITE = 'basarnas.sharepoint.com'
const DRIVE_ID = 'b!bxLe5TOxnkyWS_JGrus25CMXcMPoJmVKtC9GnhorGWRjehV4F0I8QaahO_sZWAvA'
const TEMPLATE_PATH = '/template-layout-master.xlsx'
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

/**
 * Graph API Request Helper
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
// STEP 1: COPY TEMPLATE
// ============================================================

/**
 * Get or create Export folder
 */
async function ensureExportFolder(token: string): Promise<string> {
  console.log(`📁 [Folder] Checking Export folder...`)

  // Try to get existing folder
  let response = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/root:/${EXPORT_FOLDER}`
  )

  if (response.ok) {
    const folder = await response.json()
    console.log(`✅ [Folder] Export folder exists: ${folder.id}`)
    return folder.id
  }

  // Create folder
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
    console.log(`✅ [Folder] Export folder created: ${folder.id}`)
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
 * Copy template file (never edit source!)
 */
export async function copyTemplate(
  token: string,
  outputName?: string
): Promise<{ itemId: string; fileName: string }> {
  const timestamp = Date.now()
  const fileName = outputName || `export-${timestamp}.xlsx`

  console.log(`📋 [Step 1] Copying template to: ${fileName}`)

  // Get template item
  const templateResponse = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/root:${TEMPLATE_PATH}`
  )

  if (!templateResponse.ok) {
    const error = await templateResponse.text()
    console.error('❌ [Step 1] Template not found:', error)
    throw new Error(`Template not found at ${TEMPLATE_PATH}`)
  }

  const template = await templateResponse.json()
  console.log(`   Template: ${template.name} (ID: ${template.id})`)

  // Ensure Export folder exists
  const folderId = await ensureExportFolder(token)

  // Copy template to Export folder
  const copyResponse = await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${template.id}/copy`,
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
            console.log(`✅ [Step 1] Template copied: ${fileName}`)
            return { itemId: result.resourceId, fileName }
          }
        }
      }
    }

    // Fallback: Search for file by name
    await new Promise(r => setTimeout(r, 2000))
    
    const searchResponse = await graphApi(
      token,
      `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/root:/${EXPORT_FOLDER}/${fileName}`
    )
    
    if (searchResponse.ok) {
      const item = await searchResponse.json()
      console.log(`✅ [Step 1] Template copied (fallback): ${fileName}`)
      return { itemId: item.id, fileName }
    }
  }

  throw new Error('Failed to copy template')
}

// ============================================================
// WORKBOOK SESSION MANAGEMENT
// ============================================================

/**
 * Create workbook session
 */
export async function createSession(token: string, itemId: string): Promise<string> {
  console.log(`📝 [Session] Creating workbook session...`)

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
// STEP 3: DATA INJECTION (LOCK STRUCTURE)
// ============================================================

/**
 * Inject data into Excel Table (only VALUES, no structure changes)
 */
export async function injectDataToTable(
  token: string,
  itemId: string,
  sessionId: string,
  tableName: string,
  data: Record<string, unknown>[]
): Promise<void> {
  console.log(`💉 [Step 3] Injecting ${data.length} rows into table: ${tableName}`)

  // Get table
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
 * Validate page layout before converting to PDF
 */
export async function validateLayout(
  token: string,
  itemId: string,
  sessionId: string
): Promise<{ valid: boolean; errors: string[] }> {
  console.log(`🔍 [Step 4] Validating layout integrity...`)

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
// STEP 5: CONVERT TO PDF (MANDATORY GRAPH API)
// ============================================================

/**
 * Convert Excel to PDF using SharePoint Graph API endpoint
 */
export async function convertToPdf(
  token: string,
  itemId: string
): Promise<ArrayBuffer> {
  console.log(`📄 [Step 5] Converting to PDF via Graph API...`)

  const convertUrl = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}/content?format=pdf`

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

  return pdfBuffer
}

// ============================================================
// CLEANUP
// ============================================================

/**
 * Delete file from SharePoint (for cleanup on error)
 */
export async function deleteFile(token: string, itemId: string): Promise<void> {
  await graphApi(
    token,
    `/sites/${SHAREPOINT_SITE}/drives/${DRIVE_ID}/items/${itemId}`,
    { method: 'DELETE' }
  )
  console.log(`🗑️ [Cleanup] File deleted: ${itemId}`)
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
 * 1. Copy template (never edit source)
 * 2. Lock structure (only update VALUES)
 * 3. Data injection via Excel Table
 * 4. Validate layout integrity
 * 5. Convert via Graph API
 * 6. Return PDF
 */
export async function generatePdfFromTemplate(options: PrintOptions = {}): Promise<PrintResult> {
  const startTime = Date.now()
  let token: string
  let itemId: string | null = null
  let sessionId: string | null = null

  try {
    // Get token
    token = await getGraphToken()

    // STEP 1: Copy template
    const copyResult = await copyTemplate(token, options.outputFileName)
    itemId = copyResult.itemId

    // Create workbook session
    sessionId = await createSession(token, itemId)

    // STEP 3: Inject data (if provided)
    if (options.tableName && options.data && options.data.length > 0) {
      await injectDataToTable(token, itemId, sessionId, options.tableName, options.data)
    }

    // Apply cell updates (if provided)
    if (options.cellUpdates) {
      for (const update of options.cellUpdates) {
        await updateCell(token, itemId, sessionId, update.worksheet, update.address, update.value)
      }
      console.log(`✅ Updated ${options.cellUpdates.length} cells`)
    }

    // Apply range updates (if provided)
    if (options.rangeUpdates) {
      for (const update of options.rangeUpdates) {
        await updateRange(token, itemId, sessionId, update.worksheet, update.range, update.values)
      }
      console.log(`✅ Updated ${options.rangeUpdates.length} ranges`)
    }

    // STEP 4: Validate layout
    const validation = await validateLayout(token, itemId, sessionId)

    if (!validation.valid) {
      // Close session and delete file
      await closeSession(token, itemId, sessionId!)
      await deleteFile(token, itemId)

      return {
        success: false,
        error: 'Layout integrity compromised',
        layoutErrors: validation.errors
      }
    }

    // Close session (save changes)
    await closeSession(token, itemId, sessionId)
    sessionId = null

    // STEP 5: Convert to PDF
    const pdfBuffer = await convertToPdf(token, itemId)

    console.log(`✅ [Complete] Total time: ${Date.now() - startTime}ms`)

    return {
      success: true,
      pdfBuffer,
      exportItemId: itemId,
      exportFileName: copyResult.fileName
    }

  } catch (error) {
    console.error(`❌ [Flow] FAILED:`, error)

    // Cleanup on error
    if (sessionId && itemId) {
      try { await closeSession(token!, itemId, sessionId) } catch {}
    }
    if (itemId) {
      try { await deleteFile(token!, itemId) } catch {}
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Print existing Excel file from SharePoint
 */
export async function printExistingFile(itemId: string): Promise<PrintResult> {
  let token: string
  let sessionId: string | null = null

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

    // Convert to PDF
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
