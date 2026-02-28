import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { uploadToR2, isR2Configured, deleteFromR2, moveR2Object } from '@/lib/r2-storage'

// Set runtime and max duration for Vercel
export const runtime = 'nodejs'
export const maxDuration = 60

// Check if running in production (Vercel)
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

// MIME types
const MIME_TYPES: Record<string, string> = {
  'pdf': 'application/pdf',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'xls': 'application/vnd.ms-excel',
  'xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'doc': 'application/msword',
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
    const sortBy = searchParams.get('sortBy') || 'uploadedAt-desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const verificationStatus = searchParams.get('verificationStatus') || ''
    const publicOnly = searchParams.get('publicOnly') === 'true'
    
    // Build where clause with proper AND/OR combination
    const whereConditions: unknown[] = []
    
    // Search filter - Case-insensitive search in both judul (Title) and nomorSop (SOP Number)
    // PostgreSQL supports mode: 'insensitive' for case-insensitive search
    if (search) {
      whereConditions.push({
        OR: [
          { judul: { contains: search, mode: 'insensitive' } },
          { nomorSop: { contains: search, mode: 'insensitive' } }
        ]
      })
    }
    
    // Ignore 'SEMUA' filter values
    if (kategori && kategori !== 'SEMUA') {
      whereConditions.push({ kategori })
    }
    if (jenis && jenis !== 'SEMUA') {
      whereConditions.push({ jenis })
    }
    if (status && status !== 'SEMUA') {
      whereConditions.push({ status })
    }
    if (tahun) {
      whereConditions.push({ tahun: parseInt(tahun) })
    }
    
    // Public submission filter
    if (publicOnly) {
      whereConditions.push({ isPublicSubmission: true })
      if (verificationStatus) {
        whereConditions.push({ verificationStatus })
      }
    } else {
      if (!verificationStatus) {
        whereConditions.push({
          OR: [
            { isPublicSubmission: false },
            { verificationStatus: 'DISETUJUI' }
          ]
        })
      } else {
        whereConditions.push({ verificationStatus })
      }
    }
    
    // Combine all conditions with AND
    const where = whereConditions.length > 0 ? { AND: whereConditions } : {}
    
    // Build orderBy based on sortBy parameter
    let orderBy: unknown[] = [{ uploadedAt: 'desc' }]
    switch (sortBy) {
      case 'tahun-asc':
        orderBy = [{ tahun: 'asc' }, { uploadedAt: 'desc' }]
        break
      case 'tahun-desc':
        orderBy = [{ tahun: 'desc' }, { uploadedAt: 'desc' }]
        break
      case 'uploadedAt-asc':
        orderBy = [{ uploadedAt: 'asc' }]
        break
      case 'judul-asc':
        orderBy = [{ judul: 'asc' }]
        break
      case 'judul-desc':
        orderBy = [{ judul: 'desc' }]
        break
    }
    
    const total = await db.sopFile.count({ where })
    
    const sopFiles = await db.sopFile.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy,
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

// POST - Create new SOP with R2 upload (Primary) and Google Drive backup
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
    const keterangan = formData.get('keterangan') as string | null
    
    console.log('Form data:', { judul, kategori, jenis, tahun, fileName: file?.name, fileSize: file?.size })
    
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
      const userIdCookie = cookieStore.get('userId')?.value

      if (!userIdCookie) {
        return NextResponse.json({ error: 'Unauthorized - no session' }, { status: 401 })
      }

      userId = userIdCookie
      console.log(`🔑 Session user ID: ${userId}`)

      // Verify user exists in database
      const userExists = await db.user.findUnique({ where: { id: userId } })
      if (!userExists) {
        console.error(`❌ User not found: ${userId}`)
        return NextResponse.json({ error: 'User tidak valid. Silakan login ulang.' }, { status: 401 })
      }
      console.log(`✅ User verified: ${userExists.email}`)
    }

    // Prepare file
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const sanitizeFileName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)
    const fileName = `${sanitizeFileName(judul)}.${fileExtension}`

    console.log(`📄 Processing file: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const mimeType = MIME_TYPES[fileExtension] || 'application/octet-stream'
    
    let r2Key: string | null = null
    let filePath = fileName
    
    // ============================================
    // STEP 1: Upload to R2 (PRIMARY STORAGE)
    // ============================================
    if (!isR2Configured()) {
      // Local storage fallback (development only)
      if (!isProduction) {
        console.log('📁 Using local storage (R2 not configured)')
        const uploadDir = path.join(process.cwd(), 'uploads')
        await mkdir(uploadDir, { recursive: true })
        const localPath = path.join(uploadDir, fileName)
        await writeFile(localPath, buffer)
      } else {
        return NextResponse.json({ 
          error: 'Cloudflare R2 tidak terkonfigurasi. Hubungi administrator.' 
        }, { status: 500 })
      }
    } else {
      try {
        console.log(`📤 Uploading to R2 (Primary): ${fileName}`)
        
        const r2Result = await uploadToR2(buffer, fileName, mimeType, { 
          folder: 'sop-files' 
        })
        r2Key = r2Result.key
        filePath = r2Result.key
        
        console.log(`✅ File uploaded to R2: ${r2Key}`)
      } catch (r2Error) {
        console.error('❌ R2 upload failed:', r2Error)
        return NextResponse.json({ 
          error: 'Gagal mengupload ke Cloudflare R2. Silakan coba lagi.',
          details: r2Error instanceof Error ? r2Error.message : 'Unknown error'
        }, { status: 500 })
      }
    }
    
    // Create SOP record
    let sopFile
    try {
      sopFile = await db.sopFile.create({
        data: {
          judul,
          tahun,
          kategori,
          jenis,
          status: status || 'AKTIF',
          fileName,
          filePath,
          fileType: fileExtension,
          driveFileId: null, // Will be set by background backup
          uploadedBy: userId,
          isPublicSubmission,
          submitterName,
          submitterEmail,
          keterangan,
          verificationStatus: isPublicSubmission ? 'MENUNGGU' : null
        }
      })
    } catch (dbError: unknown) {
      console.error('❌ Database error:', dbError)
      const prismaError = dbError as { code?: string; meta?: { target?: string[] } }
      if (prismaError.code === 'P2002') {
        return NextResponse.json({
          error: `Dokumen dengan judul serupa sudah ada. Gunakan judul berbeda.`,
          code: prismaError.code
        }, { status: 400 })
      }
      return NextResponse.json({
        error: 'Gagal menyimpan ke database',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 })
    }

    // Create FileSync record
    if (r2Key) {
      try {
        await db.fileSync.create({
          data: {
            filename: fileName,
            mimeType,
            fileSize: buffer.length,
            r2Key,
            source: 'r2',
            syncStatus: 'synced',
            r2ModifiedAt: new Date(),
          }
        })
      } catch (syncError) {
        console.warn('⚠️ Failed to create FileSync record:', syncError)
      }
    }
    
    // Create log
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'UPLOAD',
          deskripsi: `${isPublicSubmission ? 'Submit publik' : 'Upload'} ${jenis}: ${judul} [R2 Primary]`,
          fileId: sopFile.id
        }
      })
    } catch (logError) {
      console.warn('⚠️ Failed to create log:', logError)
    }

    // ============================================
    // STEP 2: BACKGROUND Backup to Google Drive
    // (Async, no await - user gets response immediately)
    // ============================================
    import('@/lib/google-drive').then(async (gd) => {
      if (gd.isGoogleDriveConfigured() && r2Key) {
        try {
          console.log(`📤 [Background] Starting backup to Google Drive: ${fileName}`)

          const driveResult = await gd.uploadFileToDriveFolder(buffer, fileName, mimeType)

          // Update SOP record with driveFileId
          await db.sopFile.update({
            where: { id: sopFile.id },
            data: { driveFileId: driveResult.id }
          })

          // Update FileSync record
          await db.fileSync.updateMany({
            where: { r2Key },
            data: {
              driveFileId: driveResult.id,
              source: 'both',
              syncStatus: 'synced',
              driveModifiedAt: new Date(),
              lastSyncedAt: new Date(),
            }
          })

          console.log(`✅ [Background] Backup to Google Drive completed: ${driveResult.id}`)

        } catch (backupError) {
          console.warn('⚠️ [Background] Backup to Google Drive failed:', backupError)
        }
      }
    }).catch(err => {
      console.warn('⚠️ [Background] Failed to start backup:', err)
    })

    console.log('========================================')
    console.log('✅ UPLOAD SUCCESS')
    console.log(`   ID: ${sopFile.id}`)
    console.log(`   R2 Key: ${r2Key || 'local'}`)
    console.log(`   GDrive Backup: Background`)
    console.log('========================================\n')
    
    return NextResponse.json({ 
      success: true, 
      data: sopFile,
      r2Key,
      syncStatus: {
        r2: r2Key ? 'synced' : 'pending',
        googleDrive: 'pending'
      }
    })
  } catch (error) {
    console.error('❌ Upload error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat upload', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// PUT - Update SOP metadata, status, or increment counters
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userIdCookie = cookieStore.get('userId')?.value

    if (!userIdCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = userIdCookie

    const body = await request.json()
    const { id, status, verificationStatus, verifiedBy, incrementPreview, incrementDownload, judul, kategori, jenis, tahun, rejectionReason, nomorSop } = body

    // Handle counter increments
    if (incrementPreview || incrementDownload) {
      const sopFile = await db.sopFile.findUnique({ where: { id } })
      if (!sopFile) {
        return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 })
      }

      const updateData: { previewCount?: number; downloadCount?: number } = {}
      
      if (incrementPreview) {
        updateData.previewCount = sopFile.previewCount + 1
      }
      if (incrementDownload) {
        updateData.downloadCount = sopFile.downloadCount + 1
      }

      const updated = await db.sopFile.update({
        where: { id },
        data: updateData
      })

      // Log activity
      try {
        await db.log.create({
          data: {
            userId,
            aktivitas: incrementPreview ? 'PREVIEW' : 'DOWNLOAD',
            deskripsi: `${incrementPreview ? 'Preview' : 'Download'} ${sopFile.jenis}: ${sopFile.judul}`,
            fileId: id
          }
        })
      } catch (logError) {
        console.warn('⚠️ Failed to create log:', logError)
      }

      return NextResponse.json({ success: true, data: updated })
    }

    // Handle metadata updates (nomorSop, judul, kategori, jenis, tahun, status)
    if (nomorSop !== undefined || judul || kategori || jenis || tahun || status) {
      const existingSop = await db.sopFile.findUnique({ where: { id } })
      if (!existingSop) {
        return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 })
      }

      const updateData: Record<string, unknown> = {}
      let newFilePath: string | null = null
      let newFileName: string | null = null
      
      // Auto-rename file when judul changes
      if (judul && judul !== existingSop.judul && existingSop.filePath && isR2Configured()) {
        const fileExtension = existingSop.fileName.split('.').pop()?.toLowerCase() || 'pdf'
        const sanitizeFileName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)
        newFileName = `${sanitizeFileName(judul)}.${fileExtension}`
        
        // Get folder path from existing file
        const folderPath = existingSop.filePath.substring(0, existingSop.filePath.lastIndexOf('/'))
        newFilePath = folderPath ? `${folderPath}/${newFileName}` : newFileName
        
        // Move file in R2 to new name
        try {
          console.log(`🔄 Auto-renaming file: ${existingSop.filePath} → ${newFilePath}`)
          await moveR2Object(existingSop.filePath, newFilePath)
          updateData.fileName = newFileName
          updateData.filePath = newFilePath
          console.log(`✅ File renamed successfully: ${newFileName}`)
        } catch (renameError) {
          console.warn('⚠️ Failed to rename file in R2:', renameError)
          // Continue with metadata update even if rename fails
          newFilePath = null
          newFileName = null
        }
      }
      
      if (nomorSop !== undefined) updateData.nomorSop = nomorSop || null
      if (judul) updateData.judul = judul
      if (kategori) updateData.kategori = kategori
      if (jenis) updateData.jenis = jenis
      if (tahun) updateData.tahun = tahun
      if (status) updateData.status = status
      
      const sopFile = await db.sopFile.update({
        where: { id },
        data: updateData
      })
      
      // Log the edit
      try {
        const user = await db.user.findUnique({ where: { id: userId } })
        const changes = []
        if (judul && judul !== existingSop.judul) {
          changes.push(`judul: "${existingSop.judul}" → "${judul}"`)
          if (newFileName) changes.push(`file renamed: "${existingSop.fileName}" → "${newFileName}"`)
        }
        if (kategori && kategori !== existingSop.kategori) changes.push(`kategori: ${existingSop.kategori} → ${kategori}`)
        if (jenis && jenis !== existingSop.jenis) changes.push(`jenis: ${existingSop.jenis} → ${jenis}`)
        if (tahun && tahun !== existingSop.tahun) changes.push(`tahun: ${existingSop.tahun} → ${tahun}`)
        if (status && status !== existingSop.status) changes.push(`status: ${existingSop.status} → ${status}`)
        
        await db.log.create({
          data: {
            userId,
            aktivitas: 'EDIT_METADATA',
            deskripsi: `${user?.name} mengubah ${existingSop.jenis}: ${existingSop.judul}${changes.length > 0 ? ' - ' + changes.join(', ') : ''}`,
            fileId: id
          }
        })
      } catch (logError) {
        console.warn('⚠️ Failed to create log:', logError)
      }
      
      return NextResponse.json({ 
        success: true, 
        data: sopFile, 
        renamed: newFileName ? { oldName: existingSop.fileName, newName: newFileName } : null
      })
    }

    // Handle verification status updates
    const updateData: Record<string, unknown> = {}

    if (verificationStatus) {
      // Get existing file info first
      const existingFile = await db.sopFile.findUnique({ where: { id } })
      
      updateData.verificationStatus = verificationStatus
      updateData.verifiedBy = verifiedBy || userId
      updateData.verifiedAt = new Date()
      
      // If DISETUJUI, change status to REVIEW so it appears in SOP catalog
      if (verificationStatus === 'DISETUJUI') {
        updateData.status = 'REVIEW'
      }
      
      // If DITOLAK, store rejection reason, set arsip folder, and move file
      if (verificationStatus === 'DITOLAK') {
        try {
          updateData.rejectionReason = rejectionReason || 'Tidak ada alasan'
          updateData.arsipFolder = 'Publik-Ditolak'
          
          // Move file to 'publik-ditolak' folder in R2
          if (existingFile?.filePath && isR2Configured()) {
            const oldPath = existingFile.filePath
            const fileName = oldPath.split('/').pop() || existingFile.fileName
            const newPath = `publik-ditolak/${fileName}`
            
            try {
              console.log(`📦 Moving rejected file: ${oldPath} → ${newPath}`)
              await moveR2Object(oldPath, newPath)
              updateData.filePath = newPath
              console.log(`✅ File moved to rejected folder: ${newPath}`)
            } catch (moveError) {
              console.warn('⚠️ Failed to move rejected file:', moveError)
              // Continue with status update even if move fails
            }
          }
        } catch (fieldError) {
          console.warn('⚠️ rejectionReason/arsipFolder fields may not exist:', fieldError)
        }
      }
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
          deskripsi: `${user?.name} ${verificationStatus ? 'memverifikasi' : 'mengubah status'} ${sopFile.jenis}: ${sopFile.judul}`,
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
    const userIdCookie = cookieStore.get('userId')?.value

    if (!userIdCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await db.user.findUnique({ where: { id: userIdCookie } })
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya admin yang dapat menghapus file' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
    }
    
    // Get file info first
    const sopFile = await db.sopFile.findUnique({ where: { id } })
    
    if (!sopFile) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
    }

    // Delete from R2 (Primary Storage)
    if (sopFile.filePath && sopFile.filePath.includes('/')) {
      try {
        await deleteFromR2(sopFile.filePath)
        console.log(`🗑️ Deleted from R2: ${sopFile.filePath}`)
      } catch (r2Error) {
        console.warn('⚠️ Failed to delete from R2:', r2Error)
      }
    }
    
    // Delete from Google Drive (Backup) - in background
    if (sopFile.driveFileId) {
      import('@/lib/google-drive').then(async (gd) => {
        try {
          await gd.deleteFileFromDrive(sopFile.driveFileId!)
          console.log(`🗑️ [Background] Deleted from Google Drive: ${sopFile.driveFileId}`)
        } catch (driveError) {
          console.warn('⚠️ [Background] Failed to delete from Google Drive:', driveError)
        }
      }).catch(err => {
        console.warn('⚠️ Failed to start Google Drive deletion:', err)
      })
    }

    // Delete FileSync record if exists
    try {
      await db.fileSync.deleteMany({
        where: {
          OR: [
            { r2Key: sopFile.filePath },
            { driveFileId: sopFile.driveFileId }
          ]
        }
      })
    } catch (syncError) {
      console.warn('⚠️ Failed to delete FileSync record:', syncError)
    }
    
    // Delete from database
    await db.sopFile.delete({ where: { id } })

    // Log the deletion
    try {
      await db.log.create({
        data: {
          userId: userIdCookie,
          aktivitas: 'DELETE',
          deskripsi: `Hapus ${sopFile.jenis}: ${sopFile.judul}`,
          fileId: id
        }
      })
    } catch (logError) {
      console.warn('⚠️ Failed to create log:', logError)
    }
    
    return NextResponse.json({ success: true, message: `File "${sopFile.fileName}" berhasil dihapus` })
  } catch (error) {
    console.error('Delete SOP error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat menghapus file' }, { status: 500 })
  }
}
