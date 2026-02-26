import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// GET - Fetch dashboard statistics
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Start with basic counts
    const stats: Record<string, unknown> = {}
    
    // Total SOP
    try {
      stats.totalSop = await db.sopFile.count({
        where: { jenis: 'SOP', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] }
      })
    } catch (e) {
      stats.totalSop = 0
      stats.totalSopError = e instanceof Error ? e.message : 'Unknown'
    }
    
    // Total IK
    try {
      stats.totalIk = await db.sopFile.count({
        where: { jenis: 'IK', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] }
      })
    } catch (e) {
      stats.totalIk = 0
      stats.totalIkError = e instanceof Error ? e.message : 'Unknown'
    }
    
    // By Status
    try {
      stats.totalAktif = await db.sopFile.count({
        where: { status: 'AKTIF', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] }
      })
    } catch (e) {
      stats.totalAktif = 0
    }
    
    try {
      stats.totalReview = await db.sopFile.count({
        where: { status: 'REVIEW', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] }
      })
    } catch (e) {
      stats.totalReview = 0
    }
    
    try {
      stats.totalKadaluarsa = await db.sopFile.count({
        where: { status: 'KADALUARSA', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] }
      })
    } catch (e) {
      stats.totalKadaluarsa = 0
    }
    
    // Public submissions
    try {
      stats.totalPublikMenunggu = await db.sopFile.count({
        where: { isPublicSubmission: true, verificationStatus: 'MENUNGGU' }
      })
    } catch (e) {
      stats.totalPublikMenunggu = 0
    }
    
    try {
      stats.totalPublikDitolak = await db.sopFile.count({
        where: { isPublicSubmission: true, verificationStatus: 'DITOLAK' }
      })
    } catch (e) {
      stats.totalPublikDitolak = 0
    }
    
    // By Tahun
    try {
      const byTahun = await db.sopFile.groupBy({
        by: ['tahun'],
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        _count: { id: true },
        orderBy: { tahun: 'desc' }
      })
      stats.byTahun = byTahun.map((item: { tahun: number; _count: { id: number } }) => ({ tahun: item.tahun, count: item._count.id }))
    } catch (e) {
      stats.byTahun = []
      stats.byTahunError = e instanceof Error ? e.message : 'Unknown'
    }
    
    // By Kategori
    try {
      const byKategori = await db.sopFile.groupBy({
        by: ['kategori'],
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        _count: { id: true }
      })
      stats.byKategori = byKategori.map((item: { kategori: string; _count: { id: number } }) => ({ kategori: item.kategori, count: item._count.id }))
    } catch (e) {
      stats.byKategori = []
    }
    
    // By Jenis
    try {
      const byJenis = await db.sopFile.groupBy({
        by: ['jenis'],
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        _count: { id: true }
      })
      stats.byJenis = byJenis.map((item: { jenis: string; _count: { id: number } }) => ({ jenis: item.jenis, count: item._count.id }))
    } catch (e) {
      stats.byJenis = []
    }
    
    // By Status
    try {
      const byStatus = await db.sopFile.groupBy({
        by: ['status'],
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        _count: { id: true }
      })
      stats.byStatus = byStatus.map((item: { status: string; _count: { id: number } }) => ({ status: item.status, count: item._count.id }))
    } catch (e) {
      stats.byStatus = []
    }
    
    // Recent uploads
    try {
      stats.recentUploads = await db.sopFile.findMany({
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        include: {
          user: { select: { name: true } }
        },
        orderBy: { uploadedAt: 'desc' },
        take: 5
      })
    } catch (e) {
      stats.recentUploads = []
      stats.recentUploadsError = e instanceof Error ? e.message : 'Unknown'
    }
    
    // Recent logs - without sopFile relation first
    try {
      stats.recentLogs = await db.log.findMany({
        include: {
          user: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    } catch (e) {
      stats.recentLogs = []
      stats.recentLogsError = e instanceof Error ? e.message : 'Unknown'
    }
    
    // Recent Activity
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const recentActivity = await db.log.groupBy({
        by: ['aktivitas'],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { id: true }
      })
      stats.recentActivity = recentActivity.map((item: { aktivitas: string; _count: { id: number } }) => ({ aktivitas: item.aktivitas, count: item._count.id }))
    } catch (e) {
      stats.recentActivity = []
    }
    
    // Analytics - preview/download counts
    stats.totalPreviews = 0
    stats.totalDownloads = 0
    stats.topViewed = []
    stats.topDownloaded = []
    
    // Try to get preview/download stats
    try {
      const previewAgg = await db.sopFile.aggregate({
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        _sum: { previewCount: true }
      })
      stats.totalPreviews = previewAgg._sum.previewCount || 0
    } catch {
      // previewCount field doesn't exist
    }
    
    try {
      const downloadAgg = await db.sopFile.aggregate({
        where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
        _sum: { downloadCount: true }
      })
      stats.totalDownloads = downloadAgg._sum.downloadCount || 0
    } catch {
      // downloadCount field doesn't exist
    }
    
    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
