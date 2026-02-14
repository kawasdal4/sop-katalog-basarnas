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
    
    let fileBuffer: Buffer
    let mimeType: string
    
    // Check if Google Drive is configured and file has driveFileId
    const gdModule = await getGoogleDriveModule()
    const driveFileId = (sopFile as unknown as Record<string, unknown>).driveFileId
    
    if (driveFileId && gdModule && gdModule.isGoogleDriveConfigured()) {
      try {
        console.log(`Downloading from Google Drive: ${driveFileId}`)
        const driveFile = await gdModule.downloadFileFromDrive(driveFileId as string)
        fileBuffer = driveFile.buffer
        mimeType = driveFile.mimeType
      } catch (driveError) {
        console.error('Google Drive download failed:', driveError)
        return NextResponse.json({ error: 'Gagal mengunduh dari Google Drive' }, { status: 500 })
      }
    } else {
      // Fallback to local file
      console.log(`Downloading from local storage: ${sopFile.filePath}`)
      const filePath = path.join(process.cwd(), 'uploads', sopFile.filePath)
      fileBuffer = await readFile(filePath)
      mimeType = sopFile.fileType === 'pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
    
    // Create log
    const user = await db.user.findUnique({ where: { id: userId } })
    await db.log.create({
      data: {
        userId,
        aktivitas: 'DOWNLOAD',
        deskripsi: `${user?.name} mengunduh ${sopFile.jenis}: ${sopFile.nomorSop}${driveFileId ? ' [Google Drive]' : ' [Local]'}`,
        fileId: id
      }
    })
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${sopFile.fileName}"`
      }
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
