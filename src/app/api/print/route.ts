import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// R2 Configuration for generating direct URLs
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev'

/**
 * GET /api/print?id={fileId}
 * 
 * Print handler for PDF and Excel files
 * - PDF files: Direct URL to R2 public URL
 * - Excel files: Redirect to excel-print API
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')
    const marginOption = searchParams.get('margin') || 'normal'
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    }
    
    const sopFile = await db.sopFile.findUnique({
      where: { id: fileId },
    })
    
    if (!sopFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    
    if (!sopFile.filePath) {
      return NextResponse.json({ error: 'File path not available' }, { status: 404 })
    }
    
    const fileExtension = sopFile.fileName.toLowerCase().split('.').pop()
    
    // For PDF files - return direct URL
    if (fileExtension === 'pdf') {
      const pdfUrl = `${R2_PUBLIC_URL}/${sopFile.filePath}`
      
      // Log print activity
      try {
        await db.log.create({
          data: {
            userId,
            aktivitas: 'PRINT_FILE',
            deskripsi: `Printed PDF: ${sopFile.nomorSop} - ${sopFile.judul}`,
            fileId: sopFile.id,
          },
        })
      } catch {}
      
      return NextResponse.json({
        success: true,
        fileName: sopFile.fileName,
        pdfUrl,
        fileType: 'pdf',
      })
    }
    
    // For Excel files - redirect to excel-print API
    if (['xlsx', 'xls', 'xlsm'].includes(fileExtension || '')) {
      // Use excel-print API which handles Graph API or Office Online fallback
      const excelPrintUrl = `/api/excel-print?key=${encodeURIComponent(sopFile.filePath)}&id=${sopFile.id}`
      
      // Redirect to excel-print
      return NextResponse.redirect(new URL(excelPrintUrl, request.url))
    }
    
    // For other file types - not supported
    return NextResponse.json({
      error: 'File type not supported for printing',
      supportedTypes: ['pdf', 'xlsx', 'xls', 'xlsm'],
    }, { status: 400 })
    
  } catch (error) {
    console.error('Print API error:', error)
    return NextResponse.json({
      error: 'Failed to prepare file for printing',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
