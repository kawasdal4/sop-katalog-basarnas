import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// GET - Fetch all logs with pagination
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({ where: { id: userId } })
    
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const aktivitas = searchParams.get('aktivitas') || ''
    
    const where: Record<string, unknown> = {}
    if (aktivitas) where.aktivitas = aktivitas
    
    const total = await db.log.count({ where })
    
    const logs = await db.log.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        sopFile: { select: { nomorSop: true, judul: true } }
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
    const userId = cookieStore.get('session')?.value
    
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
