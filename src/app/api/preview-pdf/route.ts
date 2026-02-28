import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { downloadFromR2, isR2Configured } from '@/lib/r2-storage'
import { writeFile, existsSync, mkdirSync } from 'fs'
import { promisify } from 'util'

const writeFileAsync = promisify(writeFile)

export const dynamic = 'force-dynamic'

// Storage paths for cached PDFs
const STORE_DIR = '/home/z/my-project/store'
const PDF_DIR = `${STORE_DIR}/pdf_preview`

// Ensure directories exist
if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true })
if (!existsSync(PDF_DIR)) mkdirSync(PDF_DIR, { recursive: true })

// PDF Converter Service URL
const PDF_CONVERTER_URL = 'http://localhost:3004'

// Supported file types
const EXCEL_TYPES = ['xlsx', 'xls', 'xlsm']
const WORD_TYPES = ['docx', 'doc']
const PDF_TYPES = ['pdf']

/**
 * GET /api/preview-pdf?id={documentId}
 * 
 * Returns PDF preview URL. Generates PDF if not exists.
 * Uses R2 as primary storage.
 * 
 * Supported file types:
 * - PDF: Direct preview
 * - Excel (xlsx, xls, xlsm): Convert to PDF
 * - Word (docx, doc): Convert to PDF
 */
export async function GET(request: NextRequest) {
  try {
    const documentId = request.nextUrl.searchParams.get('id')
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID diperlukan' }, { status: 400 })
    }

    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json({ 
        error: 'Cloudflare R2 tidak terkonfigurasi. Hubungi administrator.',
        needsSetup: true
      }, { status: 500 })
    }

    // Get document from database
    const document = await db.sopFile.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    const fileType = document.fileType?.toLowerCase() || 'pdf'

    // ============================================
    // PDF FILES - Direct preview
    // ============================================
    if (PDF_TYPES.includes(fileType)) {
      console.log(`📄 [Preview] PDF file, fetching from R2: ${document.filePath}`)
      
      if (!document.filePath) {
        return NextResponse.json({ error: 'File tidak tersedia di storage' }, { status: 404 })
      }

      let fileBuffer: Buffer
      try {
        const result = await downloadFromR2(document.filePath)
        fileBuffer = result.buffer
      } catch (downloadError) {
        console.error('R2 download error:', downloadError)
        return NextResponse.json({ 
          error: 'File tidak ditemukan di R2',
          details: downloadError instanceof Error ? downloadError.message : 'Unknown error'
        }, { status: 404 })
      }

      const base64 = fileBuffer.toString('base64')
      
      // Increment preview counter
      await db.sopFile.update({
        where: { id: documentId },
        data: { previewCount: { increment: 1 } }
      })

      return NextResponse.json({
        success: true,
        type: 'pdf',
        data: base64,
        fileName: document.fileName
      })
    }

    // ============================================
    // EXCEL & WORD FILES - Convert to PDF
    // ============================================
    if (EXCEL_TYPES.includes(fileType) || WORD_TYPES.includes(fileType)) {
      const fileTypeName = EXCEL_TYPES.includes(fileType) ? 'Excel' : 'Word'
      
      // Check if PDF preview exists
      const pdfPath = `${PDF_DIR}/${documentId}.pdf`
      
      if (existsSync(pdfPath)) {
        // Check if PDF is still fresh (generated after last update)
        const pdfStats = await import('fs').then(fs => fs.promises.stat(pdfPath))
        const docUpdatedAt = new Date(document.updatedAt)
        
        if (pdfStats.mtime > docUpdatedAt) {
          console.log(`[Preview] Cached PDF exists for ${fileTypeName}: ${pdfPath}`)
          
          // Increment preview counter
          await db.sopFile.update({
            where: { id: documentId },
            data: { previewCount: { increment: 1 } }
          })

          return NextResponse.json({
            success: true,
            pdfUrl: `/api/preview-pdf/file?id=${documentId}`,
            cached: true,
            originalType: fileType
          })
        }
      }

      // Need to generate PDF from Excel/Word
      console.log(`[Preview] Generating PDF for ${fileTypeName}: ${document.judul}`)

      if (!document.filePath) {
        return NextResponse.json({ error: 'File tidak tersedia di storage' }, { status: 404 })
      }

      // Download file from R2
      let fileData: Buffer
      try {
        const result = await downloadFromR2(document.filePath)
        fileData = result.buffer
      } catch (downloadError) {
        console.error('R2 download error:', downloadError)
        return NextResponse.json({ 
          error: 'File tidak ditemukan di R2',
          details: downloadError instanceof Error ? downloadError.message : 'Unknown error'
        }, { status: 404 })
      }

      // Convert to PDF
      const pdfData = await convertToPdf(fileData, document.fileName, fileType)
      
      if (!pdfData) {
        return NextResponse.json({ 
          error: 'Gagal mengkonversi ke PDF',
          details: 'PDF converter service mungkin tidak tersedia'
        }, { status: 500 })
      }

      // Save PDF locally for caching
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

      console.log(`[Preview] PDF generated for ${fileTypeName}: ${pdfPath}`)

      return NextResponse.json({
        success: true,
        pdfUrl: `/api/preview-pdf/file?id=${documentId}`,
        cached: false,
        originalType: fileType
      })
    }

    // ============================================
    // UNSUPPORTED FILE TYPES
    // ============================================
    return NextResponse.json({ 
      error: `Tipe file tidak didukung untuk preview: ${fileType}`,
      supportedTypes: [...PDF_TYPES, ...EXCEL_TYPES, ...WORD_TYPES]
    }, { status: 400 })

  } catch (error) {
    console.error('[Preview] Error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat generate PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Convert file to PDF using PDF Converter service
 */
async function convertToPdf(fileData: Buffer, fileName: string, fileType: string): Promise<Buffer | null> {
  try {
    const response = await fetch(`${PDF_CONVERTER_URL}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64: fileData.toString('base64'),
        fileName: fileName,
        fileType: fileType
      }),
      signal: AbortSignal.timeout(60000) // 60 second timeout
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
