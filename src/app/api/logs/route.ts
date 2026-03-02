import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// GET - Fetch all logs with pagination and filters
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const aktivitas = searchParams.get('aktivitas') || ''
    const filterUserId = searchParams.get('userId') || ''
    const timeFilter = searchParams.get('timeFilter') || ''
    
    const where: Record<string, unknown> = {}
    if (aktivitas) where.aktivitas = aktivitas
    if (filterUserId) where.userId = filterUserId
    
    // Time filter
    if (timeFilter) {
      const now = new Date()
      let startDate: Date
      
      switch (timeFilter) {
        case 'HARI_INI':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
          break
        case 'MINGGU_INI':
          const dayOfWeek = now.getDay()
          const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
          startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0)
          break
        case 'BULAN_INI':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
          break
        default:
          startDate = new Date(0) // All time
      }
      
      if (timeFilter !== 'SEMUA') {
        where.createdAt = { gte: startDate }
      }
    }
    
    const total = await db.log.count({ where })
    
    const logs = await db.log.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        sopFile: { select: { judul: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })
    
    return NextResponse.json({ 
      data: logs, 
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Fetch logs error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// POST - Create log entry (for download, preview actions)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { aktivitas, deskripsi, fileId } = body
    
    const log = await db.log.create({
      data: {
        userId,
        aktivitas,
        deskripsi,
        fileId
      }
    })
    
    return NextResponse.json({ success: true, data: log })
  } catch (error) {
    console.error('Create log error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
