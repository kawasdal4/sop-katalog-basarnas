import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { db } from '@/lib/db'
import { downloadFromR2, isR2Configured } from '@/lib/r2-storage'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

interface ExcelCell {
  address: string
  value: string | number | boolean | null
  formula?: string
  style?: {
    font?: {
      bold?: boolean
      italic?: boolean
      size?: number
      color?: string
    }
    fill?: string
    alignment?: {
      horizontal?: string
      vertical?: string
      wrapText?: boolean
    }
  }
}

interface ExcelRow {
  index: number
  height: number
  hidden: boolean
}

interface ExcelColumn {
  index: number
  width: number
  hidden: boolean
}

interface ExcelShape {
  id: string
  type: 'shape' | 'connector' | 'image' | 'textbox'
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  text?: string
  fill?: string
  stroke?: string
}

interface ExcelSheet {
  name: string
  index: number
  cells: ExcelCell[]
  rows: ExcelRow[]
  columns: ExcelColumn[]
  shapes: ExcelShape[]
  mergedCells: string[]
  dimensions: {
    minRow: number
    maxRow: number
    minCol: number
    maxCol: number
  }
  totalWidth: number
  totalHeight: number
}

interface ExcelData {
  fileName: string
  sheets: ExcelSheet[]
  activeSheet: number
}

// Store directory for Excel files
const STORE_DIR = path.join(process.cwd(), 'store', 'excel_original')

// Ensure store directory exists
async function ensureStoreDir() {
  if (!existsSync(STORE_DIR)) {
    await mkdir(STORE_DIR, { recursive: true })
  }
}

// Get Excel file from R2
async function getExcelFileBuffer(document: { id: string; filePath: string; fileName: string }): Promise<{ buffer: Buffer | null; error?: string }> {
  await ensureStoreDir()
  
  const localStorePath = path.join(STORE_DIR, `${document.id}.xlsx`)
  
  // Check if file already exists locally
  if (existsSync(localStorePath)) {
    const { readFile } = await import('fs/promises')
    console.log(`✅ File found in local store: ${localStorePath}`)
    return { buffer: await readFile(localStorePath) }
  }
  
  // Check if R2 is configured
  if (!isR2Configured()) {
    return { buffer: null, error: 'Cloudflare R2 tidak terkonfigurasi' }
  }
  
  // Download from R2
  if (!document.filePath) {
    console.log('❌ No file path available')
    return { buffer: null, error: 'File tidak tersedia di storage' }
  }

  try {
    console.log(`📥 Downloading from R2: ${document.filePath}`)
    
    const result = await downloadFromR2(document.filePath)
    
    // Save to local store for future use
    await writeFile(localStorePath, result.buffer)
    console.log(`✅ Downloaded and cached: ${document.fileName} -> ${localStorePath}`)
    
    return { buffer: result.buffer }
  } catch (error) {
    console.error('❌ Failed to download from R2:', error)
    return { 
      buffer: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Convert Excel column width to pixels
function colWidthToPixels(width: number): number {
  return Math.round(width * 7 + 5)
}

// Convert Excel row height to pixels
function rowHeightToPixels(height: number): number {
  return Math.round(height * (96 / 72))
}

// Extract shapes from worksheet (limited support)
function extractShapes(ws: XLSX.WorkSheet): ExcelShape[] {
  const shapes: ExcelShape[] = []
  
  if ((ws as any)['!images']) {
    const images = (ws as any)['!images'] as any[]
    images.forEach((img, idx) => {
      shapes.push({
        id: `image_${idx}`,
        type: 'image',
        name: img.name || `Image ${idx + 1}`,
        x: img.position?.col || 0,
        y: img.position?.row || 0,
        width: img.width || 100,
        height: img.height || 100,
      })
    })
  }
  
  return shapes
}

// Parse Excel file and extract all data
function parseExcelBuffer(buffer: Buffer, fileName: string): ExcelData {
  const workbook = XLSX.read(buffer, { 
    type: 'buffer',
    cellStyles: true,
    cellNF: true,
    cellDates: true,
  })
  
  const sheets: ExcelSheet[] = []
  
  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const ws = workbook.Sheets[sheetName]
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    
    // Extract cells
    const cells: ExcelCell[] = []
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const address = XLSX.utils.encode_cell({ r: row, c: col })
        const cell = ws[address]
        
        if (cell) {
          cells.push({
            address,
            value: cell.v !== undefined ? String(cell.v) : null,
            formula: cell.f,
            style: {
              font: {
                bold: (cell.s as any)?.font?.bold,
                italic: (cell.s as any)?.font?.italic,
                size: (cell.s as any)?.font?.sz,
                color: (cell.s as any)?.font?.color?.rgb,
              },
              fill: (cell.s as any)?.fill?.fgColor?.rgb,
              alignment: {
                horizontal: (cell.s as any)?.alignment?.horizontal,
                vertical: (cell.s as any)?.alignment?.vertical,
                wrapText: (cell.s as any)?.alignment?.wrapText,
              },
            },
          })
        }
      }
    }
    
    // Extract column widths
    const columns: ExcelColumn[] = []
    const colWidths = ws['!cols'] || []
    let totalWidth = 0
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const colData = colWidths[col] || { wch: 8.43 }
      const width = colWidthToPixels(colData.wch || 8.43)
      columns.push({
        index: col,
        width,
        hidden: colData.hidden || false,
      })
      if (!colData.hidden) {
        totalWidth += width
      }
    }
    
    // Extract row heights
    const rows: ExcelRow[] = []
    const rowHeights = ws['!rows'] || []
    let totalHeight = 0
    
    for (let row = range.s.r; row <= range.e.r; row++) {
      const rowData = rowHeights[row] || { hpt: 15 }
      const height = rowHeightToPixels(rowData.hpt || 15)
      rows.push({
        index: row,
        height,
        hidden: rowData.hidden || false,
      })
      if (!rowData.hidden) {
        totalHeight += height
      }
    }
    
    // Extract merged cells
    const mergedCells = ws['!merges']?.map(m => {
      return `${XLSX.utils.encode_cell(m.s)}:${XLSX.utils.encode_cell(m.e)}`
    }) || []
    
    // Extract shapes (limited)
    const shapes = extractShapes(ws)
    
    sheets.push({
      name: sheetName,
      index: sheetIndex,
      cells,
      rows,
      columns,
      shapes,
      mergedCells,
      dimensions: {
        minRow: range.s.r,
        maxRow: range.e.r,
        minCol: range.s.c,
        maxCol: range.e.c,
      },
      totalWidth,
      totalHeight,
    })
  })
  
  return {
    fileName,
    sheets,
    activeSheet: 0,
  }
}

