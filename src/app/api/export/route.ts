import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs'

const C = {
  orange: 'FFf97316', orangeLight: 'FFfed7aa',
  yellow: 'FFeab308', yellowLight: 'FFfef9c3',
  green: 'FF22c55e', greenLight: 'FFdcfce7',
  red: 'FFef4444', redLight: 'FFfee2e2',
  blue: 'FF3b82f6', blueLight: 'FFdbeafe',
  cyan: 'FF06b6d4', cyanLight: 'FFcffafe',
  purple: 'FF8b5cf6', purpleLight: 'FFede9fe',
  darkBlue: 'FF1e3a5f',
  slate: 'FF64748b',
  white: 'FFFFFFFF',
  lightGray: 'FFf8fafc',
  midGray: 'FFe2e8f0',
}

function styleHdr(row: ExcelJS.Row, bg = C.orange) {
  row.height = 24
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: C.white }, name: 'Arial', size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
    cell.border = { bottom: { style: 'thin', color: { argb: C.midGray } } }
  })
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { id: userId } })
    if (user?.role !== 'ADMIN' && user?.role !== 'DEVELOPER' && user?.role !== 'STAF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'xlsx'

    const whereBase: any = { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] }
    const sopFiles = await db.sopFile.findMany({
      where: whereBase,
      include: { user: { select: { name: true } } },
      orderBy: { uploadedAt: 'desc' }
    })

    const sc = async (w: any) => { try { return await db.sopFile.count({ where: w }) } catch { return 0 } }
    const sa = async (w: any, f: string) => { try { const r = await db.sopFile.aggregate({ where: w, _sum: { [f]: true } }); return (r as any)._sum[f] || 0 } catch { return 0 } }
    const sg = async (by: string[], w: any) => { try { return await (db.sopFile.groupBy as any)({ by, where: w, _count: { [by[0]]: true } }) } catch { return [] } }

    const [totalSop, totalIk, totalAktif, totalReview, totalKadaluarsa, previews, downloads,
      byTahunRaw, byKategoriRaw, byJenisRaw, byStatusRaw, byLingkupRaw, totalMenunggu, totalDitolak
    ] = await Promise.all([
      sc({ ...whereBase, jenis: 'SOP' }), sc({ ...whereBase, jenis: 'IK' }),
      sc({ ...whereBase, status: 'AKTIF' }), sc({ ...whereBase, status: 'REVIEW' }),
      sc({ ...whereBase, status: 'KADALUARSA' }),
      sa(whereBase, 'previewCount'), sa(whereBase, 'downloadCount'),
      sg(['tahun'], whereBase), sg(['kategori'], whereBase), sg(['jenis'], whereBase),
      sg(['status'], whereBase), sg(['lingkup'], whereBase),
      sc({ isPublicSubmission: true, verificationStatus: 'MENUNGGU' }),
      sc({ isPublicSubmission: true, verificationStatus: 'DITOLAK' })
    ])

    const stats = {
      totalSop, totalIk, totalAktif, totalReview, totalKadaluarsa,
      totalPreviews: previews, totalDownloads: downloads,
      totalPublikMenunggu: totalMenunggu, totalPublikDitolak: totalDitolak,
      byTahun: (byTahunRaw as any[]).map(x => ({ label: String(x.tahun), count: x._count?.tahun || 0 })),
      byKategori: (byKategoriRaw as any[]).map(x => ({ label: x.kategori, count: x._count?.kategori || 0 })),
      byJenis: (byJenisRaw as any[]).map(x => ({ label: x.jenis, count: x._count?.jenis || 0 })),
      byStatus: (byStatusRaw as any[]).map(x => ({ label: x.status, count: x._count?.status || 0 })),
      byLingkup: (byLingkupRaw as any[]).map(x => ({ label: x.lingkup || 'N/A', count: x._count?.lingkup || 0 }))
    }

    if (format === 'json') return NextResponse.json({ data: sopFiles, stats })

    if (format !== 'xlsx') {
      const data = sopFiles.map(sop => ({
        id: sop.id, judul: sop.judul, tahun: sop.tahun, kategori: sop.kategori, jenis: sop.jenis,
        lingkup: (sop as any).lingkup || 'N/A', status: sop.status,
        previewCount: sop.previewCount || 0, downloadCount: sop.downloadCount || 0,
        fileName: sop.fileName, uploadedBy: (sop.user as any)?.name || 'N/A',
        uploadedAt: sop.uploadedAt.toISOString()
      }))
      return NextResponse.json({ data, stats, format })
    }

    // ══════════════════════════════════════════════════════════════
    // BUILD WORKBOOK
    // ══════════════════════════════════════════════════════════════
    const wb = new ExcelJS.Workbook()
    wb.creator = 'BASARNAS – Katalog SOP/IK'
    wb.created = new Date()

    const currentDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    const total = totalSop + totalIk

    // ─────────────────────────────────────────────────────────────
    // SHEET 1 – LAPORAN ANALITIK
    // Layout: 2 columns per card × 4 cards across = 8 data cols
    // Column map (all 1-indexed):
    //   A=1 (logo), B=2 (logo), C=3 (gap),
    //   D-E card1, F-G card2, H-I card3, J-K card4,   (L=gap)
    //   chart left D-H, chart right I-L
    // Simpler: just 12 wide columns so everything has room
    // ─────────────────────────────────────────────────────────────
    const dash = wb.addWorksheet('Laporan Analitik', { views: [{ showGridLines: false }] })

    // Column widths: A narrow logo col, then 4 card pairs, then chart cols
    // A=4, B=22, C=22, D=22, E=22(card row = 4 cols)
    // For chart section: A=4, B=20(label), C=8(count), D-K=bar(8 cols each 3), L=gap
    dash.getColumn('A').width = 4
    dash.getColumn('B').width = 22
    dash.getColumn('C').width = 22
    dash.getColumn('D').width = 22
    dash.getColumn('E').width = 22
    dash.getColumn('F').width = 4  // gap
    dash.getColumn('G').width = 22
    dash.getColumn('H').width = 22
    dash.getColumn('I').width = 22
    dash.getColumn('J').width = 22

    // ── Header ───────────────────────────────────────────────────
    dash.getRow(1).height = 6

    // Logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo-sar.png')
      if (fs.existsSync(logoPath)) {
        const buf = fs.readFileSync(logoPath)
        const imgId = wb.addImage({ buffer: buf as any, extension: 'png' })
        dash.addImage(imgId, { tl: { col: 0, row: 1 } as any, ext: { width: 70, height: 70 } })
      }
    } catch { }

    dash.mergeCells('B2:J2')
    const titleCell = dash.getCell('B2')
    titleCell.value = 'LAPORAN ANALITIK SOP DAN IK'
    titleCell.font = { name: 'Arial', size: 20, bold: true, color: { argb: C.darkBlue } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
    dash.getRow(2).height = 40

    dash.mergeCells('B3:J3')
    const sub = dash.getCell('B3')
    sub.value = 'Direktorat Kesiapsiagaan – BASARNAS'
    sub.font = { name: 'Arial', size: 12, color: { argb: C.orange } }
    sub.alignment = { horizontal: 'center' }
    dash.getRow(3).height = 20

    dash.mergeCells('B4:J4')
    const dateC = dash.getCell('B4')
    dateC.value = currentDate
    dateC.font = { name: 'Arial', size: 9, color: { argb: C.slate } }
    dateC.alignment = { horizontal: 'center' }
    dash.getRow(4).height = 16

    // orange accent bar
    dash.mergeCells('A5:J5')
    dash.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.orange } }
    dash.getRow(5).height = 4

    dash.getRow(6).height = 10

    // ── Stats Cards ───────────────────────────────────────────────
    // 4 cards × 2 rows (8 cards total), each card spans 1 column
    interface Card { label: string; value: number; color: string; lightColor: string; icon: string }
    const cards: Card[] = [
      { label: 'Total SOP', value: totalSop, color: C.orange, lightColor: C.orangeLight, icon: '📋' },
      { label: 'Total IK', value: totalIk, color: C.yellow, lightColor: C.yellowLight, icon: '📝' },
      { label: 'Total Preview', value: previews, color: C.cyan, lightColor: C.cyanLight, icon: '👁️' },
      { label: 'Total Download', value: downloads, color: C.purple, lightColor: C.purpleLight, icon: '⬇️' },
      { label: 'Aktif', value: totalAktif, color: C.green, lightColor: C.greenLight, icon: '✅' },
      { label: 'Review', value: totalReview, color: C.yellow, lightColor: C.yellowLight, icon: '⏳' },
      { label: 'Kadaluarsa', value: totalKadaluarsa, color: C.red, lightColor: C.redLight, icon: '❌' },
      { label: 'Total Lingkup', value: stats.byLingkup.length, color: C.blue, lightColor: C.blueLight, icon: '🌐' },
    ]

    // cards go in columns B, C, D, E (row 7-9) and G, H, I, J (second row 7-9 using col G-J with gap F)
    // Actually simpler: put all 8 cards across 2 rows, 4 per row
    // Row1 (cards 0-3): cols B, C, D, E  → spans row 7,8,9
    // Row2 (cards 4-7): cols G, H, I, J  → offset by gap col F
    // Wait that gives 8 slots in one visual "row". Let's do:
    //   Row 7-9: card0(B), card1(D), card2(F won't work)...
    // Better: 4 cols B C D E for row1, then blank row, 4 cols B C D E for row2
    const cardCols = ['B', 'C', 'D', 'E']
    const cardColsRow2 = ['G', 'H', 'I', 'J']

    const drawCard = (card: Card, col: string, startRow: number) => {
      // Label row
      const lbl = dash.getCell(`${col}${startRow}`)
      lbl.value = `${card.icon}  ${card.label}`
      lbl.font = { name: 'Arial', size: 9, bold: true, color: { argb: C.darkBlue } }
      lbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.white } }
      lbl.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
      lbl.border = {
        top: { style: 'medium', color: { argb: card.color } },
        left: { style: 'thin', color: { argb: card.color } },
        right: { style: 'thin', color: { argb: card.color } },
      }
      dash.getRow(startRow).height = 18

      // Value row
      const val = dash.getCell(`${col}${startRow + 1}`)
      val.value = card.value
      val.font = { name: 'Arial', size: 20, bold: true, color: { argb: card.color } }
      val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.lightColor } }
      val.alignment = { horizontal: 'center', vertical: 'middle' }
      val.border = {
        left: { style: 'thin', color: { argb: card.color } },
        right: { style: 'thin', color: { argb: card.color } },
      }
      dash.getRow(startRow + 1).height = 36

      // Pct row
      const pctVal = total > 0 ? `${((card.value / total) * 100).toFixed(1)}% dari total` : ''
      const pct = dash.getCell(`${col}${startRow + 2}`)
      pct.value = pctVal
      pct.font = { name: 'Arial', size: 8, color: { argb: C.slate } }
      pct.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.lightColor } }
      pct.alignment = { horizontal: 'center', vertical: 'middle' }
      pct.border = {
        bottom: { style: 'medium', color: { argb: card.color } },
        left: { style: 'thin', color: { argb: card.color } },
        right: { style: 'thin', color: { argb: card.color } },
      }
      dash.getRow(startRow + 2).height = 14
    }

    // Draw 4 cards in row 7-9 (B,C,D,E) and 4 cards in same rows (G,H,I,J)
    cardCols.forEach((col, i) => drawCard(cards[i], col, 7))
    cardColsRow2.forEach((col, i) => drawCard(cards[i + 4], col, 7))

    dash.getRow(10).height = 14 // spacer

    // ── Chart Section Title ────────────────────────────────────────
    dash.mergeCells('A11:J11')
    const chartTitle = dash.getCell('A11')
    chartTitle.value = '   📊  Visualisasi Data'
    chartTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: C.darkBlue } }
    chartTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }
    chartTitle.alignment = { vertical: 'middle' }
    dash.getRow(11).height = 26

    dash.getRow(12).height = 6

    // ── Chart helper: draws a horizontal bar table ─────────────────
    // cols: label(colA), count(colB), bars(colC..colC+barWidth-1)
    const drawBarChart = (
      title: string, data: { label: string; count: number }[],
      titleColor: string, barColor: string,
      startRow: number, labelCol: number, countCol: number, barStartCol: number, barWidth: number
    ) => {
      const lc = String.fromCharCode(64 + labelCol)
      const cc = String.fromCharCode(64 + countCol)
      const bs = String.fromCharCode(64 + barStartCol)
      const be = String.fromCharCode(64 + barStartCol + barWidth - 1)
      const maxCount = Math.max(...data.map(x => x.count), 1)

      // Chart title
      dash.mergeCells(`${lc}${startRow}:${be}${startRow}`)
      const tCell = dash.getCell(`${lc}${startRow}`)
      tCell.value = title
      tCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: titleColor } }
      tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }
      tCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      dash.getRow(startRow).height = 22

      // Column headers
      dash.getCell(startRow + 1, labelCol).value = 'Item'
      dash.getCell(startRow + 1, countCol).value = 'Jml'
      dash.getCell(startRow + 1, barStartCol).value = 'Persentase'
        ;[labelCol, countCol, ...Array.from({ length: barWidth }, (_, i) => barStartCol + i)].forEach(c => {
          const cell = dash.getCell(startRow + 1, c)
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: C.white } }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: barColor } }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        })
      dash.getRow(startRow + 1).height = 20

      // Data rows
      data.forEach((item, i) => {
        const r = startRow + 2 + i
        const pct = item.count / maxCount
        const filledBars = Math.round(pct * barWidth)

        const lblCell = dash.getCell(r, labelCol)
        lblCell.value = item.label
        lblCell.font = { name: 'Arial', size: 9, bold: i < 3 }
        lblCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: false }
        if (i % 2 === 0) lblCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }

        const cntCell = dash.getCell(r, countCol)
        cntCell.value = item.count
        cntCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: barColor } }
        cntCell.alignment = { horizontal: 'center', vertical: 'middle' }
        if (i % 2 === 0) cntCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }

        for (let b = 0; b < barWidth; b++) {
          const bc = dash.getCell(r, barStartCol + b)
          const isFilled = b < filledBars
          bc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isFilled ? barColor : (i % 2 === 0 ? 'FFe5e7eb' : C.midGray) } }
          if (b === 0 && isFilled && item.count > 0) {
            bc.value = `${Math.round(pct * 100)}%`
            bc.font = { name: 'Arial', size: 8, color: { argb: C.white } }
            bc.alignment = { horizontal: 'center', vertical: 'middle' }
          }
        }
        dash.getRow(r).height = 16
      })

      return startRow + 2 + data.length
    }

    // Layout: two charts side by side
    // Left charts:  col A(4), B(label 22), C(count 8), D-E(bars, 2 cols wide)
    // But we only have B-J. Let's use:
    //   Left:  B=label(22), C=count, D-E=bars(2 blocks)
    //   gap:   F
    //   Right: G=label(22), H=count, I-J=bars(2 blocks)
    // barWidth in this context = number of CELLS used as bar segments

    // Each bar column is 22 wide (from the column settings), so 2 bar cols = 44 width
    // We'll use barWidth=2 for the bar cells (D,E for left; I,J for right)

    stats.byTahun.sort((a, b) => Number(a.label) - Number(b.label))

    let leftBottom = drawBarChart(
      '📅  Distribusi per Tahun',
      stats.byTahun, C.orange, C.orange,
      13, 2, 3, 4, 2  // startRow=13, label=B(2), count=C(3), bars: D(4) E(5), width=2
    )

    let rightBottom = drawBarChart(
      '📁  Distribusi per Kategori',
      stats.byKategori, C.blue, C.blue,
      13, 7, 8, 9, 2  // label=G(7), count=H(8), bars: I(9) J(10), width=2
    )

    const nextRow = Math.max(leftBottom, rightBottom) + 2

    leftBottom = drawBarChart(
      '📌  Distribusi per Status',
      stats.byStatus, C.green, C.green,
      nextRow, 2, 3, 4, 2
    )

    rightBottom = drawBarChart(
      '🌐  Distribusi per Lingkup',
      stats.byLingkup, C.purple, C.purple,
      nextRow, 7, 8, 9, 2
    )

    // Footer
    const footerRow = Math.max(leftBottom, rightBottom) + 2
    dash.mergeCells(`A${footerRow}:J${footerRow}`)
    const footer = dash.getCell(`A${footerRow}`)
    footer.value = `Laporan digenerate otomatis pada ${currentDate} – Katalog SOP/IK Direktorat Kesiapsiagaan BASARNAS`
    footer.font = { name: 'Arial', size: 8, italic: true, color: { argb: C.slate } }
    footer.alignment = { horizontal: 'center' }
    footer.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }
    dash.getRow(footerRow).height = 16

    // ─────────────────────────────────────────────────────────────
    // SHEET 2 – DATA SOP
    // ─────────────────────────────────────────────────────────────
    const s2 = wb.addWorksheet('Data SOP', {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
    })
    s2.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Judul', key: 'judul', width: 52 },
      { header: 'Tahun', key: 'tahun', width: 8 },
      { header: 'Kategori', key: 'kategori', width: 20 },
      { header: 'Jenis', key: 'jenis', width: 8 },
      { header: 'Lingkup', key: 'lingkup', width: 18 },
      { header: 'Status', key: 'status', width: 13 },
      { header: 'Preview', key: 'preview', width: 10 },
      { header: 'Download', key: 'download', width: 10 },
      { header: 'Diupload Oleh', key: 'uploadedBy', width: 25 },
      { header: 'Tanggal Upload', key: 'uploadedAt', width: 18 },
    ]
    styleHdr(s2.getRow(1))

    const statusColorMap: Record<string, string> = {
      AKTIF: C.green, REVIEW: C.yellow, KADALUARSA: C.red
    }

    sopFiles.forEach((sop, i) => {
      const r = s2.addRow({
        no: i + 1, judul: sop.judul, tahun: sop.tahun, kategori: sop.kategori, jenis: sop.jenis,
        lingkup: (sop as any).lingkup || 'N/A', status: sop.status,
        preview: sop.previewCount || 0, download: sop.downloadCount || 0,
        uploadedBy: (sop.user as any)?.name || 'N/A',
        uploadedAt: sop.uploadedAt.toLocaleDateString('id-ID')
      })
      r.height = 18
      r.eachCell((cell, col) => {
        cell.font = { name: 'Arial', size: 10 }
        cell.alignment = { vertical: 'middle', horizontal: col === 2 ? 'left' : 'center', wrapText: false }
        if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }
      })
      const sc2 = r.getCell(7)
      const clr = statusColorMap[sop.status] || C.slate
      sc2.font = { name: 'Arial', size: 10, bold: true, color: { argb: clr } }
    })

    // ─────────────────────────────────────────────────────────────
    // SHEET 3 – RINGKASAN
    // ─────────────────────────────────────────────────────────────
    const s3 = wb.addWorksheet('Ringkasan')
    s3.columns = [
      { header: '', key: 'a', width: 32 },
      { header: '', key: 'b', width: 16 }
    ]

    const addTitle3 = (ws: ExcelJS.Worksheet, text: string) => {
      ws.addRow([])
      const r = ws.addRow([text])
      r.getCell(1).font = { name: 'Arial', size: 12, bold: true, color: { argb: C.darkBlue } }
      r.height = 20
    }

    s3.addRow(['LAPORAN ANALITIK SOP DAN IK – BASARNAS']).getCell(1).font = { name: 'Arial', size: 15, bold: true, color: { argb: C.darkBlue } }
    s3.getRow(1).height = 26
    s3.addRow([`Direktorat Kesiapsiagaan`]).getCell(1).font = { name: 'Arial', size: 11, color: { argb: C.orange } }
    s3.addRow([currentDate]).getCell(1).font = { name: 'Arial', size: 9, color: { argb: C.slate } }

    addTitle3(s3, 'Statistik Utama')
    styleHdr(s3.addRow(['Statistik', 'Jumlah']))
      ;[
        ['Total SOP', totalSop], ['Total IK', totalIk],
        ['Dokumen Aktif', totalAktif], ['Dokumen Review', totalReview],
        ['Dokumen Kadaluarsa', totalKadaluarsa],
        ['Total Preview', previews], ['Total Download', downloads],
        ['Pengajuan Publik Menunggu', totalMenunggu],
        ['Pengajuan Publik Ditolak', totalDitolak]
      ].forEach(([l, v], i) => {
        const r = s3.addRow([l, v])
        r.getCell(1).font = { name: 'Arial', size: 10 }
        r.getCell(2).font = { name: 'Arial', size: 10, bold: true }
        r.getCell(2).alignment = { horizontal: 'center' }
        if (i % 2 === 0) {
          r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }
          r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }
        }
      })

    const addDistrib3 = (ws: ExcelJS.Worksheet, sectionTitle: string, data: { label: string; count: number }[], color: string) => {
      addTitle3(ws, sectionTitle)
      styleHdr(ws.addRow(['Nama', 'Jumlah']), color)
      data.forEach((x, i) => {
        const r = ws.addRow([x.label, x.count])
        r.getCell(1).font = { name: 'Arial', size: 10 }
        r.getCell(2).font = { name: 'Arial', size: 10, bold: true }
        r.getCell(2).alignment = { horizontal: 'center' }
        if (i % 2 === 0) {
          r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }
          r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }
        }
      })
    }

    addDistrib3(s3, 'Distribusi per Tahun', stats.byTahun, C.orange)
    addDistrib3(s3, 'Distribusi per Kategori', stats.byKategori, C.blue)
    addDistrib3(s3, 'Distribusi per Lingkup', stats.byLingkup, C.purple)
    addDistrib3(s3, 'Distribusi per Jenis', stats.byJenis, C.cyan)
    addDistrib3(s3, 'Distribusi per Status', stats.byStatus, C.green)

    // ─── Generate and return ──────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer()
    const filename = `laporan-analitik-basarnas-${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Gagal export', details: String(error) }, { status: 500 })
  }
}
