import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Set runtime and max duration for Vercel
export const runtime = 'nodejs'
export const maxDuration = 60

// Check if running in production (Vercel)
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

// Check if Google Drive is available
async function checkGoogleDriveAvailable(): Promise<{ success: boolean; error?: string }> {
  try {
    const gd = await import('@/lib/google-drive')
    if (!gd.isGoogleDriveConfigured()) {
      return { success: false, error: 'Google Drive credentials not configured' }
    }
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// GET - Fetch all SOPs with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const kategori = searchParams.get('kategori') || ''
    const jenis = searchParams.get('jenis') || ''
    const status = searchParams.get('status') || ''
    const tahun = searchParams.get('tahun') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const verificationStatus = searchParams.get('verificationStatus') || ''
    const publicOnly = searchParams.get('publicOnly') === 'true'
    
    const where: Record<string, unknown> = {}
    
    if (search) {
      where.OR = [
        { nomorSop: { contains: search } },
        { judul: { contains: search } }
      ]
    }
    if (kategori) where.kategori = kategori
    if (jenis) where.jenis = jenis
    if (status) where.status = status
    if (tahun) where.tahun = parseInt(tahun)
    
    if (publicOnly) {
      where.isPublicSubmission = true
      if (verificationStatus) {
        where.verificationStatus = verificationStatus
      }
    } else {
      if (!verificationStatus) {
        where.OR = [
          { isPublicSubmission: false },
          { verificationStatus: 'DISETUJUI' }
        ]
      } else {
        where.verificationStatus = verificationStatus
      }
    }
    
    const total = await db.sopFile.count({ where })
    
    const sopFiles = await db.sopFile.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { uploadedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })
    
    return NextResponse.json({ 
      data: sopFiles, 
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Fetch SOP error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// POST - Create new SOP with Google Drive upload
export async function POST(request: NextRequest) {
  console.log('\n========================================')
  console.log('📤 UPLOAD REQUEST')
  console.log(`   Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`)
  console.log('========================================\n')
  
  try {
    const formData = await request.formData()
    const judul = formData.get('judul') as string
    const kategori = formData.get('kategori') as string
    const jenis = formData.get('jenis') as string
    const tahun = parseInt(formData.get('tahun') as string)
    const status = formData.get('status') as string
    const file = formData.get('file') as File | null
    
    const isPublicSubmission = formData.get('isPublicSubmission') === 'true'
    const submitterName = formData.get('submitterName') as string | null
    const submitterEmail = formData.get('submitterEmail') as string | null
    
    console.log('Form data:', { judul, kategori, jenis, tahun, fileName: file?.name })
    
    if (!file) {
      return NextResponse.json({ error: 'File diperlukan' }, { status: 400 })
    }
    
    // Get user ID
    let userId: string
    
    if (isPublicSubmission) {
      let systemUser = await db.user.findUnique({ where: { email: 'system@sop.go.id' } })
      if (!systemUser) {
        systemUser = await db.user.create({
          data: {
            email: 'system@sop.go.id',
            password: 'system',
            name: 'System (Public Submission)',
            role: 'STAF'
          }
        })
      }
      userId = systemUser.id
    } else {
      const cookieStore = await cookies()
      const sessionData = cookieStore.get('session')?.value
      
      if (!sessionData) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      try {
        const session = JSON.parse(sessionData)
        userId = session.id
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    
    // Generate nomor SOP
    const counter = await db.counter.findUnique({ where: { id: 'counter' } })
    const count = jenis === 'SOP' ? (counter?.sopCount || 0) + 1 : (counter?.ikCount || 0) + 1
    const nomorSop = jenis === 'SOP' ? `SOP-${String(count).padStart(4, '0')}` : `IK-${String(count).padStart(4, '0')}`
    
    console.log(`📝 Generated nomor: ${nomorSop}`)
    
    // Prepare file
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const fileName = `${nomorSop}.${fileExtension}`
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // MIME types
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
    }
    const mimeType = mimeTypes[fileExtension] || 'application/octet-stream'
    
    let driveFileId: string | null = null
    let filePath = fileName
    
    // Upload to Google Drive
    const driveCheck = await checkGoogleDriveAvailable()
    
    if (driveCheck.success) {
      try {
        const gd = await import('@/lib/google-drive')
        console.log(`📤 Uploading to Google Drive: ${fileName}`)
        
        const driveResult = await gd.uploadFileToDrive(buffer, fileName, mimeType)
        driveFileId = driveResult.id
        filePath = driveResult.id
        
        console.log(`✅ File uploaded to Google Drive: ${driveFileId}`)
      } catch (driveError) {
        console.error('❌ Google Drive upload failed:', driveError)
        // Fallback to local if not in production
        if (!isProduction) {
          console.log('📁 Falling back to local storage')
          const uploadDir = path.join(process.cwd(), 'uploads')
          await mkdir(uploadDir, { recursive: true })
          const localPath = path.join(uploadDir, fileName)
          await writeFile(localPath, buffer)
        } else {
          return NextResponse.json({ 
            error: 'Gagal mengupload ke Google Drive. Hubungi administrator.' 
          }, { status: 500 })
        }
      }
    } else {
      // Local storage fallback
      if (!isProduction) {
        console.log('📁 Using local storage (Google Drive not configured)')
        const uploadDir = path.join(process.cwd(), 'uploads')
        await mkdir(uploadDir, { recursive: true })
        const localPath = path.join(uploadDir, fileName)
        await writeFile(localPath, buffer)
      } else {
        return NextResponse.json({ 
          error: `Google Drive tidak tersedia: ${driveCheck.error}` 
        }, { status: 500 })
      }
    }
    
    // Create SOP record
    const sopFile = await db.sopFile.create({
      data: {
        nomorSop,
        judul,
        tahun,
        kategori,
        jenis,
        status: status || 'AKTIF',
        fileName: file.name,
        filePath,
        fileType: fileExtension,
        driveFileId,
        uploadedBy: userId,
        isPublicSubmission,
        submitterName,
        submitterEmail,
        verificationStatus: isPublicSubmission ? 'MENUNGGU' : null
      }
    })
    
    // Update counter
    if (jenis === 'SOP') {
      await db.counter.upsert({
        where: { id: 'counter' },
        update: { sopCount: count },
        create: { id: 'counter', sopCount: count, ikCount: 0 }
      })
    } else {
      await db.counter.upsert({
        where: { id: 'counter' },
        update: { ikCount: count },
        create: { id: 'counter', sopCount: 0, ikCount: count }
      })
    }
    
    // Create log
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'UPLOAD',
          deskripsi: `${isPublicSubmission ? 'Submit publik' : 'Upload'} ${jenis}: ${nomorSop} - ${judul}${driveFileId ? ' [Google Drive]' : ' [Local]'}`,
          fileId: sopFile.id
        }
      })
    } catch (logError) {
      console.warn('⚠️ Failed to create log:', logError)
    }
    
    console.log('========================================')
    console.log('✅ UPLOAD SUCCESS')
    console.log(`   ID: ${sopFile.id}`)
    console.log(`   Drive ID: ${driveFileId || 'local'}`)
    console.log('========================================\n')
    
    return NextResponse.json({ 
      success: true, 
      data: sopFile,
      driveFileId 
    })
  } catch (error) {
    console.error('❌ Upload error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat upload', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// PUT - Update SOP status
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionData = cookieStore.get('session')?.value
    
    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    let userId: string
    try {
      const session = JSON.parse(sessionData)
      userId = session.id
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, status, verificationStatus, verifiedBy } = body
    
    const updateData: Record<string, unknown> = {}
    
    if (status) updateData.status = status
    if (verificationStatus) {
      updateData.verificationStatus = verificationStatus
      updateData.verifiedBy = verifiedBy || userId
      updateData.verifiedAt = new Date()
    }
    
    const sopFile = await db.sopFile.update({
      where: { id },
      data: updateData
    })
    
    try {
      const user = await db.user.findUnique({ where: { id: userId } })
      await db.log.create({
        data: {
          userId,
          aktivitas: verificationStatus ? 'VERIFIKASI' : 'EDIT_STATUS',
          deskripsi: `${user?.name} ${verificationStatus ? 'memverifikasi' : 'mengubah status'} ${sopFile.jenis}: ${sopFile.nomorSop}`,
          fileId: id
        }
      })
    } catch (logError) {
      console.warn('⚠️ Failed to create log:', logError)
    }
    
    return NextResponse.json({ success: true, data: sopFile })
  } catch (error) {
    console.error('Update SOP error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// DELETE - Delete SOP
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionData = cookieStore.get('session')?.value
    
    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
    }
    
    // Get file info first
    const sopFile = await db.sopFile.findUnique({ where: { id } })
    
    // Delete from Google Drive if exists
    if (sopFile?.driveFileId) {
      try {
        const gd = await import('@/lib/google-drive')
        await gd.deleteFileFromDrive(sopFile.driveFileId)
        console.log(`🗑️ Deleted from Google Drive: ${sopFile.driveFileId}`)
      } catch (driveError) {
        console.warn('⚠️ Failed to delete from Google Drive:', driveError)
      }
    }
    
    await db.sopFile.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete SOP error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