export async function GET(request: NextRequest) {
  console.log('========================================')
  console.log('📊 EXCEL VIEWER API')
  console.log('========================================')
  
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
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
      where: { id: documentId },
    })
    
    if (!document) {
      console.log('❌ Document not found')
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    
    console.log(`📄 File: ${document.fileName}`)
    console.log(`📁 FilePath: ${document.filePath}`)
    
    // Check file type
    const fileExtension = document.fileName.toLowerCase().split('.').pop()
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
      return NextResponse.json({ 
        error: 'File bukan Excel. Hanya mendukung .xlsx, .xls, .csv' 
      }, { status: 400 })
    }
    
    // Get or download Excel file from R2
    const result = await getExcelFileBuffer(document)
    
    if (!result.buffer) {
      console.log('❌ File not accessible:', result.error)
      return NextResponse.json({ 
        error: 'File tidak dapat diakses',
        details: result.error || 'File tidak ditemukan di R2 storage.',
        suggestion: 'Pastikan file sudah diupload dengan benar atau hubungi admin.'
      }, { status: 404 })
    }
    
    console.log(`✅ File buffer obtained: ${result.buffer.length} bytes`)
    
    // Parse Excel file
    const excelData = parseExcelBuffer(result.buffer, document.fileName)
    
    console.log(`✅ Parsed ${excelData.sheets.length} sheet(s)`)
    console.log(`   Total cells: ${excelData.sheets.reduce((sum, s) => sum + s.cells.length, 0)}`)
    console.log(`   Canvas: ${excelData.sheets[0]?.totalWidth || 0}x${excelData.sheets[0]?.totalHeight || 0}px`)
    
    // Update preview count
    await db.sopFile.update({
      where: { id: documentId },
      data: { previewCount: { increment: 1 } },
    })
    
    console.log('========================================')
    
    return NextResponse.json({
      success: true,
      data: excelData,
    })
    
  } catch (error) {
    console.error('❌ Error parsing Excel:', error)
    return NextResponse.json({
      error: 'Gagal membaca file Excel',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
