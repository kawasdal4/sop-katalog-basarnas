import { NextRequest, NextResponse } from 'next/server'
import { getR2PresignedUploadUrl, isR2Configured, uploadToR2 } from '@/lib/r2-storage'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// Set runtime and max duration for Vercel
export const runtime = 'nodejs'
export const maxDuration = 60

// MIME types for different file extensions
const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
}

/**
 * POST /api/upload-url
 * 
 * Generate presigned URL for direct upload to R2 (Primary Storage)
 * 
 * Request body:
 * - fileName: Original file name
 * - fileSize: File size in bytes
 * - jenis: 'SOP' | 'IK' | 'LAINNYA' (for generating SOP number)
 */
export async function POST(request: NextRequest) {
  try {
    const { fileName, fileSize, jenis, isPublicSubmission } = await request.json()

    if (!fileName || !fileSize) {
      return NextResponse.json({ error: 'fileName dan fileSize diperlukan' }, { status: 400 })
    }

    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json({ 
        error: 'Cloudflare R2 tidak terkonfigurasi. Hubungi administrator.' 
      }, { status: 500 })
    }

    console.log(`📤 Creating R2 presigned upload URL for: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`)

    // Get user session - only required for non-public submissions
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    // For public submissions, allow without authentication
    if (!isPublicSubmission) {
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized - silakan login terlebih dahulu' }, { status: 401 })
      }

      // Verify user exists
      const user = await db.user.findUnique({ where: { id: userId } })
      if (!user) {
        return NextResponse.json({ error: 'User tidak valid. Silakan login ulang.' }, { status: 401 })
      }
    }

    // Determine content type from file extension
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'pdf'
    const mimeType = MIME_TYPES[fileExt] || 'application/octet-stream'

    // Generate a unique key for the file (temporary)
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const tempKey = `uploads/temp-${timestamp}-${randomId}/${fileName}`

    // Generate presigned upload URL (valid for 1 hour)
    const uploadUrl = await getR2PresignedUploadUrl(tempKey, mimeType, 3600)

    console.log(`✅ R2 presigned upload URL created: ${tempKey}`)

    return NextResponse.json({ 
      success: true,
      uploadUrl,
      uploadKey: tempKey,
      fileName,
      mimeType,
      expiresIn: 3600,
      message: 'Upload URL berhasil dibuat. Upload file ke URL ini menggunakan method PUT.'
    })

  } catch (error) {
    console.error('Create upload URL error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat membuat upload URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT /api/upload-url
 * 
 * Confirm upload and create SOP record after file is uploaded to R2
 * This is called after frontend successfully uploads to R2
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      uploadKey,      // The temporary key returned from POST
      fileName,       // Original file name
      judul,          // SOP title
      kategori,       // SIAGA | LATIHAN | LAINNYA
      jenis,          // SOP | IK | LAINNYA
      tahun,          // Year
      status,         // AKTIF | REVIEW | KADALUARSA
      isPublicSubmission,
      submitterName,
      submitterEmail,
      keterangan
    } = body

    if (!uploadKey || !fileName || !judul || !kategori || !jenis || !tahun) {
      return NextResponse.json({ 
        error: 'Data tidak lengkap. Semua field harus diisi.' 
      }, { status: 400 })
    }

    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json({ error: 'R2 tidak terkonfigurasi' }, { status: 500 })
    }

    // Get user
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = userIdCookie
    }

    console.log(`📤 Confirming upload: ${uploadKey}`)

    // ============================================
    // AUTO-GENERATE SOP NUMBER BASED ON TIMESTAMP
    // Newest file = Number 1
    // ============================================
    
    const getPrefix = (jenis: string) => {
      if (jenis === 'SOP') return 'SOP-'
      if (jenis === 'IK') return 'IK-'
      return 'LAINNYA-'
    }
    
    const prefix = getPrefix(jenis)
    
    // Get all SOPs of the same jenis, ordered by uploadedAt DESC
    const allSopsOfJenis = await db.sopFile.findMany({
      where: { jenis },
      orderBy: { uploadedAt: 'desc' },
      select: { id: true, nomorSop: true }
    })
    
    // Generate new nomorSop for the new file (it will be #1)
    const nomorSop = `${prefix}${String(1).padStart(4, '0')}`
    console.log(`📝 Generated nomor: ${nomorSop} (newest file)`)
    
    // Renumber all existing SOPs of this jenis
    for (let i = 0; i < allSopsOfJenis.length; i++) {
      const existingSop = allSopsOfJenis[i]
      const newNumber = i + 2
      const newNomorSop = `${prefix}${String(newNumber).padStart(4, '0')}`
      
      try {
        await db.sopFile.update({
          where: { id: existingSop.id },
          data: { nomorSop: newNomorSop }
        })
      } catch (updateError) {
        console.warn(`⚠️ Failed to renumber ${existingSop.nomorSop}:`, updateError)
      }
    }

    // Determine final file name and key
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'pdf'
    const finalFileName = `${nomorSop}.${fileExt}`
    const finalKey = `sop-files/${finalFileName}`

    // Move file from temp location to final location in R2
    // We need to copy the file to the new location and delete the temp file
    const { copyR2Object, deleteFromR2 } = await import('@/lib/r2-storage')
    
    try {
      await copyR2Object(uploadKey, finalKey)
      console.log(`✅ File moved: ${uploadKey} → ${finalKey}`)
      
      // Delete temp file
      await deleteFromR2(uploadKey)
      console.log(`🗑️ Temp file deleted: ${uploadKey}`)
    } catch (moveError) {
      console.error('❌ Failed to move file:', moveError)
      return NextResponse.json({ 
        error: 'Gagal memindahkan file. Upload mungkin tidak berhasil.' 
      }, { status: 500 })
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
        filePath: finalKey,
        fileType: fileExt,
        driveFileId: null, // Will be set when backup completes
        uploadedBy: userId,
        isPublicSubmission: isPublicSubmission || false,
        submitterName,
        submitterEmail,
        keterangan,
        verificationStatus: isPublicSubmission ? 'MENUNGGU' : null
      }
    })

    // Create FileSync record
    try {
      await db.fileSync.create({
        data: {
          filename: finalFileName,
          mimeType: MIME_TYPES[fileExt] || 'application/octet-stream',
          fileSize: 0,
          r2Key: finalKey,
          source: 'r2',
          syncStatus: 'pending',
          r2ModifiedAt: new Date(),
        }
      })
    } catch (syncError) {
      console.warn('⚠️ Failed to create FileSync record:', syncError)
    }

    // ============================================
    // BACKGROUND: Backup to Google Drive (async, no await)
    // ============================================
    import('@/lib/google-drive').then(async (gd) => {
      if (gd.isGoogleDriveConfigured()) {
        try {
          console.log(`📤 [Background] Starting backup to Google Drive: ${finalFileName}`)
          
          // Download from R2
          const r2 = await import('@/lib/r2-storage')
          const { buffer } = await r2.downloadFromR2(finalKey)
          
          // Upload to Google Drive
          const driveResult = await gd.uploadFileToDriveFolder(
            buffer, 
            finalFileName, 
            MIME_TYPES[fileExt] || 'application/octet-stream'
          )
          
          // Update SOP record with driveFileId
          await db.sopFile.update({
            where: { id: sopFile.id },
            data: { driveFileId: driveResult.id }
          })
          
          // Update FileSync record
          await db.fileSync.updateMany({
            where: { r2Key: finalKey },
            data: {
              driveFileId: driveResult.id,
              source: 'both',
              syncStatus: 'synced',
              driveModifiedAt: new Date(),
              lastSyncedAt: new Date(),
              fileSize: buffer.length,
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

    // Create log
    try {
      await db.log.create({
        data: {
          userId,
          aktivitas: 'UPLOAD',
          deskripsi: `${isPublicSubmission ? 'Submit publik' : 'Upload'} ${jenis}: ${nomorSop} - ${judul} [R2 Primary]`,
          fileId: sopFile.id
        }
      })
    } catch (logError) {
      console.warn('⚠️ Failed to create log:', logError)
    }

    // Update counter
    const newCount = allSopsOfJenis.length + 1
    if (jenis === 'SOP') {
      await db.counter.upsert({
        where: { id: 'counter' },
        update: { sopCount: newCount },
        create: { id: 'counter', sopCount: newCount, ikCount: 0 }
      })
    } else if (jenis === 'IK') {
      await db.counter.upsert({
        where: { id: 'counter' },
        update: { ikCount: newCount },
        create: { id: 'counter', sopCount: 0, ikCount: newCount }
      })
    }

    console.log('========================================')
    console.log('✅ UPLOAD SUCCESS (R2 Primary)')
    console.log(`   ID: ${sopFile.id}`)
    console.log(`   R2 Key: ${finalKey}`)
    console.log(`   GDrive Backup: Background`)
    console.log('========================================')

    return NextResponse.json({ 
      success: true, 
      data: sopFile,
      r2Key: finalKey,
      syncStatus: {
        r2: 'synced',
        googleDrive: 'pending'
      }
    })

  } catch (error) {
    console.error('Confirm upload error:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat konfirmasi upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
