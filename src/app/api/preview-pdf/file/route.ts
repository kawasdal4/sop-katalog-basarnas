import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

const PDF_DIR = '/home/z/my-project/store/pdf_preview'

/**
 * GET /api/preview-pdf/file?id={documentId}
 * 
 * Serves the PDF file directly
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

    const pdfPath = `${PDF_DIR}/${documentId}.pdf`

    if (!existsSync(pdfPath)) {
      return NextResponse.json({ error: 'PDF tidak ditemukan' }, { status: 404 })
    }

    // Read PDF file
    const pdfData = await readFile(pdfPath)

    // Return PDF with appropriate headers
    return new NextResponse(pdfData, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfData.length.toString(),
        'Content-Disposition': `inline; filename="${document.nomorSop}.pdf"`,
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('[PDF File] Error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
