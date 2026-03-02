/**
 * Print Check API - Get file info before printing
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID diperlukan' }, { status: 400 })
    }
    
    const sopFile = await db.sopFile.findUnique({
      where: { id: fileId },
      select: { 
        id: true, 
        fileName: true, 
        judul: true, 
        filePath: true 
      }
    })
    
    if (!sopFile) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }
    
    const fileExtension = sopFile.fileName.toLowerCase().split('.').pop() || ''
    
    return NextResponse.json({
      success: true,
      fileType: fileExtension,
      title: sopFile.judul,
      fileName: sopFile.fileName,
      hasFile: !!sopFile.filePath
    })
    
  } catch (error) {
    console.error('Print check error:', error)
    return NextResponse.json({
      error: 'Gagal memeriksa file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
