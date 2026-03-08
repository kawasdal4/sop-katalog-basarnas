/**
 * Microsoft Graph Print Helper - VERSION 2024-FINAL-RELOADED
 * 
 * Excel to PDF conversion - NO MODIFICATION to Excel file
 */

// Unique marker to force recompile: timestamp-1739929000-UNIQUE

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID!
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID!
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!
const M365_SERVICE_ACCOUNT = process.env.M365_SERVICE_ACCOUNT!
const PRINT_TEMP_FOLDER = 'R2-Print-Temp'

// Marker to identify this version in logs
const VERSION_MARKER = '=== EXCEL-PDF-V2-NO-MOD ==='

let cachedToken: { token: string; expiresAt: number } | null = null

export async function getGraphToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token
  }

  console.log('🎫 [GraphPrint] Getting token...')

  const response = await fetch(
    `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      }).toString()
    }
  )

  if (!response.ok) throw new Error('Token failed')

  const data = await response.json()
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 300) * 1000 }
  return data.access_token
}

async function ensureFolder(token: string) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${M365_SERVICE_ACCOUNT}/drive/root:/${PRINT_TEMP_FOLDER}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  if (res.ok) return
  
  await fetch(
    `https://graph.microsoft.com/v1.0/users/${M365_SERVICE_ACCOUNT}/drive/root/children`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: PRINT_TEMP_FOLDER, folder: {} })
    }
  )
}

export async function excelToPdfWithLayout(
  fileName: string,
  fileBuffer: Buffer
): Promise<{ pdfBuffer: ArrayBuffer; cleanup: () => Promise<void> }> {
  const start = Date.now()
  
  console.log(VERSION_MARKER)
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🖨️ [GraphPrint] Excel to PDF - VERSION-FINAL`)
  console.log(`   File: ${fileName} (${fileBuffer.length} bytes)`)
  console.log(`   NO MODIFICATION - using original file settings`)
  console.log(`${'='.repeat(60)}\n`)
  
  const token = await getGraphToken()
  await ensureFolder(token)
  
  const uniqueName = `print_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  
  // Upload ORIGINAL file (no modification)
  console.log('📤 [GraphPrint] Uploading original file...')
  
  const uploadRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${M365_SERVICE_ACCOUNT}/drive/root:/${PRINT_TEMP_FOLDER}/${uniqueName}:/content`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      body: new Uint8Array(fileBuffer)
    }
  )
  
  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`Upload failed: ${err}`)
  }
  
  const { id: itemId } = await uploadRes.json()
  console.log('✅ [GraphPrint] Uploaded')
  
  // Wait
  console.log('⏳ [GraphPrint] Processing...')
  await new Promise(r => setTimeout(r, 2000))
  
  // Convert
  console.log('📄 [GraphPrint] Converting to PDF...')
  
  const pdfRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}/content?format=pdf`,
    { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/pdf' } }
  )
  
  // Cleanup
  const cleanup = async () => {
    try {
      await fetch(
        `https://graph.microsoft.com/v1.0/users/${M365_SERVICE_ACCOUNT}/drive/items/${itemId}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
      )
    } catch {}
  }
  
  if (!pdfRes.ok) {
    const err = await pdfRes.text()
    await cleanup()
    throw new Error(`PDF failed: ${err}`)
  }
  
  const pdfBuffer = await pdfRes.arrayBuffer()
  console.log(`✅ [GraphPrint] PDF: ${pdfBuffer.byteLength} bytes`)
  
  await cleanup()
  console.log(`✅ [GraphPrint] Done in ${Date.now() - start}ms\n`)
  
  return { pdfBuffer, cleanup: async () => {} }
}

export async function applyPermanentPrintLayout(
  fileName: string,
  fileBuffer: Buffer
): Promise<{ modifiedBuffer: Buffer; worksheetsCount: number; cleanup: () => Promise<void> }> {
  return { modifiedBuffer: fileBuffer, worksheetsCount: 1, cleanup: async () => {} }
}

export async function checkPrintWorkflowStatus(): Promise<{ configured: boolean; message: string }> {
  try {
    await getGraphToken()
    return { configured: true, message: 'Ready (uses original file settings)' }
  } catch (e) {
    return { configured: false, message: `${e}` }
  }
}
