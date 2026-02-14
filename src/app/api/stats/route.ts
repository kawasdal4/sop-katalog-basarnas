import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// GET - Fetch dashboard statistics
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionData = cookieStore.get('session')?.value
    
    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    let session
    try {
      session = JSON.parse(sessionData)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Total SOP
    const totalSop = await db.sopFile.count({
      where: { jenis: 'SOP', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] }
    })
    
    // Total IK
    const totalIk = await db.sopFile.count({
      where: { jenis: 'IK', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] }
    })
    
    // By Status
    const totalAktif = await db.sopFile.count({
      where: { status: 'AKTIF', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] }
    })
    
    const totalReview = await db.sopFile.count({
      where: { status: 'REVIEW', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] }
    })
    
    const totalKadaluarsa = await db.sopFile.count({
      where: { status: 'KADALUARSA', OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] }
    })
    
    // Public submissions
    const totalPublikMenunggu = await db.sopFile.count({
      where: { isPublicSubmission: true, verificationStatus: 'MENUNGGU' }
    })
    
    const totalPublikDitolak = await db.sopFile.count({
      where: { isPublicSubmission: true, verificationStatus: 'DITOLAK' }
    })
    
    // By Tahun
    const byTahun = await db.sopFile.groupBy({
      by: ['tahun'],
      where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
      _count: { id: true },
      orderBy: { tahun: 'desc' }
    })
    
    // By Kategori
    const byKategori = await db.sopFile.groupBy({
      by: ['kategori'],
      where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
      _count: { id: true }
    })
    
    // By Jenis
    const byJenis = await db.sopFile.groupBy({
      by: ['jenis'],
      where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
      _count: { id: true }
    })
    
    // By Status for chart
    const byStatus = await db.sopFile.groupBy({
      by: ['status'],
      where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
      _count: { id: true }
    })
    
    // Recent uploads
    const recentUploads = await db.sopFile.findMany({
      where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
      include: {
        user: { select: { name: true } }
      },
      orderBy: { uploadedAt: 'desc' },
      take: 5
    })
    
    // Recent logs
    const recentLogs = await db.log.findMany({
      include: {
        user: { select: { name: true } },
        sopFile: { select: { nomorSop: true, judul: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    return NextResponse.json({
      totalSop,
      totalIk,
      totalAktif,
      totalReview,
      totalKadaluarsa,
      totalPublikMenunggu,
      totalPublikDitolak,
      byTahun: byTahun.map(item => ({ tahun: item.tahun, count: item._count.id })),
      byKategori: byKategori.map(item => ({ kategori: item.kategori, count: item._count.id })),
      byJenis: byJenis.map(item => ({ jenis: item.jenis, count: item._count.id })),
      byStatus: byStatus.map(item => ({ status: item.status, count: item._count.id })),
      recentUploads,
      recentLogs
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
