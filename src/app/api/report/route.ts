import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const userId = cookieStore.get('userId')?.value
        if (!userId) {
            return new NextResponse('<h1>401 Unauthorized</h1>', { status: 401, headers: { 'Content-Type': 'text/html' } })
        }

        const user = await db.user.findUnique({ where: { id: userId } })
        if (!user || !['ADMIN', 'DEVELOPER', 'STAF'].includes(user.role)) {
            return new NextResponse('<h1>403 Forbidden</h1>', { status: 403, headers: { 'Content-Type': 'text/html' } })
        }

        const whereBase: any = { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] }

        const [sopFiles, totalSop, totalIk, totalAktif, totalReview, totalKadaluarsa,
            previewsRaw, downloadsRaw, byTahunRaw, byKategoriRaw, byStatusRaw, byLingkupRaw] = await Promise.all([
                db.sopFile.findMany({ where: whereBase, include: { user: { select: { name: true } } }, orderBy: { uploadedAt: 'desc' } }),
                db.sopFile.count({ where: { ...whereBase, jenis: 'SOP' } }),
                db.sopFile.count({ where: { ...whereBase, jenis: 'IK' } }),
                db.sopFile.count({ where: { ...whereBase, status: 'AKTIF' } }),
                db.sopFile.count({ where: { ...whereBase, status: 'REVIEW' } }),
                db.sopFile.count({ where: { ...whereBase, status: 'KADALUARSA' } }),
                db.sopFile.aggregate({ where: whereBase, _sum: { previewCount: true } }),
                db.sopFile.aggregate({ where: whereBase, _sum: { downloadCount: true } }),
                (db.sopFile.groupBy as any)({ by: ['tahun'], where: whereBase, _count: { tahun: true } }),
                (db.sopFile.groupBy as any)({ by: ['kategori'], where: whereBase, _count: { kategori: true } }),
                (db.sopFile.groupBy as any)({ by: ['status'], where: whereBase, _count: { status: true } }),
                (db.sopFile.groupBy as any)({ by: ['lingkup'], where: whereBase, _count: { lingkup: true } }),
            ])

        const totalPreviews = previewsRaw._sum.previewCount || 0
        const totalDownloads = downloadsRaw._sum.downloadCount || 0

        const byTahun = (byTahunRaw as any[]).map(x => ({ label: String(x.tahun || ''), count: x._count?.tahun || 0 }))
            .sort((a, b) => Number(a.label) - Number(b.label))
        const byKategori = (byKategoriRaw as any[]).map(x => ({ label: x.kategori || '', count: x._count?.kategori || 0 }))
        const byStatus = (byStatusRaw as any[]).map(x => ({ label: x.status || '', count: x._count?.status || 0 }))
        const byLingkup = (byLingkupRaw as any[]).map(x => ({ label: x.lingkup || 'N/A', count: x._count?.lingkup || 0 }))

        const currentDate = new Date().toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })

        const getStatusColor = (s: string) =>
            s === 'AKTIF' ? '#22c55e' : s === 'REVIEW' ? '#eab308' : s === 'KADALUARSA' ? '#ef4444' : '#6b7280'

        const makeDistTable = (title: string, items: { label: string; count: number }[], color = '#f97316') => `
      <div class="dist-table">
        <h4 style="color:${color};">${title}</h4>
        <table>
          <thead><tr><th style="background:${color}">Item</th><th style="background:${color}">Jml</th><th style="background:${color}">%</th></tr></thead>
          <tbody>
            ${items.map(x => {
            const max = Math.max(...items.map(i => i.count), 1)
            const pct = Math.round((x.count / max) * 100)
            return `<tr>
                <td>${x.label}</td>
                <td class="num">${x.count}</td>
                <td>
                  <div class="bar-bg"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
                  <span class="pct-label">${pct}%</span>
                </td>
              </tr>`
        }).join('')}
          </tbody>
        </table>
      </div>`

        const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Laporan Analitik SOP/IK – BASARNAS</title>
  <style>
    @page { size: A4 landscape; margin: 12mm 14mm; }
    *  { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
    body { font-family:'Segoe UI',Arial,sans-serif; background:#f8fafc; color:#1e293b; font-size:11px; padding:28px; }

    /* ── Header ── */
    .header { text-align:center; margin-bottom:24px; padding-bottom:16px; border-bottom:4px solid #f97316; }
    .logo-row { display:flex; align-items:center; justify-content:center; gap:14px; margin-bottom:10px; }
    .logo-row img { width:56px; height:56px; object-fit:contain; }
    h1 { color:#1e3a5f; font-size:22px; font-weight:800; letter-spacing:.5px; }
    .subtitle { color:#f97316; font-size:13px; font-weight:600; margin-top:3px; }
    .date-info { color:#64748b; font-size:10px; margin-top:6px; }

    /* ── Stats Grid ── */
    .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
    .stat-card { background:white; border-radius:10px; padding:14px 16px; display:flex; align-items:center; gap:12px; border-left:4px solid; box-shadow:0 1px 4px rgba(0,0,0,.06); }
    .stat-icon { font-size:22px; }
    .stat-value { font-size:26px; font-weight:800; line-height:1; }
    .stat-label { font-size:10px; color:#64748b; font-weight:600; margin-top:3px; text-transform:uppercase; letter-spacing:.4px; }
    .c-orange { border-color:#f97316; } .c-orange .stat-value { color:#f97316; }
    .c-yellow  { border-color:#eab308; } .c-yellow  .stat-value { color:#eab308; }
    .c-green   { border-color:#22c55e; } .c-green   .stat-value { color:#22c55e; }
    .c-red     { border-color:#ef4444; } .c-red     .stat-value { color:#ef4444; }
    .c-cyan    { border-color:#06b6d4; } .c-cyan    .stat-value { color:#06b6d4; }
    .c-purple  { border-color:#8b5cf6; } .c-purple  .stat-value { color:#8b5cf6; }
    .c-blue    { border-color:#3b82f6; } .c-blue    .stat-value { color:#3b82f6; }

    /* ── Distribution ── */
    .section-title { color:#1e3a5f; font-size:14px; font-weight:800; margin-bottom:12px; padding-bottom:8px; border-bottom:2px solid #e2e8f0; }
    .dist-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
    .dist-table h4 { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }
    .dist-table table { width:100%; border-collapse:collapse; background:white; border-radius:6px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.07); }
    .dist-table th { color:white; font-weight:700; font-size:9px; padding:6px 8px; text-transform:uppercase; }
    .dist-table td { padding:5px 8px; border-bottom:1px solid #f1f5f9; font-size:10px; }
    .dist-table td.num { text-align:center; font-weight:700; }
    .dist-table tr:last-child td { border-bottom:none; }
    .bar-bg { width:100%; background:#e2e8f0; border-radius:3px; height:5px; margin-bottom:2px; }
    .bar-fill { height:5px; border-radius:3px; }
    .pct-label { font-size:8px; color:#64748b; }

    /* ── Main Table ── */
    .data-title { color:#1e3a5f; font-size:14px; font-weight:800; margin-bottom:10px; padding-bottom:8px; border-bottom:2px solid #e2e8f0; }
    table.main { width:100%; border-collapse:collapse; background:white; border-radius:8px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.07); }
    .main th { background:linear-gradient(135deg,#f97316,#ea580c); color:white; font-weight:700; font-size:9px; text-transform:uppercase; padding:8px 10px; letter-spacing:.4px; }
    .main td { border:1px solid #f1f5f9; padding:6px 10px; font-size:10px; }
    .main thead { display:table-header-group; }
    .main tr:nth-child(even) td { background:#f8fafc; }
    .badge { display:inline-block; padding:2px 8px; border-radius:4px; color:white; font-size:9px; font-weight:700; }

    /* ── Footer ── */
    .footer { margin-top:28px; padding-top:14px; border-top:2px solid #e2e8f0; text-align:center; }
    .footer p { font-size:10px; color:#94a3b8; margin:2px 0; }

    /* ── Print ── */
    @media print {
      body   { background:white!important; padding:0!important; }
      .data-section { page-break-before:always; }
      .dist-grid, .stats-grid { page-break-inside:avoid; }
      tbody tr { page-break-inside:avoid; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="logo-row">
      <img src="/logo-sar.png" onerror="this.style.display='none'" />
      <div>
        <h1>LAPORAN ANALITIK SOP DAN IK</h1>
        <div class="subtitle">Direktorat Kesiapsiagaan – BASARNAS</div>
      </div>
    </div>
    <div class="date-info">${currentDate}</div>
  </div>

  <!-- Stats Cards -->
  <div class="stats-grid">
    <div class="stat-card c-orange"><div class="stat-icon">📋</div><div><div class="stat-value">${totalSop}</div><div class="stat-label">Total SOP</div></div></div>
    <div class="stat-card c-yellow"><div class="stat-icon">📝</div><div><div class="stat-value">${totalIk}</div><div class="stat-label">Total IK</div></div></div>
    <div class="stat-card c-cyan"  ><div class="stat-icon">👁️</div><div><div class="stat-value">${totalPreviews}</div><div class="stat-label">Total Preview</div></div></div>
    <div class="stat-card c-purple"><div class="stat-icon">⬇️</div><div><div class="stat-value">${totalDownloads}</div><div class="stat-label">Total Download</div></div></div>
    <div class="stat-card c-green" ><div class="stat-icon">✅</div><div><div class="stat-value">${totalAktif}</div><div class="stat-label">Aktif</div></div></div>
    <div class="stat-card c-yellow"><div class="stat-icon">⏳</div><div><div class="stat-value">${totalReview}</div><div class="stat-label">Review</div></div></div>
    <div class="stat-card c-red"   ><div class="stat-icon">❌</div><div><div class="stat-value">${totalKadaluarsa}</div><div class="stat-label">Kadaluarsa</div></div></div>
    <div class="stat-card c-blue"  ><div class="stat-icon">🌐</div><div><div class="stat-value">${byLingkup.length}</div><div class="stat-label">Total Lingkup</div></div></div>
  </div>

  <!-- Distribution -->
  <div class="section-title">📊 Distribusi Data</div>
  <div class="dist-grid">
    ${makeDistTable('Per Tahun', byTahun, '#f97316')}
    ${makeDistTable('Per Kategori', byKategori, '#3b82f6')}
    ${makeDistTable('Per Lingkup', byLingkup, '#8b5cf6')}
    ${makeDistTable('Per Status', byStatus, '#22c55e')}
  </div>

  <!-- Data Table -->
  <div class="data-section">
    <div class="data-title">📋 Daftar Dokumen (${sopFiles.length} dokumen)</div>
    <table class="main">
      <thead>
        <tr>
          <th>No</th><th>Judul Dokumen</th><th>Tahun</th><th>Kategori</th>
          <th>Jenis</th><th>Lingkup</th><th>Status</th>
          <th>Preview</th><th>Download</th><th>Diupload Oleh</th>
        </tr>
      </thead>
      <tbody>
        ${sopFiles.map((sop, i) => `<tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${sop.judul.length > 65 ? sop.judul.substring(0, 65) + '…' : sop.judul}</td>
          <td style="text-align:center">${sop.tahun}</td>
          <td>${sop.kategori}</td>
          <td style="text-align:center">${sop.jenis}</td>
          <td>${(sop as any).lingkup || 'N/A'}</td>
          <td style="text-align:center"><span class="badge" style="background:${getStatusColor(sop.status)}">${sop.status}</span></td>
          <td style="text-align:center">${sop.previewCount || 0}</td>
          <td style="text-align:center">${sop.downloadCount || 0}</td>
          <td>${(sop.user as any)?.name || 'N/A'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p><strong>Katalog SOP dan IK · Direktorat Kesiapsiagaan · BASARNAS</strong></p>
    <p>Digenerate otomatis pada ${currentDate}</p>
  </div>
</body>
</html>`

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': 'inline',
                'Cache-Control': 'no-store',
            }
        })
    } catch (error) {
        console.error('HTML report error:', error)
        return new NextResponse(`<h1>Error</h1><pre>${error}</pre>`, { status: 500, headers: { 'Content-Type': 'text/html' } })
    }
}
