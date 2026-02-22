/**
 * Excel Print API - Multi-Sheet Support
 * 
 * Converts Excel file to PDF using Microsoft Graph API
 * with proper page layout for ALL worksheets:
 * - A4 paper size
 * - Landscape orientation
 * - FitToWidth = 1 (fit all columns in one page)
 * - FitToHeight = false
 * - Margins: 1 cm (left, right, top, bottom)
 * 
 * Flow:
 * 1. Validate admin user
 * 2. Download file from R2
 * 3. Upload to OneDrive temp folder
 * 4. Create workbook session
 * 5. Get all worksheets
 * 6. Set page layout for EACH worksheet
 * 7. Close workbook session
 * 8. Convert to PDF via Graph API
 * 9. Return PDF stream
 * 10. Cleanup temp file
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { excelToPdfWithLayout } from '@/lib/graph-print'

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

/**
 * GET /api/excel-print?key={objectKey}&id={sopId}
 * 
 * Print Excel file as PDF with multi-sheet support
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // ============================================
    // STEP 1: Authentication Check
    // ============================================
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Silakan login terlebih dahulu',
      }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true, email: true },
    })
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        message: 'Forbidden - Hanya admin yang dapat print',
      }, { status: 403 })
    }
    
    // ============================================
    // STEP 2: Get Parameters
    // ============================================
    const { searchParams } = new URL(request.url)
    const objectKey = searchParams.get('key')
    const sopId = searchParams.get('id')
    
    if (!objectKey) {
      return NextResponse.json({
        success: false,
        message: 'Parameter key (objectKey) diperlukan',
      }, { status: 400 })
    }
    
    console.log(`🖨️ [Print] Starting multi-sheet print for: ${objectKey}`)
    
    // ============================================
    // STEP 3: Get SOP Info (for filename)
    // ============================================
    let fileName = objectKey.split('/').pop() || 'file.xlsx'
    
    if (sopId) {
      const sop = await db.sopFile.findUnique({
        where: { id: sopId },
        select: { nomorSop: true, judul: true, fileName: true }
      })
      
      if (sop) {
        const ext = sop.fileName.split('.').pop() || 'xlsx'
        const sanitize = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 50)
        fileName = `${sanitize(sop.nomorSop)} - ${sanitize(sop.judul)}.${ext}`
      }
    }
    
    // ============================================
    // STEP 4: Download from R2
    // ============================================
    console.log(`📥 [Print] Downloading from R2: ${objectKey}`)
    
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
    })
    
    const r2Response = await r2Client.send(getCommand)
    
    if (!r2Response.Body) {
      return NextResponse.json({
        success: false,
        message: 'File tidak ditemukan di storage',
      }, { status: 404 })
    }
    
    const fileBuffer = Buffer.from(await r2Response.Body.transformToByteArray())
    console.log(`✅ [Print] File downloaded: ${fileBuffer.length} bytes`)
    
    // ============================================
    // STEP 5: Convert to PDF via Microsoft Graph
    // (With multi-sheet page layout)
    // ============================================
    console.log(`📄 [Print] Converting to PDF with multi-sheet layout...`)
    
    const { pdfBuffer, cleanup } = await excelToPdfWithLayout(fileName, fileBuffer)
    
    console.log(`✅ [Print] PDF ready: ${pdfBuffer.byteLength} bytes`)
    
    // ============================================
    // STEP 6: Log Activity
    // ============================================
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'EXCEL_PRINT',
          deskripsi: `Print Excel sebagai PDF (multi-sheet): ${fileName}`,
          fileId: sopId || undefined,
          metadata: JSON.stringify({
            objectKey,
            fileName,
            originalSize: fileBuffer.length,
            pdfSize: pdfBuffer.byteLength,
            duration: Date.now() - startTime,
            settings: {
              paperSize: 'A4',
              orientation: 'Landscape',
              fitToWidth: 1,
              margins: '1cm'
            }
          }),
        },
      })
    } catch (logError) {
      console.warn('⚠️ Failed to create log:', logError)
    }
    
    // ============================================
    // STEP 7: Return PDF Stream
    // ============================================
    // Cleanup in background (don't await)
    cleanup().catch(err => console.warn('⚠️ Cleanup error:', err))
    
    console.log(`✅ [Print] Complete in ${Date.now() - startTime}ms`)
    
    // Generate PDF filename
    const pdfFileName = fileName.replace(/\.[^.]+$/, '.pdf')
    
    // Return PDF with proper headers for printing
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(pdfFileName)}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        // Add X-PDF-Generated header for debugging
        'X-PDF-Generated': new Date().toISOString(),
        'X-Original-File': fileName,
      },
    })
    
  } catch (error) {
    console.error('❌ [Print] Error:', error)
    
    // Return error HTML page if PDF generation fails
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengkonversi file ke PDF'
    
    // Return JSON error for API calls
    if (request.headers.get('Accept')?.includes('application/json')) {
      return NextResponse.json({
        success: false,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : 'Unknown') : undefined,
      }, { status: 500 })
    }
    
    // Return HTML error page for browser
    const htmlError = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - Print Failed</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; text-align: center; }
          .error-container { max-width: 500px; margin: 0 auto; }
          .error-icon { font-size: 48px; margin-bottom: 20px; }
          .error-title { color: #dc2626; font-size: 24px; margin-bottom: 10px; }
          .error-message { color: #666; margin-bottom: 20px; }
          .error-details { background: #fef2f2; padding: 15px; border-radius: 8px; font-size: 12px; color: #991b1b; }
          button { background: #f97316; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
          button:hover { background: #ea580c; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <h1 class="error-title">Print Gagal</h1>
          <p class="error-message">${errorMessage}</p>
          ${process.env.NODE_ENV === 'development' ? `<div class="error-details">${error instanceof Error ? error.stack : ''}</div>` : ''}
          <button onclick="window.close()">Tutup</button>
        </div>
      </body>
      </html>
    `
    
    return new NextResponse(htmlError, {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  }
}
