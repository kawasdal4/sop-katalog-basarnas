import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import ExcelJS from 'exceljs'

// Color palette for charts
const COLORS = {
  orange: 'FFf97316',
  yellow: 'FFeab308',
  green: 'FF22c55e',
  red: 'FFef4444',
  blue: 'FF3b82f6',
  cyan: 'FF06b6d4',
  purple: 'FF8b5cf6',
  slate: 'FF64748b'
}

// GET - Export report with full stats
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({ where: { id: userId } })
    
    if (user?.role !== 'ADMIN' && user?.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'xlsx'
    
    // Get all SOP files with full details
    const sopFiles = await db.sopFile.findMany({
      where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
      include: {
        user: { select: { name: true } }
      },
      orderBy: { uploadedAt: 'desc' }
    })
    
    // Get full statistics
    const [
      totalSop,
      totalIk,
      totalAktif,
      totalReview,
      totalKadaluarsa,
      totalPreviews,
      totalDownloads,
      byTahun,
      byKategori,
      byJenis,
      byStatus
    ] = await Promise.all([
      db.sopFile.count({ where: { jenis: 'SOP', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] } }),
      db.sopFile.count({ where: { jenis: 'IK', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] } }),
      db.sopFile.count({ where: { status: 'AKTIF', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] } }),
      db.sopFile.count({ where: { status: 'REVIEW', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] } }),
      db.sopFile.count({ where: { status: 'KADALUARSA', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] } }),
      db.sopFile.aggregate({ 
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        _sum: { previewCount: true } 
      }),
      db.sopFile.aggregate({ 
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        _sum: { downloadCount: true } 
      }),
      db.sopFile.groupBy({
        by: ['tahun'],
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        _count: { tahun: true },
        orderBy: { tahun: 'desc' }
      }),
      db.sopFile.groupBy({
        by: ['kategori'],
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        _count: { kategori: true }
      }),
      db.sopFile.groupBy({
        by: ['jenis'],
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        _count: { jenis: true }
      }),
      db.sopFile.groupBy({
        by: ['status'],
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        _count: { status: true }
      })
    ])

    // Public submission stats
    const totalPublikMenunggu = await db.sopFile.count({
      where: { isPublicSubmission: true, verificationStatus: 'MENUNGGU' }
    })
    const totalPublikDitolak = await db.sopFile.count({
      where: { isPublicSubmission: true, verificationStatus: 'DITOLAK' }
    })
    
    // Format SOP data for export
    const data = sopFiles.map(sop => ({
      judul: sop.judul,
      tahun: sop.tahun,
      kategori: sop.kategori,
      jenis: sop.jenis,
      status: sop.status,
      previewCount: sop.previewCount || 0,
      downloadCount: sop.downloadCount || 0,
      fileName: sop.fileName,
      uploadedBy: sop.user.name,
      uploadedAt: sop.uploadedAt.toISOString()
    }))

    // Stats summary
    const stats = {
      totalSop,
      totalIk,
      totalAktif,
      totalReview,
      totalKadaluarsa,
      totalPublikMenunggu,
      totalPublikDitolak,
      totalPreviews: totalPreviews._sum.previewCount || 0,
      totalDownloads: totalDownloads._sum.downloadCount || 0,
      byTahun: byTahun.map(item => ({ tahun: item.tahun, count: item._count.tahun })),
      byKategori: byKategori.map(item => ({ kategori: item.kategori, count: item._count.kategori })),
      byJenis: byJenis.map(item => ({ jenis: item.jenis, count: item._count.jenis })),
      byStatus: byStatus.map(item => ({ status: item.status, count: item._count.status }))
    }
    
    if (format === 'json') {
      return NextResponse.json({ data, stats })
    }
    
    if (format === 'xlsx') {
      // Create Excel file with ExcelJS
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'BASARNAS SOP Katalog'
      workbook.created = new Date()
      
      // === SHEET 1: Dashboard Overview ===
      const dashboardSheet = workbook.addWorksheet('Dashboard', {
        views: [{ showGridLines: false }]
      })
      
      // Set column widths
      dashboardSheet.columns = [
        { width: 3 }, { width: 20 }, { width: 15 }, { width: 3 },
        { width: 20 }, { width: 15 }, { width: 3 },
        { width: 20 }, { width: 15 }, { width: 3 },
        { width: 20 }, { width: 15 }
      ]
      
      // Add title
      dashboardSheet.mergeCells('B2:K2')
      const titleCell = dashboardSheet.getCell('B2')
      titleCell.value = 'LAPORAN ANALITIK SOP DAN IK'
      titleCell.font = { name: 'Arial', size: 24, bold: true, color: { argb: 'FF1e3a5f' } }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      
      // Add subtitle
      dashboardSheet.mergeCells('B3:K3')
      const subtitleCell = dashboardSheet.getCell('B3')
      subtitleCell.value = 'Direktorat Kesiapsiagaan - BASARNAS'
      subtitleCell.font = { name: 'Arial', size: 14, color: { argb: 'FFf97316' } }
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      
      // Add date
      dashboardSheet.mergeCells('B4:K4')
      const dateCell = dashboardSheet.getCell('B4')
      const currentDate = new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      })
      dateCell.value = `Tanggal: ${currentDate}`
      dateCell.font = { name: 'Arial', size: 10, color: { argb: 'FF64748b' } }
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' }
      
      // === Stats Cards Section ===
      const statsData = [
        { label: 'Total SOP', value: stats.totalSop, color: COLORS.orange, icon: '📋' },
        { label: 'Total IK', value: stats.totalIk, color: COLORS.yellow, icon: '📝' },
        { label: 'Total Preview', value: stats.totalPreviews, color: COLORS.cyan, icon: '👁️' },
        { label: 'Total Download', value: stats.totalDownloads, color: COLORS.purple, icon: '⬇️' },
        { label: 'Aktif', value: stats.totalAktif, color: COLORS.green, icon: '✅' },
        { label: 'Review', value: stats.totalReview, color: COLORS.yellow, icon: '⏳' },
        { label: 'Kadaluarsa', value: stats.totalKadaluarsa, color: COLORS.red, icon: '❌' },
        { label: 'Pengajuan Menunggu', value: stats.totalPublikMenunggu, color: COLORS.blue, icon: '📨' }
      ]
      
      // Stats cards row
      let row = 7
      statsData.forEach((stat, index) => {
        const col = (index % 4) * 3 + 2
        if (index > 0 && index % 4 === 0) row += 4
        
        // Card background
        const startCol = String.fromCharCode(64 + col)
        const endCol = String.fromCharCode(64 + col + 1)
        
        dashboardSheet.mergeCells(`${startCol}${row}:${endCol}${row + 2}`)
        const cardCell = dashboardSheet.getCell(`${startCol}${row}`)
        cardCell.value = `${stat.icon} ${stat.label}\n${stat.value}`
        cardCell.font = { name: 'Arial', size: 12, bold: false, color: { argb: 'FF1e3a5f' } }
        cardCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFf8fafc' }
        }
        cardCell.border = {
          top: { style: 'medium', color: { argb: stat.color } },
          left: { style: 'medium', color: { argb: stat.color } },
          bottom: { style: 'medium', color: { argb: stat.color } },
          right: { style: 'medium', color: { argb: stat.color } }
        }
        cardCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      })
      
      // === Distribution Tables ===
      row = 16
      
      // Distribution per Tahun
      dashboardSheet.mergeCells(`B${row}:C${row}`)
      dashboardSheet.getCell(`B${row}`).value = '📊 Distribusi per Tahun'
      dashboardSheet.getCell(`B${row}`).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1e3a5f' } }
      row++
      
      // Header
      dashboardSheet.getCell(`B${row}`).value = 'Tahun'
      dashboardSheet.getCell(`C${row}`).value = 'Jumlah'
      dashboardSheet.getCell(`B${row}`).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      dashboardSheet.getCell(`C${row}`).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      dashboardSheet.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } }
      dashboardSheet.getCell(`C${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } }
      row++
      
      stats.byTahun.forEach(item => {
        dashboardSheet.getCell(`B${row}`).value = item.tahun
        dashboardSheet.getCell(`C${row}`).value = item.count
        dashboardSheet.getCell(`B${row}`).border = { bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } } }
        dashboardSheet.getCell(`C${row}`).border = { bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } } }
        row++
      })
      
      // Distribution per Kategori
      const kategoriStartRow = 16
      let kategoriRow = kategoriStartRow
      
      dashboardSheet.mergeCells(`E${kategoriRow}:F${kategoriRow}`)
      dashboardSheet.getCell(`E${kategoriRow}`).value = '📁 Distribusi per Kategori'
      dashboardSheet.getCell(`E${kategoriRow}`).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1e3a5f' } }
      kategoriRow++
      
      dashboardSheet.getCell(`E${kategoriRow}`).value = 'Kategori'
      dashboardSheet.getCell(`F${kategoriRow}`).value = 'Jumlah'
      dashboardSheet.getCell(`E${kategoriRow}`).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      dashboardSheet.getCell(`F${kategoriRow}`).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      dashboardSheet.getCell(`E${kategoriRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } }
      dashboardSheet.getCell(`F${kategoriRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } }
      kategoriRow++
      
      stats.byKategori.forEach(item => {
        dashboardSheet.getCell(`E${kategoriRow}`).value = item.kategori
        dashboardSheet.getCell(`F${kategoriRow}`).value = item.count
        dashboardSheet.getCell(`E${kategoriRow}`).border = { bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } } }
        dashboardSheet.getCell(`F${kategoriRow}`).border = { bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } } }
        kategoriRow++
      })
      
      // Distribution per Jenis
      const jenisCol = 'H'
      let jenisRow = 16
      
      dashboardSheet.mergeCells(`${jenisCol}${jenisRow}:I${jenisRow}`)
      dashboardSheet.getCell(`${jenisCol}${jenisRow}`).value = '📄 Distribusi per Jenis'
      dashboardSheet.getCell(`${jenisCol}${jenisRow}`).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1e3a5f' } }
      jenisRow++
      
      dashboardSheet.getCell(`${jenisCol}${jenisRow}`).value = 'Jenis'
      dashboardSheet.getCell(`I${jenisRow}`).value = 'Jumlah'
      dashboardSheet.getCell(`${jenisCol}${jenisRow}`).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      dashboardSheet.getCell(`I${jenisRow}`).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      dashboardSheet.getCell(`${jenisCol}${jenisRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } }
      dashboardSheet.getCell(`I${jenisRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } }
      jenisRow++
      
      stats.byJenis.forEach(item => {
        dashboardSheet.getCell(`${jenisCol}${jenisRow}`).value = item.jenis
        dashboardSheet.getCell(`I${jenisRow}`).value = item.count
        dashboardSheet.getCell(`${jenisCol}${jenisRow}`).border = { bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } } }
        dashboardSheet.getCell(`I${jenisRow}`).border = { bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } } }
        jenisRow++
      })
      
      // Distribution per Status
      const statusCol = 'K'
      let statusRow = 16
      
      dashboardSheet.mergeCells(`${statusCol}${statusRow}:L${statusRow}`)
      dashboardSheet.getCell(`${statusCol}${statusRow}`).value = '📌 Distribusi per Status'
      dashboardSheet.getCell(`${statusCol}${statusRow}`).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1e3a5f' } }
      statusRow++
      
      dashboardSheet.getCell(`${statusCol}${statusRow}`).value = 'Status'
      dashboardSheet.getCell(`L${statusRow}`).value = 'Jumlah'
      dashboardSheet.getCell(`${statusCol}${statusRow}`).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      dashboardSheet.getCell(`L${statusRow}`).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      dashboardSheet.getCell(`${statusCol}${statusRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } }
      dashboardSheet.getCell(`L${statusRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } }
      statusRow++
      
      const statusColors: Record<string, string> = {
        'AKTIF': COLORS.green,
        'REVIEW': COLORS.yellow,
        'KADALUARSA': COLORS.red
      }
      
      stats.byStatus.forEach(item => {
        dashboardSheet.getCell(`${statusCol}${statusRow}`).value = item.status
        dashboardSheet.getCell(`L${statusRow}`).value = item.count
        dashboardSheet.getCell(`${statusCol}${statusRow}`).font = { bold: true, color: { argb: statusColors[item.status] || COLORS.slate } }
        dashboardSheet.getCell(`${statusCol}${statusRow}`).border = { bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } } }
        dashboardSheet.getCell(`L${statusRow}`).border = { bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } } }
        statusRow++
      })
      
      // === SHEET 2: Data SOP ===
      const dataSheet = workbook.addWorksheet('Data SOP', {
        views: [{ showGridLines: false }]
      })
      
      // Set columns
      dataSheet.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Judul', key: 'judul', width: 50 },
        { header: 'Tahun', key: 'tahun', width: 10 },
        { header: 'Kategori', key: 'kategori', width: 12 },
        { header: 'Jenis', key: 'jenis', width: 10 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Preview', key: 'preview', width: 10 },
        { header: 'Download', key: 'download', width: 10 },
        { header: 'Diupload Oleh', key: 'uploadedBy', width: 20 },
        { header: 'Tanggal Upload', key: 'uploadedAt', width: 18 }
      ]
      
      // Header row styling
      const headerRow = dataSheet.getRow(1)
      headerRow.height = 30
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.orange }
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'medium', color: { argb: COLORS.orange } },
          left: { style: 'medium', color: { argb: COLORS.orange } },
          bottom: { style: 'medium', color: { argb: COLORS.orange } },
          right: { style: 'medium', color: { argb: COLORS.orange } }
        }
      })
      
      // Data rows
      data.forEach((item, index) => {
        const dataRow = dataSheet.addRow({
          no: index + 1,
          judul: item.judul,
          tahun: item.tahun,
          kategori: item.kategori,
          jenis: item.jenis,
          status: item.status,
          preview: item.previewCount || 0,
          download: item.downloadCount || 0,
          uploadedBy: item.uploadedBy,
          uploadedAt: new Date(item.uploadedAt).toLocaleDateString('id-ID')
        })
        
        dataRow.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 10 }
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 ? 'left' : 'center' }
          
          // Status column color
          if (colNumber === 6) {
            const statusColor = statusColors[item.status]
            if (statusColor) {
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: statusColor } }
            }
          }
          
          // Alternate row coloring
          if (index % 2 === 1) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFf8fafc' }
            }
          }
        })
      })
      
      // === SHEET 3: Ringkasan ===
      const summarySheet = workbook.addWorksheet('Ringkasan', {
        views: [{ showGridLines: false }]
      })
      
      summarySheet.columns = [
        { width: 30 }, { width: 20 }
      ]
      
      // Title
      summarySheet.mergeCells('A1:B1')
      summarySheet.getCell('A1').value = 'RINGKASAN STATISTIK'
      summarySheet.getCell('A1').font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF1e3a5f' } }
      
      // Stats
      const summaryData = [
        ['', ''],
        ['Statistik Utama', ''],
        ['Total SOP', stats.totalSop],
        ['Total IK', stats.totalIk],
        ['Total Dokumen Aktif', stats.totalAktif],
        ['Total Dokumen Review', stats.totalReview],
        ['Total Dokumen Kadaluarsa', stats.totalKadaluarsa],
        ['Total Pengajuan Publik Menunggu', stats.totalPublikMenunggu],
        ['Total Pengajuan Publik Ditolak', stats.totalPublikDitolak],
        ['Total Preview', stats.totalPreviews],
        ['Total Download', stats.totalDownloads],
        ['', ''],
        ['Diekspor pada', currentDate],
        ['Katalog SOP dan IK - Direktorat Kesiapsiagaan - BASARNAS', '']
      ]
      
      summaryData.forEach((row, index) => {
        const rowNum = index + 2
        summarySheet.getCell(`A${rowNum}`).value = row[0]
        summarySheet.getCell(`B${rowNum}`).value = row[1]
        
        if (row[0] === 'Statistik Utama') {
          summarySheet.getCell(`A${rowNum}`).font = { name: 'Arial', size: 12, bold: true, color: { argb: COLORS.orange } }
        } else if (row[0] && row[1] !== '') {
          summarySheet.getCell(`A${rowNum}`).font = { name: 'Arial', size: 10 }
          summarySheet.getCell(`B${rowNum}`).font = { name: 'Arial', size: 10, bold: true }
        }
      })
      
      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer()
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="laporan-sop-ik-basarnas-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      })
    }
    
    // For PDF, return the data and let the client handle it
    return NextResponse.json({ data, stats, format })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
