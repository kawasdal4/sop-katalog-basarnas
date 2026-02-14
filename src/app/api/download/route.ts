import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { readFile } from 'fs/promises'
import path from 'path'

// GET - Download file
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
    }
    
    const sopFile = await db.sopFile.findUnique({ where: { id } })
    
    if (!sopFile) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }
    
    const filePath = path.join(process.cwd(), 'uploads', sopFile.filePath)
    const fileBuffer = await readFile(filePath)
    
    // Create log
    const user = await db.user.findUnique({ where: { id: userId } })
    await db.log.create({
      data: {
        userId,
        aktivitas: 'DOWNLOAD',
        deskripsi: `${user?.name} mengunduh ${sopFile.jenis}: ${sopFile.nomorSop}`,
        fileId: id
      }
    })
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': sopFile.fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${sopFile.fileName}"`
      }
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
