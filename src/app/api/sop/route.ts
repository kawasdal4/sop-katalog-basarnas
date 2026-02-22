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

// Check if R2 is available (Primary Storage)
async function checkR2Available(): Promise<{ success: boolean; error?: string }> {
  try {
    const r2 = await import('@/lib/r2-storage')
    if (!r2.isR2Configured()) {
      return { success: false, error: 'Cloudflare R2 credentials not configured' }
    }
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// Check if Google Drive is available (Backup Storage)
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
    const sortBy = searchParams.get('sortBy') || 'tahun-asc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const verificationStatus = searchParams.get('verificationStatus') || ''
    const publicOnly = searchParams.get('publicOnly') === 'true'
    
    // Build where clause with proper AND/OR combination
    const whereConditions: unknown[] = []
    
    // Search filter (nomorSop OR judul)
    if (search) {
      whereConditions.push({
        OR: [
          { nomorSop: { contains: search } },
          { judul: { contains: search } }
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
    let orderBy: unknown[] = [{ tahun: 'asc' }, { uploadedAt: 'desc' }]
    switch (sortBy) {
      case 'tahun-asc':
        orderBy = [{ tahun: 'asc' }, { uploadedAt: 'desc' }]
        break
      case 'tahun-desc':
        orderBy = [{ tahun: 'desc' }, { uploadedAt: 'desc' }]
        break
      case 'uploadedAt-desc':
        orderBy = [{ uploadedAt: 'desc' }]
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

// POST - Create new SOP with Google Drive upload
export async function POST(request: NextRequest) {
  console.log('\n========================================')
  console.log('📤 UPLOAD REQUEST')
  console.log(`   Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`)
  console.log('========================================\n')
  
  try {
    const contentType = request.headers.get('content-type') || ''
    
    // Check if this is a JSON request (for large file uploads that already have driveFileId)
    if (contentType.includes('application/json')) {
      return await handleJsonUpload(request)
    }
    
    // Handle form data upload (small files)
    return await handleFormUpload(request)
    
  } catch (error) {
    console.error('❌ Upload error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat upload', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// Handle JSON upload (for large files already uploaded to Google Drive)
async function handleJsonUpload(request: NextRequest) {
  const body = await request.json()
  const {
    judul, kategori, jenis, tahun, status,
    fileName, fileType, driveFileId,
    isPublicSubmission, submitterName, submitterEmail,
    skipFileUpload
  } = body

  console.log('JSON upload data:', { judul, kategori, jenis, tahun, fileName, driveFileId, skipFileUpload })

  if (!driveFileId) {
    return NextResponse.json({ error: 'driveFileId diperlukan untuk JSON upload' }, { status: 400 })
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
    console.log(`🔑 Session user ID (JSON): ${userId}`)

    // Verify user exists in database
    const userExists = await db.user.findUnique({ where: { id: userId } })
    if (!userExists) {
      console.error(`❌ User not found: ${userId}`)
      return NextResponse.json({ error: 'User tidak valid. Silakan login ulang.' }, { status: 401 })
    }
    console.log(`✅ User verified: ${userExists.email}`)
  }

  // Generate nomor SOP - check for duplicates and find next available number
  let counter = await db.counter.findUnique({ where: { id: 'counter' } })
  let count = jenis === 'SOP' ? (counter?.sopCount || 0) + 1 : (counter?.ikCount || 0) + 1
  let nomorSop = jenis === 'SOP' ? `SOP-${String(count).padStart(4, '0')}` : `IK-${String(count).padStart(4, '0')}`
  
  // Check if nomorSop already exists, find next available number
  let attempts = 0
  while (attempts < 100) {
    const existing = await db.sopFile.findUnique({ where: { nomorSop } })
    if (!existing) break
    count++
    nomorSop = jenis === 'SOP' ? `SOP-${String(count).padStart(4, '0')}` : `IK-${String(count).padStart(4, '0')}`
    attempts++
  }
  
  if (attempts >= 100) {
    return NextResponse.json({ error: 'Gagal menemukan nomor SOP yang tersedia' }, { status: 500 })
  }

  console.log(`📝 Generated nomor: ${nomorSop}`)

  // Set file to public in Google Drive
  try {
    const gd = await import('@/lib/google-drive')
    await gd.setFilePublic(driveFileId)
    console.log(`✅ File set to public: ${driveFileId}`)
  } catch (permError) {
    console.warn('⚠️ Could not set file to public:', permError)
  }

  // Determine file name
  const finalFileName = fileName || `${nomorSop}.${fileType || 'pdf'}`
  const r2Key = `sop-files/${finalFileName}`
  let filePath = driveFileId

  // ============================================
  // AUTO SYNC: Also upload to R2 (Primary Storage)
  // ============================================
  const r2Check = await checkR2Available()

  if (r2Check.success) {
    try {
      console.log(`📤 Auto-sync: Downloading from Google Drive to upload to R2...`)

      // Download from Google Drive
      const gd = await import('@/lib/google-drive')
      const fileBuffer = await gd.downloadFileFromDrive(driveFileId)

      // MIME types
      const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
      }
      const mimeType = mimeTypes[fileType || 'pdf'] || 'application/octet-stream'

      // Upload to R2
      const r2 = await import('@/lib/r2-storage')
      const r2Result = await r2.uploadToR2(fileBuffer, finalFileName, mimeType, {
        folder: 'sop-files'
      })

      console.log(`✅ Auto-sync: File uploaded to R2: ${r2Result.key}`)
      filePath = r2Result.key

      // Create FileSync record
      await db.fileSync.upsert({
        where: { r2Key: r2Result.key },
        create: {
          filename: finalFileName,
          mimeType,
          fileSize: fileBuffer.length,
          r2Key: r2Result.key,
          driveFileId,
          source: 'both',
          syncStatus: 'synced',
          r2ModifiedAt: new Date(),
          driveModifiedAt: new Date(),
          lastSyncedAt: new Date(),
        },
        update: {
          driveFileId,
          source: 'both',
          syncStatus: 'synced',
          fileSize: fileBuffer.length,
          r2ModifiedAt: new Date(),
          driveModifiedAt: new Date(),
          lastSyncedAt: new Date(),
        }
      })

      // Log the auto-sync
      await db.syncLog.create({
        data: {
          operation: 'auto_sync_large_upload',
          filename: finalFileName,
          status: 'success',
          message: `Auto-synced large file: Drive (${driveFileId}) → R2 (${r2Result.key})`,
          details: { r2Key: r2Result.key, driveFileId, fileSize: fileBuffer.length }
        }
      })

    } catch (syncError) {
      console.warn('⚠️ Auto-sync to R2 failed (file still available in Google Drive):', syncError instanceof Error ? syncError.message : syncError)

      // Create pending FileSync record
      try {
        await db.fileSync.create({
          data: {
            filename: finalFileName,
            mimeType: 'application/octet-stream',
            fileSize: 0,
            driveFileId,
            source: 'drive',
            syncStatus: 'pending',
            driveModifiedAt: new Date(),
            lastError: syncError instanceof Error ? syncError.message : 'Unknown error',
          }
        })
      } catch (fsError) {
        console.warn('⚠️ Failed to create FileSync record:', fsError)
      }
    }
  }

  // Create SOP record
  const sopFile = await db.sopFile.create({
    data: {
      nomorSop,
      judul,
      tahun: parseInt(tahun),
      kategori,
      jenis,
      status: status || 'AKTIF',
      fileName: finalFileName,
      filePath,
      fileType: fileType || 'pdf',
      driveFileId,
      uploadedBy: userId,
      isPublicSubmission: isPublicSubmission || false,
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
        deskripsi: `${isPublicSubmission ? 'Submit publik' : 'Upload'} ${jenis}: ${nomorSop} - ${judul} [Resumable + Auto-sync]`,
        fileId: sopFile.id
      }
    })
  } catch (logError) {
    console.warn('⚠️ Failed to create log:', logError)
  }

  console.log('========================================')
  console.log('✅ UPLOAD SUCCESS (Resumable)')
  console.log(`   ID: ${sopFile.id}`)
  console.log(`   Drive ID: ${driveFileId}`)
  console.log(`   R2 Sync: ${filePath !== driveFileId ? 'Yes' : 'Pending'}`)
  console.log('========================================\n')

  return NextResponse.json({
    success: true,
    data: sopFile,
    driveFileId
  })
}

// Handle form data upload (small files)
async function handleFormUpload(request: NextRequest) {
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
  
  console.log('Form data:', { judul, kategori, jenis, tahun, fileName: file?.name, fileSize: file?.size })
  
  if (!file) {
    return NextResponse.json({ error: 'File diperlukan' }, { status: 400 })
  }
  
  // Check file size (max 4MB for form upload due to Vercel limits)
  const maxSize = 4 * 1024 * 1024 // 4MB
  if (file.size > maxSize) {
    return NextResponse.json({ 
      error: 'File terlalu besar untuk form upload. Gunakan upload resumable.',
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      maxSize: '4 MB',
      useResumable: true
    }, { status: 400 })
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
    console.log(`🔑 Session user ID (Form): ${userId}`)

    // Verify user exists in database
    const userExists = await db.user.findUnique({ where: { id: userId } })
    if (!userExists) {
      console.error(`❌ User not found: ${userId}`)
      return NextResponse.json({ error: 'User tidak valid. Silakan login ulang.' }, { status: 401 })
    }
    console.log(`✅ User verified: ${userExists.email}`)
  }

  // Generate nomor SOP - check for duplicates and find next available number
  let counter = await db.counter.findUnique({ where: { id: 'counter' } })
  let count = jenis === 'SOP' ? (counter?.sopCount || 0) + 1 : (counter?.ikCount || 0) + 1
  let nomorSop = jenis === 'SOP' ? `SOP-${String(count).padStart(4, '0')}` : `IK-${String(count).padStart(4, '0')}`
  
  // Check if nomorSop already exists, find next available number
  let attempts = 0
  while (attempts < 100) {
    const existing = await db.sopFile.findUnique({ where: { nomorSop } })
    if (!existing) break
    count++
    nomorSop = jenis === 'SOP' ? `SOP-${String(count).padStart(4, '0')}` : `IK-${String(count).padStart(4, '0')}`
    attempts++
  }
  
  if (attempts >= 100) {
    return NextResponse.json({ error: 'Gagal menemukan nomor SOP yang tersedia' }, { status: 500 })
  }

  console.log(`📝 Generated nomor: ${nomorSop}`)

  // Prepare file
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'pdf'
  const fileName = `${nomorSop}.${fileExtension}`

  console.log(`📄 Processing file: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

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
  
  let r2Key: string | null = null
  let driveFileId: string | null = null
  let filePath = fileName
  
  // ============================================
  // STEP 1: Upload to R2 (PRIMARY STORAGE)
  // ============================================
  const r2Check = await checkR2Available()
  
  if (r2Check.success) {
    try {
      const r2 = await import('@/lib/r2-storage')
      console.log(`📤 Uploading to R2 (Primary): ${fileName} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)
      
      const r2Result = await r2.uploadToR2(buffer, fileName, mimeType, { 
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
  } else {
    // Local storage fallback (development only)
    if (!isProduction) {
      console.log('📁 Using local storage (R2 not configured)')
      const uploadDir = path.join(process.cwd(), 'uploads')
      await mkdir(uploadDir, { recursive: true })
      const localPath = path.join(uploadDir, fileName)
      await writeFile(localPath, buffer)
    } else {
      return NextResponse.json({ 
        error: `Cloudflare R2 tidak tersedia: ${r2Check.error}` 
      }, { status: 500 })
    }
  }
  
  // ============================================
  // STEP 2: Backup to Google Drive (AUTO SYNC)
  // ============================================
  const driveCheck = await checkGoogleDriveAvailable()

  if (driveCheck.success && r2Key) {
    try {
      // Upload to Google Drive synchronously (await the result)
      const gd = await import('@/lib/google-drive')
      console.log(`📤 Auto-backup to Google Drive: ${fileName}`)

      const driveResult = await gd.uploadFileToDriveFolder(buffer, fileName, mimeType)
      driveFileId = driveResult.id

      console.log(`✅ Auto-backup successful: ${driveFileId}`)

      // Create or update FileSync record for tracking
      await db.fileSync.upsert({
        where: { r2Key },
        create: {
          filename: fileName,
          mimeType,
          fileSize: buffer.length,
          r2Key,
          driveFileId,
          source: 'both',
          syncStatus: 'synced',
          r2ModifiedAt: new Date(),
          driveModifiedAt: new Date(),
          lastSyncedAt: new Date(),
        },
        update: {
          driveFileId,
          source: 'both',
          syncStatus: 'synced',
          fileSize: buffer.length,
          r2ModifiedAt: new Date(),
          driveModifiedAt: new Date(),
          lastSyncedAt: new Date(),
        }
      })

      // Log the auto-sync
      await db.syncLog.create({
        data: {
          operation: 'auto_sync_upload',
          filename: fileName,
          status: 'success',
          message: `Auto-synced to Google Drive on upload: ${driveFileId}`,
          details: { r2Key, driveFileId, fileSize: buffer.length }
        }
      })

    } catch (backupError) {
      console.warn('⚠️ Auto-backup to Google Drive failed:', backupError instanceof Error ? backupError.message : backupError)

      // Still create FileSync record but mark as pending
      try {
        await db.fileSync.upsert({
          where: { r2Key },
          create: {
            filename: fileName,
            mimeType,
            fileSize: buffer.length,
            r2Key,
            source: 'r2',
            syncStatus: 'pending',
            r2ModifiedAt: new Date(),
            lastError: backupError instanceof Error ? backupError.message : 'Unknown error',
          },
          update: {
            source: 'r2',
            syncStatus: 'pending',
            lastError: backupError instanceof Error ? backupError.message : 'Unknown error',
          }
        })
      } catch (syncError) {
        console.warn('⚠️ Failed to create FileSync record:', syncError)
      }
    }
  } else if (r2Key) {
    // Google Drive not available, create pending FileSync record
    try {
      await db.fileSync.create({
        data: {
          filename: fileName,
          mimeType,
          fileSize: buffer.length,
          r2Key,
          source: 'r2',
          syncStatus: 'pending',
          r2ModifiedAt: new Date(),
        }
      })
    } catch (syncError) {
      console.warn('⚠️ Failed to create pending FileSync record:', syncError)
    }
  }
  
  // Create SOP record
  let sopFile
  try {
    sopFile = await db.sopFile.create({
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
  } catch (dbError: unknown) {
    console.error('❌ Database error:', dbError)
    const prismaError = dbError as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === 'P2002') {
      return NextResponse.json({
        error: `Nomor SOP ${nomorSop} sudah ada. Coba lagi.`,
        code: prismaError.code
      }, { status: 400 })
    }
    if (prismaError.code === 'P2003') {
      return NextResponse.json({
        error: 'User tidak valid. Silakan login ulang.',
        code: prismaError.code
      }, { status: 401 })
    }
    return NextResponse.json({
      error: 'Gagal menyimpan ke database',
      details: dbError instanceof Error ? dbError.message : 'Unknown error',
      code: prismaError.code
    }, { status: 500 })
  }
  
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
        deskripsi: `${isPublicSubmission ? 'Submit publik' : 'Upload'} ${jenis}: ${nomorSop} - ${judul}${r2Key ? ' [R2 Primary]' : ' [Local]'}${driveFileId ? ' + GDrive Backup' : ''}`,
        fileId: sopFile.id
      }
    })
  } catch (logError) {
    console.warn('⚠️ Failed to create log:', logError)
  }
  
  console.log('========================================')
  console.log('✅ UPLOAD SUCCESS')
  console.log(`   ID: ${sopFile.id}`)
  console.log(`   R2 Key: ${r2Key || 'local'}`)
  console.log(`   GDrive Backup: ${driveFileId || 'pending'}`)
  console.log('========================================\n')
  
  return NextResponse.json({ 
    success: true, 
    data: sopFile,
    r2Key,
    driveFileId,
    syncStatus: {
      r2: r2Key ? 'synced' : 'pending',
      googleDrive: driveFileId ? 'synced' : 'pending'
    }
  })
}

// PUT - Update SOP status or increment counters
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userIdCookie = cookieStore.get('userId')?.value

    if (!userIdCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = userIdCookie

    const body = await request.json()
    const { id, status, verificationStatus, verifiedBy, incrementPreview, incrementDownload } = body

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
            deskripsi: `${incrementPreview ? 'Preview' : 'Download'} ${sopFile.jenis}: ${sopFile.nomorSop}`,
            fileId: id
          }
        })
      } catch (logError) {
        console.warn('⚠️ Failed to create log:', logError)
      }

      return NextResponse.json({ success: true, data: updated })
    }

    // Handle status updates
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
        const r2 = await import('@/lib/r2-storage')
        await r2.deleteFromR2(sopFile.filePath)
        console.log(`🗑️ Deleted from R2: ${sopFile.filePath}`)
      } catch (r2Error) {
        console.warn('⚠️ Failed to delete from R2:', r2Error)
      }
    }
    
    // Delete from Google Drive (Backup Storage)
    if (sopFile.driveFileId) {
      try {
        const gd = await import('@/lib/google-drive')
        await gd.deleteFileFromDrive(sopFile.driveFileId)
        console.log(`🗑️ Deleted from Google Drive: ${sopFile.driveFileId}`)
      } catch (driveError) {
        console.warn('⚠️ Failed to delete from Google Drive:', driveError)
      }
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
          deskripsi: `Hapus ${sopFile.jenis}: ${sopFile.nomorSop} - ${sopFile.judul}`,
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
