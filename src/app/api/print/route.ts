/**
 * Print API - Convert files to PDF for printing
 *
 * Conversion Priority:
 * 1. Microsoft Graph API - Microsoft's own cloud conversion (best compatibility)
 * 2. LibreOffice CLI - Local fallback (better print settings preservation)
 *
 * Supported formats: PDF (direct), Excel (.xlsx, .xls, .xlsm), Word (.docx, .doc)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { downloadFromR2, isR2Configured } from '@/lib/r2-storage'
import { getAzureAccessToken, getServiceAccount } from '@/lib/azure-auth'
import { addPdfFooter } from '@/lib/pdf-footer'
import crypto from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir, readFile, rmdir } from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const PRINT_TEMP_FOLDER = 'R2-Print-Temp'

const CONTENT_TYPES: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pdf: 'application/pdf',
}

const printTokens: Map<string, { fileId: string; userId: string; createdAt: number; useCount: number }> = new Map()
const MAX_TOKEN_USES = 20

const tempFilesCleanup: Map<string, { deleteAt: number; fileName: string }> = new Map()
let cleanupInterval: NodeJS.Timeout | null = null

function startCleanupWorker() {
  if (cleanupInterval) return
  cleanupInterval = setInterval(async () => {
    const now = Date.now()
    for (const [token, info] of printTokens) {
      if (now - info.createdAt > 5 * 60 * 1000) printTokens.delete(token)
    }
    const toDelete: string[] = []
    for (const [id, info] of tempFilesCleanup) {
      if (now >= info.deleteAt) toDelete.push(id)
    }
    if (toDelete.length > 0) {
      try {
        const token = await getAzureAccessToken()
        const sa = getServiceAccount()
        for (const id of toDelete) {
          try {
            await fetch(`https://graph.microsoft.com/v1.0/users/${sa}/drive/items/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            })
            tempFilesCleanup.delete(id)
          } catch {}
        }
      } catch {}
    }
  }, 60000)
}
startCleanupWorker()

async function ensurePrintTempFolder(token: string): Promise<void> {
  const sa = getServiceAccount()
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${sa}/drive/root:/${PRINT_TEMP_FOLDER}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (res.ok) return
  await fetch(`https://graph.microsoft.com/v1.0/users/${sa}/drive/root/children`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: PRINT_TEMP_FOLDER, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' })
  })
}

async function uploadToOneDrive(token: string, fileName: string, content: Buffer, contentType: string): Promise<{ id: string }> {
  const sa = getServiceAccount()
  const uniqueName = `print_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${sa}/drive/root:/${PRINT_TEMP_FOLDER}/${uniqueName}:/content`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': contentType },
    body: new Uint8Array(content)
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  const data = await res.json()
  return { id: data.id }
}

async function deleteFromOneDrive(token: string, driveItemId: string): Promise<void> {
  const sa = getServiceAccount()
  try {
    await fetch(`https://graph.microsoft.com/v1.0/users/${sa}/drive/items/${driveItemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    tempFilesCleanup.delete(driveItemId)
  } catch {}
}

/**
 * Method 1: Microsoft Graph API Conversion
 * Uses Microsoft's cloud service - best for formatting compatibility
 */
async function convertWithGraphApi(token: string, driveItemId: string): Promise<Buffer> {
  const sa = getServiceAccount()

  console.log(`📄 [Print] Method 1: Microsoft Graph API conversion...`)

  // Wait for file processing
  await new Promise(r => setTimeout(r, 3000))

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/users/${sa}/drive/items/${driveItemId}/content?format=pdf`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/pdf' } }
      )

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Conversion failed: ${res.status} ${err}`)
      }

      const buffer = Buffer.from(await res.arrayBuffer())
      console.log(`✅ [Print] Graph API success: ${buffer.length} bytes`)
      return buffer
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`⚠️ [Print] Graph API attempt ${attempt} failed:`, lastError.message)
      if (attempt < 3) await new Promise(r => setTimeout(r, 3000 * attempt))
    }
  }

  throw lastError || new Error('Graph API conversion failed')
}

