import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { readFile } from 'fs/promises'
import path from 'path'

// Dynamic import for Google Drive module
async function getGoogleDriveModule() {
  try {
    return await import('@/lib/google-drive')
  } catch {
    return null
  }
}

// GET - Preview file
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
    
    let fileBuffer: Buffer
    
    // Check if Google Drive is configured and file has driveFileId
    const gdModule = await getGoogleDriveModule()
    const driveFileId = (sopFile as unknown as Record<string, unknown>).driveFileId
    
    if (driveFileId && gdModule && gdModule.isGoogleDriveConfigured()) {
      try {
        console.log(`Preview from Google Drive: ${driveFileId}`)
        const driveFile = await gdModule.downloadFileFromDrive(driveFileId as string)
        fileBuffer = driveFile.buffer
      } catch (driveError) {
        console.error('Google Drive preview failed:', driveError)
        return NextResponse.json({ error: 'Gagal memuat dari Google Drive' }, { status: 500 })
      }
    } else {
      // Fallback to local file
      console.log(`Preview from local storage: ${sopFile.filePath}`)
      const filePath = path.join(process.cwd(), 'uploads', sopFile.filePath)
      fileBuffer = await readFile(filePath)
    }
    
    // Create log
    const user = await db.user.findUnique({ where: { id: userId } })
    await db.log.create({
      data: {
        userId,
        aktivitas: 'PREVIEW',
        deskripsi: `${user?.name} melihat preview ${sopFile.jenis}: ${sopFile.nomorSop}${driveFileId ? ' [Google Drive]' : ' [Local]'}`,
        fileId: id
      }
    })
    
    // For PDF, return the file as base64
    if (sopFile.fileType === 'pdf') {
      const base64 = fileBuffer.toString('base64')
      return NextResponse.json({
        type: 'pdf',
        data: base64,
        fileName: sopFile.fileName
      })
    }
    
    // For Excel, return as base64
    const base64 = fileBuffer.toString('base64')
    return NextResponse.json({
      type: 'excel',
      data: base64,
      fileName: sopFile.fileName
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
