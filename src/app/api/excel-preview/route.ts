import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { GoogleDriveError, downloadFileFromDrive } from '@/lib/google-drive'

// Store directory for preview images
const PREVIEW_DIR = path.join(process.cwd(), 'store', 'excel_preview')

// Ensure preview directory exists
async function ensurePreviewDir() {
  if (!existsSync(PREVIEW_DIR)) {
    await mkdir(PREVIEW_DIR, { recursive: true })
  }
}

// Ensure original excel directory exists
async function ensureExcelDir() {
  const excelDir = path.join(process.cwd(), 'store', 'excel_original')
  if (!existsSync(excelDir)) {
    await mkdir(excelDir, { recursive: true })
  }
}

// Get Excel file buffer from local store or Google Drive
async function getExcelFileBuffer(document: { id: string; filePath: string; driveFileId?: string | null; fileName: string }): Promise<{ buffer: Buffer; error?: string; requiresReconnect?: boolean }> {
  const localStorePath = path.join(process.cwd(), 'store', 'excel_original', `${document.id}.xlsx`)
  
  // Check local store first
  if (existsSync(localStorePath)) {
    const { readFile } = await import('fs/promises')
    console.log(`✅ Excel found in local store: ${localStorePath}`)
    return { buffer: await readFile(localStorePath) }
  }
  
  // Check if filePath is a valid local path
  if (document.filePath && !document.filePath.match(/^[a-zA-Z0-9_-]{20,}$/)) {
    if (existsSync(document.filePath)) {
      const { readFile } = await import('fs/promises')
      console.log(`✅ Excel found at path: ${document.filePath}`)
      return { buffer: await readFile(document.filePath) }
    }
  }
  
  // Download from Google Drive
  if (document.driveFileId) {
    try {
      console.log(`📥 Downloading Excel from Google Drive: ${document.driveFileId}`)
      
      const { buffer, fileName } = await downloadFileFromDrive(document.driveFileId)
      
      // Cache for future use
      await ensureExcelDir()
      const storePath = path.join(process.cwd(), 'store', 'excel_original', `${document.id}.xlsx`)
      await writeFile(storePath, buffer)
      console.log(`✅ Cached: ${storePath}`)
      
      return { buffer }
    } catch (error) {
      console.error('❌ Failed to download from Google Drive:', error)
      
      // Check if it's a token/auth error
      if (error instanceof GoogleDriveError) {
        return {
          buffer: Buffer.alloc(0),
          error: error.message,
          requiresReconnect: error.code === 'TOKEN_EXPIRED' || error.code === 'PERMISSION_DENIED'
        }
      }
      
      return {
        buffer: Buffer.alloc(0),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  return {
    buffer: Buffer.alloc(0),
    error: 'File tidak tersedia di Google Drive'
  }
}

// Convert Excel to PNG using PDF converter service
async function convertExcelToPng(buffer: Buffer, dpi: number = 300): Promise<{ pages: { page: number; pngBase64: string; width: number; height: number }[] }> {
  const CONVERTER_URL = 'http://localhost:3004/convert/png'
  
  console.log(`📤 Sending to converter service: ${buffer.length} bytes`)
  
  const response = await fetch(CONVERTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileBase64: buffer.toString('base64'),
      dpi,
      allPages: true
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Converter service error: ${error}`)
  }
  
  const result = await response.json()
  
  if (!result.success) {
    throw new Error(result.error || 'Conversion failed')
  }
  
  return {
    pages: result.pages.map((p: { page: number; pngBase64: string; width: number; height: number }) => ({
      page: p.page,
      pngBase64: p.pngBase64,
      width: p.width,
      height: p.height
    }))
  }
}

export async function GET(request: NextRequest) {
  console.log('========================================')
  console.log('🖼️ EXCEL PREVIEW (RENDER-AS-IMAGE)')
  console.log('========================================')
  
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')
    const dpi = parseInt(searchParams.get('dpi') || '300')
    const page = parseInt(searchParams.get('page') || '1')
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }
    
    // Get document from database
    const document = await db.sopFile.findUnique({
      where: { id: documentId },
    })
    
    if (!document) {
      console.log('❌ Document not found')
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    
    console.log(`📄 File: ${document.fileName}`)
    
    // Check file type
    const fileExtension = document.fileName.toLowerCase().split('.').pop()
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
      return NextResponse.json({ 
        error: 'File bukan Excel. Hanya mendukung .xlsx, .xls, .csv' 
      }, { status: 400 })
    }
    
    // Check for cached preview images
    await ensurePreviewDir()
    const cachePath = path.join(PREVIEW_DIR, `${document.id}_page_${page}.png`)
    
    if (existsSync(cachePath)) {
      console.log(`✅ Using cached preview: ${cachePath}`)
      const { readFile } = await import('fs/promises')
      const cachedBuffer = await readFile(cachePath)
      
      // Update preview count
      await db.sopFile.update({
        where: { id: documentId },
        data: { previewCount: { increment: 1 } },
      })
      
      return NextResponse.json({
        success: true,
        cached: true,
        page,
        pngBase64: cachedBuffer.toString('base64'),
        mimeType: 'image/png'
      })
    }
    
    // Get Excel file
    const excelResult = await getExcelFileBuffer(document)
    
    if (excelResult.error || excelResult.buffer.length === 0) {
      console.log('❌ Excel file not accessible:', excelResult.error)
      
      return NextResponse.json({ 
        error: excelResult.error || 'File tidak dapat diakses',
        requiresReconnect: excelResult.requiresReconnect,
        suggestion: excelResult.requiresReconnect 
          ? 'Session expired – silakan reconnect Google Drive'
          : 'Pastikan file tersedia atau hubungi admin.'
      }, { status: excelResult.requiresReconnect ? 401 : 404 })
    }
    
    console.log(`✅ Excel buffer: ${excelResult.buffer.length} bytes`)
    
    // Convert to PNG
    console.log(`🔄 Converting Excel to PNG (${dpi} DPI)...`)
    const result = await convertExcelToPng(excelResult.buffer, dpi)
    
    console.log(`✅ Generated ${result.pages.length} page(s)`)
    
    // Cache all pages
    for (const p of result.pages) {
      const pageCachePath = path.join(PREVIEW_DIR, `${document.id}_page_${p.page}.png`)
      const pngBuffer = Buffer.from(p.pngBase64, 'base64')
      await writeFile(pageCachePath, pngBuffer)
      console.log(`  Cached: page ${p.page}`)
    }
    
    // Update preview count
    await db.sopFile.update({
      where: { id: documentId },
      data: { previewCount: { increment: 1 } },
    })
    
    // Return requested page
    const requestedPage = result.pages.find(p => p.page === page) || result.pages[0]
    
    console.log('========================================')
    
    return NextResponse.json({
      success: true,
      cached: false,
      page: requestedPage.page,
      totalPages: result.pages.length,
      pngBase64: requestedPage.pngBase64,
      width: requestedPage.width,
      height: requestedPage.height,
      mimeType: 'image/png'
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
    
    // Check if it's a Google Drive error
    if (error instanceof GoogleDriveError) {
      return NextResponse.json({
        error: error.message,
        requiresReconnect: error.code === 'TOKEN_EXPIRED',
        suggestion: error.code === 'TOKEN_EXPIRED' 
          ? 'Session expired – silakan reconnect Google Drive'
          : 'Terjadi kesalahan pada koneksi Google Drive'
      }, { status: error.code === 'TOKEN_EXPIRED' ? 401 : 500 })
    }
    
    return NextResponse.json({
      error: 'Gagal membuat preview',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
