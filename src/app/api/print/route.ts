import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// Excel Converter Mini Service Configuration
const CONVERTER_PORT = 3031
const CONVERTER_URL = `http://localhost:${CONVERTER_PORT}`

// R2 Configuration for generating direct URLs
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!

// GET - Get print-ready PDF for a file
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')
    const marginOption = searchParams.get('margin') || 'normal' // normal, wide, extra-wide
    
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
      await db.log.create({
        data: {
          userId,
          aktivitas: 'PRINT_FILE',
          deskripsi: `Printed PDF: ${sopFile.nomorSop} - ${sopFile.judul}`,
          fileId: sopFile.id,
        },
      })
      
      return NextResponse.json({
        success: true,
        fileName: sopFile.fileName,
        pdfUrl,
        fileType: 'pdf',
      })
    }
    
    // For Excel files - convert to PDF with print settings
    if (['xlsx', 'xls', 'xlsm'].includes(fileExtension || '')) {
      console.log('Converting Excel to PDF for print:', sopFile.filePath, 'margin:', marginOption)
      
      try {
        // Call the Excel converter mini-service with margin option
        const converterResponse = await fetch(`${CONVERTER_URL}/preview?XTransformPort=${CONVERTER_PORT}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileKey: sopFile.filePath,
            force: marginOption !== 'normal', // Force re-convert if using custom margin
            margin: marginOption,
          }),
        })
        
        const converterData = await converterResponse.json()
        
        if (!converterResponse.ok || !converterData.success) {
          console.error('Excel conversion failed:', converterData.error)
          
          // Fallback: Return R2 URL for Office Online viewer
          const r2Url = `${R2_PUBLIC_URL}/${sopFile.filePath}`
          const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(r2Url)}`
          
          return NextResponse.json({
            success: true,
            fileName: sopFile.fileName,
            pdfUrl: viewerUrl,
            fileType: 'excel',
            fallback: true,
            message: 'Konversi PDF tidak tersedia. Membuka di Office Online Viewer.',
          })
        }
        
        // Log print activity
        await db.log.create({
          data: {
            userId,
            aktivitas: 'PRINT_FILE',
            deskripsi: `Printed Excel (converted to PDF): ${sopFile.nomorSop} - ${sopFile.judul}`,
            fileId: sopFile.id,
          },
        })
        
        console.log('Excel converted successfully, PDF URL:', converterData.previewUrl)
        
        // Get margin description
        const marginDesc = {
          'normal': '1cm',
          'wide': '1.5cm',
          'extra-wide': '2cm'
        }[marginOption] || '1cm'
        
        return NextResponse.json({
          success: true,
          fileName: sopFile.fileName,
          pdfUrl: converterData.previewUrl,
          previewKey: converterData.previewKey,
          fileType: 'excel',
          cached: converterData.cached,
          margin: marginOption,
          message: `Excel dikonversi ke PDF: Landscape, A4, Margin ${marginDesc}`,
        })
        
      } catch (converterError) {
        console.error('Converter service error:', converterError)
        
        // Fallback: Return R2 URL for Office Online viewer
        const r2Url = `${R2_PUBLIC_URL}/${sopFile.filePath}`
        const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(r2Url)}`
        
        return NextResponse.json({
          success: true,
          fileName: sopFile.fileName,
          pdfUrl: viewerUrl,
          fileType: 'excel',
          fallback: true,
          message: 'Layanan konversi tidak tersedia. Membuka di Office Online Viewer.',
        })
      }
    }
    
    // For other file types - not supported for print
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
