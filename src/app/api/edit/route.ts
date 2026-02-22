import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

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
    
    const downloadUrl = `${R2_PUBLIC_URL}/${sopFile.filePath}`
    const isExcel = sopFile.fileName.endsWith('.xlsx') || sopFile.fileName.endsWith('.xls')
    
    return NextResponse.json({
      success: true,
      mode: 'local',
      file: {
        id: sopFile.id,
        nomorSop: sopFile.nomorSop,
        judul: sopFile.judul,
        fileName: sopFile.fileName,
        filePath: sopFile.filePath,
        fileType: sopFile.fileType,
      },
      downloadUrl,
      canEdit: isExcel,
      message: 'Download file, edit di Excel lokal, lalu upload ulang file yang sudah diedit.',
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
    
    if (!user || user.role !== 'ADMIN') {
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
    
    // Read file content
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    
    // Determine content type
    let contentType = 'application/octet-stream'
    if (newExt === 'xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else if (newExt === 'xls') {
      contentType = 'application/vnd.ms-excel'
    } else if (newExt === 'pdf') {
      contentType = 'application/pdf'
    }
    
    // Upload to R2 (overwrite existing file)
    console.log(`📤 Replacing file in R2: ${sopFile.filePath} (${fileBuffer.length} bytes)`)
    
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: sopFile.filePath,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: {
        originalFilename: file.name,
        replacedAt: new Date().toISOString(),
        replacedBy: user.name || userId,
      },
    })
    
    await r2Client.send(putCommand)
    console.log(`✅ File replaced successfully: ${sopFile.filePath}`)
    
    // Log activity
    await db.log.create({
      data: {
        userId,
        aktivitas: 'UPDATE_FILE',
        deskripsi: `Updated file: ${sopFile.nomorSop} - ${sopFile.judul} (${file.name})`,
        fileId: sopFile.id,
      },
    })
    
    return NextResponse.json({
      success: true,
      message: `File "${file.name}" berhasil diupload dan menggantikan file lama`,
      file: {
        id: sopFile.id,
        fileName: sopFile.fileName,
        filePath: sopFile.filePath,
        size: fileBuffer.length,
      },
      r2Url: `${R2_PUBLIC_URL}/${sopFile.filePath}`,
    })
    
  } catch (error) {
    console.error('Replace file error:', error)
    return NextResponse.json({
      error: 'Gagal mengupload file',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