/**
 * Method 2: LibreOffice CLI Conversion (Fallback)
 * Better print settings preservation but may have formatting differences
 */
async function convertWithLibreOffice(fileBuffer: Buffer, originalFileName: string): Promise<Buffer> {
  const tempDir = path.join(tmpdir(), `sop-print-${Date.now()}`)
  const inputFile = path.join(tempDir, originalFileName)

  console.log(`📄 [Print] Method 2: LibreOffice conversion...`)
  console.log(`   Temp: ${tempDir}`)

  try {
    await mkdir(tempDir, { recursive: true })
    await writeFile(inputFile, fileBuffer)

    const loPath = process.env.LIBREOFFICE_PATH || 'libreoffice'

    // Convert to PDF
    const command = `"${loPath}" --headless --norestore --nologo --nofirststartwizard ` +
      `--convert-to pdf --outdir "${tempDir}" "${inputFile}"`

    console.log(`   Running: ${command.substring(0, 100)}...`)
    const { stdout, stderr } = await execAsync(command, {
      timeout: 90000,
      maxBuffer: 100 * 1024 * 1024
    })

    if (stderr) console.warn(`   stderr: ${stderr.substring(0, 200)}`)

    // Read output
    const pdfPath = inputFile.replace(/\.[^.]+$/, '.pdf')
    const pdfBuffer = await readFile(pdfPath)

    console.log(`✅ [Print] LibreOffice success: ${pdfBuffer.length} bytes`)

    // Cleanup
    try { await unlink(inputFile); await unlink(pdfPath); await rmdir(tempDir) } catch {}

    return pdfBuffer

  } catch (err) {
    try { await unlink(inputFile).catch(() => {}); await rmdir(tempDir).catch(() => {}) } catch {}
    throw err
  }
}

