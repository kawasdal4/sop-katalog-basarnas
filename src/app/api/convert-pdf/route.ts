import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CONVERTER_PORT = 3004

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userIdCookie = cookieStore.get('userId')?.value

    if (!userIdCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fileId, fileName, paperSize } = body

    console.log('========================================')
    console.log('🔄 [Convert PDF] Request')
    console.log(`   File ID: ${fileId}`)
    console.log(`   Paper: ${paperSize || 'F4'} Landscape`)
    console.log('========================================')

    if (!fileId) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'File ID diperlukan' 
      }, { status: 400 })
    }

    const fileIdPattern = /^[a-zA-Z0-9_-]{20,}$/
    if (!fileIdPattern.test(fileId)) {
      return NextResponse.json({
        status: 'error',
        message: 'Format File ID tidak valid.'
      }, { status: 400 })
    }

    // Step 1: Download from Google Drive
    console.log('📥 Downloading file...')
    
    const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
    
    const driveResponse = await fetch(driveDownloadUrl)
    
    if (!driveResponse.ok) {
      throw new Error('Gagal mengunduh file dari Google Drive')
    }
    
    const fileBuffer = await driveResponse.arrayBuffer()
    const fileBase64 = Buffer.from(fileBuffer).toString('base64')
    
    console.log(`   File size: ${(fileBuffer.byteLength / 1024).toFixed(2)} KB`)

    // Step 2: Convert via service
    console.log('📤 Converting...')
    
    try {
      const converterResponse = await fetch(`http://localhost:${CONVERTER_PORT}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: fileBase64,
          fileName: fileName || 'document.xlsx',
          paperSize: paperSize || 'F4',
          dpi: 300
        }),
        signal: AbortSignal.timeout(180000)
      })

      if (!converterResponse.ok) {
        throw new Error(`Converter error: ${converterResponse.status}`)
      }

      const result = await converterResponse.json()

      if (result.success && result.pdfBase64) {
        console.log(`✅ Success! PDF size: ${(result.pdfSize / 1024).toFixed(2)} KB`)
        
        return NextResponse.json({
          status: 'success',
          pdfBase64: result.pdfBase64,
          note: result.note
        })
      } else {
        throw new Error(result.error || 'Conversion failed')
      }

    } catch (converterError) {
      console.error('Converter error:', converterError)
      
      if (converterError instanceof TypeError && 
          (converterError.message.includes('fetch failed') || converterError.message.includes('ECONNREFUSED'))) {
        return NextResponse.json({
          status: 'fallback',
          message: 'Layanan konversi tidak tersedia.',
          downloadUrl: driveDownloadUrl
        })
      }
      
      throw converterError
    }

  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
