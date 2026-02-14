import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// POST - Sync file from desktop app (revision/update)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const fileId = formData.get('fileId') as string
    const token = formData.get('token') as string
    const file = formData.get('file') as File | null
    const revisionNote = formData.get('revisionNote') as string || 'Updated from desktop'

    if (!fileId || !file) {
      return NextResponse.json({ error: 'File ID dan file diperlukan' }, { status: 400 })
    }

    // Verify token (simple validation)
    try {
      const tokenData = JSON.parse(atob(token || ''))
      if (tokenData.fileId !== fileId) {
        return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 })
      }
      // Check token age (max 1 hour)
      if (Date.now() - tokenData.timestamp > 60 * 60 * 1000) {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 })
    }

    // Get existing file record
    const existingFile = await db.sopFile.findUnique({ where: { id: fileId } })
    if (!existingFile) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }

    // Read file content
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Google Drive if configured
    let driveFileId = (existingFile as unknown as Record<string, unknown>).driveFileId as string | null
    
    // Check if OAuth2 is available
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

    if (clientId && clientSecret && refreshToken && folderId) {
      try {
        const gd = await import('@/lib/google-drive')
        
        // If file already exists on Drive, we need to update it
        if (driveFileId) {
          // For now, we'll create a new version (Drive doesn't support true versioning via API easily)
          // In production, you'd use Drive's revision feature
          console.log(`Updating file on Google Drive: ${driveFileId}`)
          
          // Upload new version
          const mimeType = existingFile.fileType === 'pdf' 
            ? 'application/pdf' 
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          
          const result = await gd.uploadFileToDrive(buffer, existingFile.fileName, mimeType)
          
          // Delete old file if new ID is different
          if (result.id !== driveFileId) {
            try {
              await gd.deleteFileFromDrive(driveFileId)
            } catch (e) {
              console.log('Could not delete old file:', e)
            }
            driveFileId = result.id
          }
        } else {
          // Upload new file to Drive
          const mimeType = existingFile.fileType === 'pdf' 
            ? 'application/pdf' 
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          
          const result = await gd.uploadFileToDrive(buffer, existingFile.fileName, mimeType)
          driveFileId = result.id
        }
        
        console.log(`✅ File synced to Google Drive: ${driveFileId}`)
      } catch (driveError) {
        console.error('Google Drive sync error:', driveError)
        // Fallback to local storage
      }
    }

    // Also save locally as backup
    const uploadDir = path.join(process.cwd(), 'uploads')
    await mkdir(uploadDir, { recursive: true })
    const localFilePath = path.join(uploadDir, existingFile.filePath)
    await writeFile(localFilePath, buffer)

    // Update database record
    const updatedFile = await db.sopFile.update({
      where: { id: fileId },
      data: {
        updatedAt: new Date(),
        ...(driveFileId && { driveFileId })
      }
    })

    // Create log
    await db.log.create({
      data: {
        userId: existingFile.uploadedBy,
        aktivitas: 'SYNC_UPDATE',
        deskripsi: `File ${existingFile.nomorSop} diperbarui dari desktop app: ${revisionNote}`,
        fileId: fileId
      }
    })

    return NextResponse.json({
      success: true,
      message: 'File berhasil disinkronkan',
      file: {
        id: updatedFile.id,
        nomorSop: updatedFile.nomorSop,
        updatedAt: updatedFile.updatedAt,
        driveFileId: driveFileId
      }
    })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat sinkronisasi' }, { status: 500 })
  }
}

// GET - Check sync status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ error: 'File ID diperlukan' }, { status: 400 })
    }

    const file = await db.sopFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        nomorSop: true,
        fileName: true,
        updatedAt: true,
        driveFileId: true
      }
    })

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      file: {
        ...file,
        driveFileId: (file as unknown as Record<string, unknown>).driveFileId
      }
    })

  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
