import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// GET - Export report
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
    
    const sopFiles = await db.sopFile.findMany({
      where: { OR: [{ isPublicSubmission: false }, { verificationStatus: 'DISETUJUI' }] },
      include: {
        user: { select: { name: true } }
      },
      orderBy: { uploadedAt: 'desc' }
    })
    
    const data = sopFiles.map(sop => ({
      nomorSop: sop.nomorSop,
      judul: sop.judul,
      tahun: sop.tahun,
      kategori: sop.kategori,
      jenis: sop.jenis,
      status: sop.status,
      fileName: sop.fileName,
      uploadedBy: sop.user.name,
      uploadedAt: sop.uploadedAt.toISOString()
    }))
    
    if (format === 'json') {
      return NextResponse.json({ data })
    }
    
    // For Excel and PDF, return the data and let the client handle it
    return NextResponse.json({ data, format })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