/**
 * POST /api/print - Generate print token
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { fileId } = await request.json()
    if (!fileId) return NextResponse.json({ error: 'File ID diperlukan' }, { status: 400 })

    const sopFile = await db.sopFile.findUnique({ where: { id: fileId } })
    if (!sopFile) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })

    const printToken = crypto.randomBytes(32).toString('hex')
    printTokens.set(printToken, { fileId, userId, createdAt: Date.now(), useCount: 0 })

    console.log(`🎫 [Print] Token generated for: ${sopFile.fileName}`)

    return NextResponse.json({ success: true, token: printToken })
  } catch (error) {
    return NextResponse.json({
      error: 'Gagal membuat token',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 })
  }
}

/**
 * GET /api/print?token=xxx
 * Convert and return PDF for printing
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const fileId = searchParams.get('id')

    let userId: string
    let targetId: string

    if (token) {
      const info = printTokens.get(token)
      if (!info || Date.now() - info.createdAt > 5 * 60 * 1000) {
        return NextResponse.json({ error: 'Token tidak valid' }, { status: 403 })
      }
      if (info.useCount >= MAX_TOKEN_USES) {
        printTokens.delete(token)
        return NextResponse.json({ error: 'Token expired' }, { status: 403 })
      }
      info.useCount++
      userId = info.userId
      targetId = info.fileId
    } else {
      const cookieStore = await cookies()
      const uid = cookieStore.get('userId')?.value
      if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      userId = uid
      targetId = fileId!
    }

    if (!targetId) return NextResponse.json({ error: 'File ID required' }, { status: 400 })

    const sopFile = await db.sopFile.findUnique({
      where: { id: targetId },
      include: { user: { select: { name: true } } }
    })

    if (!sopFile?.filePath) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }

    const ext = sopFile.fileName.toLowerCase().split('.').pop() || ''
    if (!['pdf', 'xlsx', 'xls', 'xlsm', 'docx', 'doc'].includes(ext)) {
      return NextResponse.json({ error: 'Format tidak didukung' }, { status: 400 })
    }

    if (!isR2Configured()) {
      return NextResponse.json({ error: 'R2 tidak terkonfigurasi' }, { status: 500 })
    }

    console.log(`\n${'='.repeat(50)}`)
    console.log(`🖨️ [Print] ${sopFile.judul} (${ext.toUpperCase()})`)
    console.log(`${'='.repeat(50)}`)

    // Get user name for footer
    const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } })
    const userName = user?.name || 'Unknown'

    // Download from R2
    console.log(`📥 [Print] Downloading from R2...`)
    const { buffer: fileBuffer } = await downloadFromR2(sopFile.filePath)
    console.log(`✅ [Print] Downloaded: ${fileBuffer.length} bytes`)

    let pdfBuffer: Buffer
    let conversionMethod = 'none'

    if (ext === 'pdf') {
      // Already PDF
      pdfBuffer = fileBuffer
      conversionMethod = 'direct'
    } else {
      // Try Method 1: Graph API (Microsoft's own conversion)
      let graphApiSuccess = false
      let driveId: string | null = null

      try {
        console.log(`\n📄 [Print] Trying Microsoft Graph API...`)
        const graphToken = await getAzureAccessToken()
        await ensurePrintTempFolder(graphToken)

        const uploadResult = await uploadToOneDrive(
          graphToken,
          sopFile.fileName,
          fileBuffer,
          CONTENT_TYPES[ext] || 'application/octet-stream'
        )
        driveId = uploadResult.id

        tempFilesCleanup.set(driveId, { deleteAt: Date.now() + 5 * 60 * 1000, fileName: sopFile.fileName })

        pdfBuffer = await convertWithGraphApi(graphToken, driveId)
        graphApiSuccess = true
        conversionMethod = 'Microsoft Graph API'

      } catch (graphError) {
        console.warn(`⚠️ [Print] Graph API failed:`, graphError instanceof Error ? graphError.message : graphError)

        // Try Method 2: LibreOffice (fallback)
        console.log(`\n📄 [Print] Falling back to LibreOffice...`)
        try {
          pdfBuffer = await convertWithLibreOffice(fileBuffer, sopFile.fileName)
          conversionMethod = 'LibreOffice'
        } catch (loError) {
          console.error(`❌ [Print] LibreOffice also failed:`, loError)
          throw new Error('Semua metode konversi gagal. Silakan coba lagi atau download file asli.')
        }
      } finally {
        // Cleanup OneDrive temp file
        if (driveId && graphApiSuccess) {
          try {
            const graphToken = await getAzureAccessToken()
            await deleteFromOneDrive(graphToken, driveId)
          } catch {}
        }
      }
    }

    console.log(`✅ [Print] Conversion done via ${conversionMethod}: ${pdfBuffer.length} bytes`)

    // Add footer
    console.log(`📄 [Print] Adding footer...`)
    const pdfWithFooter = await addPdfFooter(
      pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength) as ArrayBuffer,
      userName,
      sopFile.user?.name
    )

    // Log activity
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'PRINT',
          deskripsi: `Print ${sopFile.jenis}: ${sopFile.judul} (${conversionMethod})`,
          fileId: sopFile.id
        }
      })
    } catch {}

    // Generate filename
    const sanitize = (n: string) => n.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)
    const outName = `${sanitize(sopFile.judul)} - ${sopFile.tahun}.pdf`

    console.log(`\n✅ [Print] Complete: ${outName}`)
    console.log(`   Method: ${conversionMethod}`)
    console.log(`   Size: ${pdfWithFooter.byteLength} bytes`)
    console.log(`   Time: ${Date.now() - startTime}ms\n`)

    const finalBuffer = new ArrayBuffer(pdfWithFooter.byteLength)
    new Uint8Array(finalBuffer).set(pdfWithFooter)

    if (searchParams.get('format') === 'base64') {
      return NextResponse.json({
        dataUri: `data:application/pdf;base64,${Buffer.from(finalBuffer).toString('base64')}`
      })
    }

    return new NextResponse(finalBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${outName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('❌ [Print] Error:', error)
    return NextResponse.json({
      error: 'Gagal mempersiapkan print',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 })
  }
}
