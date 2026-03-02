/**
 * Excel/Word Print API
 * 
 * Production: Downloads the file for local printing (LibreOffice conversion not available on Vercel)
 * Development: Uses local PDF converter service
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!

// PDF Converter Service (mini-service on port 3004) - only available in development
const PDF_CONVERTER_URL = 'http://localhost:3004'
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

// Content types for Excel and Word files
const CONTENT_TYPES: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pdf: 'application/pdf',
}

/**
 * Convert Excel to PDF using local converter service
 * Applies print settings: A4 landscape, fitToWidth=1
 */
async function convertExcelToPdf(fileName: string, fileBuffer: Buffer): Promise<ArrayBuffer> {
  console.log(`🖨️ [Print] Converting: ${fileName} (${fileBuffer.length} bytes)`)
  console.log('📋 [Print] Using local PDF converter with print settings')
  
  // Call the local PDF converter service directly
  const response = await fetch(`${PDF_CONVERTER_URL}/convert/print`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileBase64: fileBuffer.toString('base64'),
      fileName: fileName,
    }),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ [Print] Converter error:', errorText)
    throw new Error(`PDF conversion failed: ${errorText}`)
  }
  
  const result = await response.json()
  
  if (!result.success || !result.pdfBase64) {
    throw new Error(result.error || 'PDF conversion failed')
  }
  
  console.log(`✅ [Print] PDF created: ${result.pdfSize} bytes`)
  console.log(`📄 [Print] Print settings applied:`, result.printSettings)
  
  // Convert base64 back to ArrayBuffer
  const pdfBuffer = Buffer.from(result.pdfBase64, 'base64')
  return pdfBuffer.buffer as ArrayBuffer
}

/**
 * GET /api/excel-print?key={objectKey}&id={sopId}
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Authentication
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    
    if (!user || user.role !== 'ADMIN' && user.role !== 'DEVELOPER') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }
    
    // Get parameters
    const { searchParams } = new URL(request.url)
    const objectKey = searchParams.get('key')
    const sopId = searchParams.get('id')
    
    if (!objectKey) {
      return NextResponse.json({ success: false, message: 'Parameter key required' }, { status: 400 })
    }
    
    console.log(`🖨️ [Print] Starting print for: ${objectKey}`)
    
    // Get filename
    let fileName = objectKey.split('/').pop() || 'file.xlsx'
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'xlsx'
    
    if (sopId) {
      const sop = await db.sopFile.findUnique({
        where: { id: sopId },
        select: { judul: true, fileName: true }
      })
      if (sop) {
        const ext = sop.fileName.split('.').pop() || fileExt
        const sanitize = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)
        fileName = `${sanitize(sop.judul)}.${ext}`
      }
    }
    
    // Download from R2
    console.log(`📥 [Print] Downloading from R2: ${objectKey}`)
    
    const r2Response = await r2Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
    }))
    
    if (!r2Response.Body) {
      return NextResponse.json({ success: false, message: 'File not found' }, { status: 404 })
    }
    
    const fileBuffer = Buffer.from(await r2Response.Body.transformToByteArray())
    console.log(`✅ [Print] Downloaded: ${fileBuffer.length} bytes`)
    
    // In production, just return the file for download (user can print from their app)
    // PDF conversion requires LibreOffice which is not available on Vercel
    if (isProduction) {
      console.log(`📄 [Print] Production mode - returning file for download`)
      
      // Log activity
      try {
        await db.log.create({
          data: {
            userId,
            aktivitas: 'PRINT_DOWNLOAD',
            deskripsi: `Download untuk print: ${fileName}`,
            fileId: sopId || undefined,
          },
        })
      } catch {}
      
      const contentType = CONTENT_TYPES[fileExt] || 'application/octet-stream'
      
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }
    
    // In development, convert to PDF with print settings
    const pdfBuffer = await convertExcelToPdf(fileName, fileBuffer)
    
    // Log activity
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'PRINT_PDF',
          deskripsi: `Print dokumen sebagai PDF: ${fileName}`,
          fileId: sopId || undefined,
          metadata: JSON.stringify({
            objectKey,
            fileName,
            originalSize: fileBuffer.length,
            pdfSize: pdfBuffer.byteLength,
            duration: Date.now() - startTime
          }),
        },
      })
    } catch {}
    
    console.log(`✅ [Print] Complete in ${Date.now() - startTime}ms`)
    
    // Return PDF
    const pdfFileName = fileName.replace(/\.[^.]+$/, '.pdf')
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(pdfFileName)}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
    
  } catch (error) {
    console.error('❌ [Print] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Gagal memproses file'
    
    return NextResponse.json({
      success: false,
      message: errorMessage,
    }, { status: 500 })
  }
}
