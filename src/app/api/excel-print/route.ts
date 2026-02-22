/**
 * Excel Print API - Enterprise SharePoint Mode
 * 
 * Uses Microsoft Graph API with SharePoint for 100% layout preservation
 * 
 * Flow:
 * 1. Copy template from SharePoint (never edit source)
 * 2. Inject data into Excel Table (lock structure)
 * 3. Validate layout integrity
 * 4. Convert to PDF via Graph API
 * 5. Return PDF stream
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// Check if SharePoint is configured
const isSharePointConfigured = () => {
  return process.env.AZURE_TENANT_ID && 
         process.env.AZURE_CLIENT_ID && 
         process.env.AZURE_CLIENT_SECRET
}

/**
 * GET /api/excel-print?key={objectKey}&id={sopId}
 * 
 * Print Excel file using SharePoint Graph API
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Authentication Check
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
    
    // Get Parameters
    const { searchParams } = new URL(request.url)
    const objectKey = searchParams.get('key')
    const sopId = searchParams.get('id')
    
    if (!objectKey) {
      return NextResponse.json({
        success: false,
        message: 'Parameter key (objectKey) diperlukan',
      }, { status: 400 })
    }
    
    console.log(`🖨️ [ExcelPrint] Starting print for: ${objectKey}`)

    // Get SOP Info for filename
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
    
    // Try SharePoint Graph API if configured
    if (isSharePointConfigured()) {
      try {
        console.log(`📄 [ExcelPrint] Using SharePoint Graph API...`)
        
        const { generatePdfFromTemplate } = await import('@/lib/graph-sharepoint-print')
        
        // Download file from R2 first
        const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
        
        const r2Client = new S3Client({
          region: 'auto',
          endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY!,
          },
        })
        
        const r2Response = await r2Client.send(new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: objectKey,
        }))
        
        if (!r2Response.Body) {
          throw new Error('File not found in R2')
        }
        
        const fileBuffer = Buffer.from(await r2Response.Body.transformToByteArray())
        
        // Upload file to OneDrive temp folder and convert via Graph API
        // This approach preserves shapes and connectors better than other methods
        const { excelToPdfWithLayout } = await import('@/lib/graph-print')
        
        const result = await excelToPdfWithLayout(fileName, fileBuffer)
        
        // Log activity
        try {
          await db.log.create({
            data: {
              userId,
              aktivitas: 'EXCEL_PRINT',
              deskripsi: `Print Excel (SharePoint Graph): ${fileName}`,
              fileId: sopId || undefined,
              metadata: JSON.stringify({
                objectKey,
                fileName,
                method: 'sharepoint-graph',
                duration: Date.now() - startTime
              }),
            },
          })
        } catch {}
        
        // Cleanup in background
        result.cleanup().catch(() => {})
        
        console.log(`✅ [ExcelPrint] SharePoint Graph success in ${Date.now() - startTime}ms`)
        
        // Return PDF
        const pdfFileName = fileName.replace(/\.[^.]+$/, '.pdf')
        return new NextResponse(result.pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${encodeURIComponent(pdfFileName)}"`,
            'Content-Length': result.pdfBuffer.byteLength.toString(),
          },
        })
        
      } catch (graphError) {
        console.error('⚠️ [ExcelPrint] SharePoint Graph failed:', graphError)
        // Fall through to Office Online Viewer fallback
      }
    }
    
    // Fallback: Use Office Online Viewer
    console.log(`📄 [ExcelPrint] Using Office Online Viewer fallback`)
    
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev'
    const fileUrl = `${R2_PUBLIC_URL}/${objectKey}`
    const encodedUrl = encodeURIComponent(fileUrl)
    const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`
    
    // Log activity
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'EXCEL_PRINT_FALLBACK',
          deskripsi: `Print Excel (Office Online): ${fileName}`,
          fileId: sopId || undefined,
          metadata: JSON.stringify({
            objectKey,
            fileName,
            method: 'office-online-viewer',
            duration: Date.now() - startTime
          }),
        },
      })
    } catch {}
    
    // Return HTML that redirects to viewer
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print - ${fileName}</title>
        <style>
          body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
          .loading { 
            display: flex; 
            flex-direction: column;
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            background: #f5f5f5;
          }
          .spinner { 
            width: 40px; 
            height: 40px; 
            border: 4px solid #e5e7eb; 
            border-top-color: #f97316; 
            border-radius: 50%; 
            animation: spin 1s linear infinite; 
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          .message { margin-top: 16px; color: #666; }
          .print-btn {
            position: fixed;
            top: 16px;
            right: 16px;
            background: #f97316;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }
          .print-btn:hover { background: #ea580c; }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">🖨️ Print</button>
        <div class="loading" id="loading">
          <div class="spinner"></div>
          <div class="message">Membuka dokumen...</div>
        </div>
        <iframe 
          id="viewer"
          src="${viewerUrl}" 
          style="width: 100%; height: 100vh; border: none; display: none;"
          onload="document.getElementById('loading').style.display='none'; this.style.display='block';"
        ></iframe>
      </body>
      </html>
    `
    
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
    
  } catch (error) {
    console.error('❌ [ExcelPrint] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Gagal memproses file'
    
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <body style="font-family:system-ui;padding:40px;text-align:center">
        <h1 style="color:#dc2626">❌ Print Gagal</h1>
        <p>${errorMessage}</p>
        <button onclick="window.close()" style="background:#f97316;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer">Tutup</button>
      </body>
      </html>
    `, { 
      status: 500, 
      headers: { 'Content-Type': 'text/html' } 
    })
  }
}
