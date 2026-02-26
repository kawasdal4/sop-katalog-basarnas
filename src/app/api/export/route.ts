import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// GET - Export report with full stats
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({ where: { id: userId } })
    
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    
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
      nomorSop: sop.nomorSop,
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
    
    // For Excel and PDF, return the data and let the client handle it
    return NextResponse.json({ data, stats, format })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
