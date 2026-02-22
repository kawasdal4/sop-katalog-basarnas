import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// GET - Fetch version history for a document
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const documentId = request.nextUrl.searchParams.get('documentId')
    
    if (!documentId) {
      return NextResponse.json({ error: 'documentId diperlukan' }, { status: 400 })
    }
    
    const versions = await db.documentVersion.findMany({
      where: { documentId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { versionNumber: 'desc' }
    })
    
    return NextResponse.json({
      success: true,
      data: versions
    })
  } catch (error) {
    console.error('Version fetch error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// POST - Create new version
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { documentId, fileName, filePath, driveFileId, fileType, changeNote, pdfPreviewPath, pdfPreviewDriveId } = body
    
    if (!documentId || !fileName) {
      return NextResponse.json({ error: 'documentId dan fileName diperlukan' }, { status: 400 })
    }
    
    // Get current document
    const document = await db.sopFile.findUnique({
      where: { id: documentId }
    })
    
    if (!document) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 })
    }
    
    // Create version record
    const newVersion = await db.documentVersion.create({
      data: {
        documentId,
        versionNumber: document.currentVersion + 1,
        fileName,
        filePath: filePath || document.filePath,
        driveFileId: driveFileId || document.driveFileId,
        fileType: fileType || document.fileType,
        modifiedBy: userId,
        changeNote,
        pdfPreviewPath,
        pdfPreviewDriveId
      }
    })
    
    // Update document current version
    await db.sopFile.update({
      where: { id: documentId },
      data: {
        currentVersion: document.currentVersion + 1,
        fileName,
        filePath: filePath || document.filePath,
        driveFileId: driveFileId || document.driveFileId,
        fileType: fileType || document.fileType,
        pdfPreviewPath,
        pdfPreviewDriveId,
        pdfPreviewGeneratedAt: pdfPreviewPath ? new Date() : null
      }
    })
    
    // Log activity
    await db.log.create({
      data: {
        userId,
        aktivitas: 'VERSION_CREATE',
        deskripsi: `Membuat versi ${newVersion.versionNumber} dari ${document.nomorSop}`,
        fileId: documentId,
        metadata: JSON.stringify({ versionNumber: newVersion.versionNumber })
      }
    })
    
    return NextResponse.json({
      success: true,
      version: newVersion
    })
  } catch (error) {
    console.error('Version create error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
