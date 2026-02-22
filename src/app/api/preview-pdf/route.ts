import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { writeFile, readFile, existsSync, mkdirSync, unlinkSync } from 'fs'
import { promisify } from 'util'

const writeFileAsync = promisify(writeFile)
const readFileAsync = promisify(readFile)

// Storage paths
const STORE_DIR = '/home/z/my-project/store'
const EXCEL_DIR = `${STORE_DIR}/excel_original`
const PDF_DIR = `${STORE_DIR}/pdf_preview`

// Ensure directories exist
if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true })
if (!existsSync(EXCEL_DIR)) mkdirSync(EXCEL_DIR, { recursive: true })
if (!existsSync(PDF_DIR)) mkdirSync(PDF_DIR, { recursive: true })

// PDF Converter Service URL
const PDF_CONVERTER_URL = 'http://localhost:3004'

/**
 * GET /api/preview-pdf?id={documentId}
 * 
 * Returns PDF preview URL. Generates PDF if not exists.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const documentId = request.nextUrl.searchParams.get('id')
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID diperlukan' }, { status: 400 })
    }

    // Get document from database
    const document = await db.sopFile.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    if (!document.driveFileId) {
      return NextResponse.json({ error: 'File tidak tersedia di Google Drive' }, { status: 404 })
    }

    // Check if PDF already exists locally
    const pdfPath = `${PDF_DIR}/${documentId}.pdf`
    
    if (existsSync(pdfPath)) {
      // Check if PDF is still fresh (generated after last update)
      const pdfStats = await import('fs').then(fs => fs.promises.stat(pdfPath))
      const docUpdatedAt = new Date(document.updatedAt)
      
      if (pdfStats.mtime > docUpdatedAt && document.pdfPreviewPath) {
        // PDF is fresh, return URL
        console.log(`[Preview] PDF exists: ${pdfPath}`)
        
        // Increment preview counter
        await db.sopFile.update({
          where: { id: documentId },
          data: { previewCount: { increment: 1 } }
        })
        
        // Log activity
        await db.log.create({
          data: {
            userId,
            aktivitas: 'PREVIEW',
            deskripsi: `Preview ${document.jenis}: ${document.nomorSop}`,
            fileId: documentId
          }
        })

        return NextResponse.json({
          success: true,
          pdfUrl: `/api/preview-pdf/file?id=${documentId}`,
          cached: true
        })
      }
    }

    // Need to generate PDF
    console.log(`[Preview] Generating PDF for: ${document.nomorSop}`)

    // Download Excel from Google Drive
    const downloadResult = await downloadFromGoogleDrive(document.driveFileId)
    
    if (!downloadResult) {
      return NextResponse.json({ error: 'Gagal mengunduh file dari Google Drive' }, { status: 500 })
    }

    const excelData = downloadResult.buffer

    // Save Excel locally
    const excelPath = `${EXCEL_DIR}/${documentId}.xlsx`
    await writeFileAsync(excelPath, excelData)

    // Convert to PDF
    const pdfData = await convertToPdf(excelData, document.fileName)
    
    if (!pdfData) {
      return NextResponse.json({ error: 'Gagal mengkonversi ke PDF' }, { status: 500 })
    }

    // Save PDF locally
    await writeFileAsync(pdfPath, pdfData)

    // Update database with PDF path
    await db.sopFile.update({
      where: { id: documentId },
      data: {
        pdfPreviewPath: pdfPath,
        pdfPreviewGeneratedAt: new Date(),
        previewCount: { increment: 1 }
      }
    })

    // Log activity
    await db.log.create({
      data: {
        userId,
        aktivitas: 'PREVIEW',
        deskripsi: `Preview ${document.jenis}: ${document.nomorSop} (PDF Generated)`,
        fileId: documentId
      }
    })

    console.log(`[Preview] PDF generated: ${pdfPath}`)

    return NextResponse.json({
      success: true,
      pdfUrl: `/api/preview-pdf/file?id=${documentId}`,
      cached: false
    })

  } catch (error) {
    console.error('[Preview] Error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat generate PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Download file from Google Drive
 */
async function downloadFromGoogleDrive(driveFileId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
  try {
    const gd = await import('@/lib/google-drive')
    const result = await gd.downloadFileFromDrive(driveFileId)
    return result
  } catch (error) {
    console.error('[Preview] Download error:', error)
    return null
  }
}

/**
 * Convert Excel to PDF using PDF Converter service
 */
async function convertToPdf(excelData: Buffer, fileName: string): Promise<Buffer | null> {
  try {
    const response = await fetch(`${PDF_CONVERTER_URL}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64: excelData.toString('base64'),
        fileName: fileName
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Preview] Converter error:', error)
      return null
    }

    const result = await response.json()
    
    if (!result.success || !result.pdfBase64) {
      console.error('[Preview] Conversion failed:', result)
      return null
    }

    return Buffer.from(result.pdfBase64, 'base64')
  } catch (error) {
    console.error('[Preview] Convert error:', error)
    return null
  }
}
