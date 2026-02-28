import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { uploadToR2, isR2Configured, getR2PublicUrl, getR2PresignedUrl } from '@/lib/r2-storage'

export const dynamic = 'force-dynamic'

// GET - Get file info for editing (returns download URL)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    }
    
    const sopFile = await db.sopFile.findUnique({
      where: { id: fileId },
    })
    
    if (!sopFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json({ 
        error: 'Cloudflare R2 tidak terkonfigurasi. Hubungi administrator.',
        needsSetup: true
      }, { status: 500 })
    }

    // Get presigned URL for download (valid for 1 hour)
    const downloadUrl = await getR2PresignedUrl(sopFile.filePath, 3600)
    const isExcel = sopFile.fileName.endsWith('.xlsx') || sopFile.fileName.endsWith('.xls')
    const isWord = sopFile.fileName.endsWith('.docx') || sopFile.fileName.endsWith('.doc')
    const canEdit = isExcel || isWord
    
    return NextResponse.json({
      success: true,
      mode: 'local',
      file: {
        id: sopFile.id,
        judul: sopFile.judul,
        fileName: sopFile.fileName,
        filePath: sopFile.filePath,
        fileType: sopFile.fileType,
      },
      downloadUrl,
      canEdit,
      message: `Download file, edit di ${isExcel ? 'Excel' : isWord ? 'Word' : 'aplikasi'} lokal, lalu upload ulang file yang sudah diedit.`,
    })
    
  } catch (error) {
    console.error('Edit GET error:', error)
    return NextResponse.json({
      error: 'Failed to get file info',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// POST - Replace file with updated version (upload ulang)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true },
    })
    
    if (!user || user.role !== 'ADMIN' && user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Hanya admin yang dapat mengubah file' }, { status: 403 })
    }
    
    const formData = await request.formData()
    const fileId = formData.get('fileId') as string
    const file = formData.get('file') as File
    
    if (!fileId || !file) {
      return NextResponse.json({ error: 'File ID dan file diperlukan' }, { status: 400 })
    }
    
    const sopFile = await db.sopFile.findUnique({
      where: { id: fileId },
    })
    
    if (!sopFile) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }
    
    // Validate file type
    const originalExt = sopFile.fileName.toLowerCase().split('.').pop()
    const newExt = file.name.toLowerCase().split('.').pop()
    
    if (originalExt !== newExt) {
      return NextResponse.json({ 
        error: `Tipe file harus sama dengan aslinya (.${originalExt})` 
      }, { status: 400 })
    }
    
    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json({ 
        error: 'Cloudflare R2 tidak terkonfigurasi. Hubungi administrator.',
        needsSetup: true
      }, { status: 500 })
    }

    // Read file content
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    
    // Determine content type
    let contentType = 'application/octet-stream'
    if (newExt === 'xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else if (newExt === 'xls') {
      contentType = 'application/vnd.ms-excel'
    } else if (newExt === 'docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    } else if (newExt === 'doc') {
      contentType = 'application/msword'
    } else if (newExt === 'pdf') {
      contentType = 'application/pdf'
    }
    
    // Upload to R2 (overwrite existing file)
    console.log(`📤 Replacing file in R2: ${sopFile.filePath} (${fileBuffer.length} bytes)`)
    
    try {
      await uploadToR2(fileBuffer, sopFile.fileName, contentType, {
        key: sopFile.filePath,
        metadata: {
          originalFilename: file.name,
          replacedAt: new Date().toISOString(),
          replacedBy: user.name || userId,
        }
      })
      console.log(`✅ File replaced successfully: ${sopFile.filePath}`)
    } catch (uploadError) {
      console.error('R2 upload error:', uploadError)
      return NextResponse.json({
        error: 'Gagal mengupload ke R2',
        details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
      }, { status: 500 })
    }

    // Update timestamp
    const now = new Date()
    await db.sopFile.update({
      where: { id: fileId },
      data: { updatedAt: now }
    })
    
    // Log activity
    await db.log.create({
      data: {
        userId,
        aktivitas: 'UPDATE_FILE',
        deskripsi: `Updated file: ${sopFile.judul} (${file.name})`,
        fileId: sopFile.id,
      },
    })
    
    const publicUrl = getR2PublicUrl(sopFile.filePath)
    
    return NextResponse.json({
      success: true,
      message: `File "${file.name}" berhasil diupload dan menggantikan file lama`,
      file: {
        id: sopFile.id,
        judul: sopFile.judul,
        fileName: sopFile.fileName,
        filePath: sopFile.filePath,
        size: fileBuffer.length,
      },
      r2Url: publicUrl,
    })
    
  } catch (error) {
    console.error('Replace file error:', error)
    return NextResponse.json({
      error: 'Gagal mengupload file',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
