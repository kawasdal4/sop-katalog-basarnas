/**
 * Auto Backup Service
 * 
 * Automatically backs up files from Cloudflare R2 (primary) to Google Drive (backup)
 * 
 * Features:
 * - Detects new files in R2
 * - Detects modified files (by size, date/time, or checksum)
 * - One-way sync: R2 → Drive
 * - Notification when no backup needed
 */

import { db } from '@/lib/db'
import { 
  listR2Objects, 
  downloadFromR2, 
  getR2ObjectMetadata,
  isR2Configured,
  R2Object 
} from '@/lib/r2-storage'
import { 
  uploadFileToDriveFolder, 
  isGoogleDriveConfigured,
  getFileMetadata,
  DriveFile
} from '@/lib/google-drive'
import { calculateChecksum, retry } from '@/lib/sync-core'

// Backup result types
export interface BackupResult {
  success: boolean
  totalChecked: number
  newFilesBackedUp: number
  modifiedFilesBackedUp: number
  skippedFiles: number
  errors: Array<{ filename: string; error: string }>
  hasChanges: boolean
  message: string
}

export interface FileChangeInfo {
  key: string
  filename: string
  changeType: 'new' | 'modified' | 'unchanged'
  oldSize?: number
  newSize: number
  oldModified?: Date
  newModified: Date
  reason?: string
}

/**
 * Check for file changes in R2
 */
export async function detectChangesInR2(): Promise<FileChangeInfo[]> {
  console.log('🔍 Detecting changes in R2...')
  
  if (!isR2Configured()) {
    throw new Error('R2 is not configured')
  }
  
  // Get all files from R2
  const r2Objects = await listR2Objects('sop-files')
  
  // Get all sync records from database
  const syncRecords = await db.fileSync.findMany()
  const syncByR2Key = new Map(syncRecords.map(r => [r.r2Key, r]))
  
  const changes: FileChangeInfo[] = []
  
  for (const r2Obj of r2Objects) {
    const syncRecord = syncByR2Key.get(r2Obj.key)
    const filename = r2Obj.key.split('/').pop() || r2Obj.key
    
    if (!syncRecord || !syncRecord.driveFileId) {
      // New file - never backed up
      changes.push({
        key: r2Obj.key,
        filename,
        changeType: 'new',
        newSize: r2Obj.size,
        newModified: r2Obj.lastModified,
        reason: 'File belum pernah di-backup'
      })
    } else {
      // Check if file has been modified
      const lastBackup = syncRecord.lastSyncedAt || new Date(0)
      const r2Modified = r2Obj.lastModified
      
      // Compare by modification time
      const timeChanged = r2Modified > lastBackup
      
      // Compare by size
      const sizeChanged = syncRecord.fileSize !== r2Obj.size
      
      if (timeChanged || sizeChanged) {
        changes.push({
          key: r2Obj.key,
          filename,
          changeType: 'modified',
          oldSize: syncRecord.fileSize || undefined,
          newSize: r2Obj.size,
          oldModified: lastBackup,
          newModified: r2Modified,
          reason: timeChanged 
            ? `File diubah pada ${r2Modified.toLocaleString('id-ID')}` 
            : `Ukuran berubah dari ${syncRecord.fileSize} ke ${r2Obj.size} bytes`
        })
      } else {
        changes.push({
          key: r2Obj.key,
          filename,
          changeType: 'unchanged',
          newSize: r2Obj.size,
          newModified: r2Modified,
          reason: 'Tidak ada perubahan'
        })
      }
    }
  }
  
  return changes
}

/**
 * Perform automatic backup from R2 to Google Drive
 */
export async function performAutoBackup(options?: {
  dryRun?: boolean
  concurrency?: number
}): Promise<BackupResult> {
  console.log('========================================')
  console.log('🔄 AUTO BACKUP: R2 → Google Drive')
  console.log('========================================')
  
  const startTime = Date.now()
  const result: BackupResult = {
    success: true,
    totalChecked: 0,
    newFilesBackedUp: 0,
    modifiedFilesBackedUp: 0,
    skippedFiles: 0,
    errors: [],
    hasChanges: false,
    message: ''
  }
  
  try {
    // Check if both storages are configured
    if (!isR2Configured()) {
      throw new Error('Cloudflare R2 tidak terkonfigurasi')
    }
    
    if (!isGoogleDriveConfigured()) {
      throw new Error('Google Drive tidak terkonfigurasi')
    }
    
    // Detect changes
    const changes = await detectChangesInR2()
    result.totalChecked = changes.length
    
    // Filter files that need backup
    const filesToBackup = changes.filter(c => c.changeType !== 'unchanged')
    const unchangedFiles = changes.filter(c => c.changeType === 'unchanged')
    
    console.log(`📊 Ditemukan ${filesToBackup.length} file yang perlu di-backup`)
    console.log(`📊 ${unchangedFiles.length} file tidak berubah`)
    
    if (options?.dryRun) {
      result.hasChanges = filesToBackup.length > 0
      result.message = filesToBackup.length > 0
        ? `Dry run: ${filesToBackup.filter(f => f.changeType === 'new').length} file baru, ${filesToBackup.filter(f => f.changeType === 'modified').length} file berubah siap untuk di-backup`
        : 'Tidak ada file yang perlu di-backup - semua file sudah up-to-date'
      result.skippedFiles = unchangedFiles.length
      return result
    }
    
    // If no changes, return early
    if (filesToBackup.length === 0) {
      result.hasChanges = false
      result.skippedFiles = unchangedFiles.length
      result.message = '✅ Tidak ada file yang perlu di-backup - semua file sudah sinkron dengan Google Drive'
      
      // Log to database
      await db.syncLog.create({
        data: {
          operation: 'auto_backup',
          filename: 'system',
          status: 'success',
          message: 'No files need backup - all files are up-to-date',
        }
      })
      
      console.log('✅ No files need backup')
      return result
    }
    
    result.hasChanges = true
    
    // Process files with concurrency
    const concurrency = options?.concurrency || 3
    const batches: FileChangeInfo[][] = []
    for (let i = 0; i < filesToBackup.length; i += concurrency) {
      batches.push(filesToBackup.slice(i, i + concurrency))
    }
    
    for (const batch of batches) {
      await Promise.all(batch.map(async (fileChange) => {
        try {
          const backupResult = await backupSingleFile(fileChange)
          
          if (backupResult.success) {
            if (fileChange.changeType === 'new') {
              result.newFilesBackedUp++
            } else {
              result.modifiedFilesBackedUp++
            }
            console.log(`✅ Backed up: ${fileChange.filename}`)
          } else {
            result.errors.push({
              filename: fileChange.filename,
              error: backupResult.error || 'Unknown error'
            })
          }
        } catch (error) {
          result.errors.push({
            filename: fileChange.filename,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          console.error(`❌ Failed to backup ${fileChange.filename}:`, error)
        }
      }))
    }
    
    // Update result
    result.skippedFiles = unchangedFiles.length
    result.success = result.errors.length === 0
    
    const duration = Date.now() - startTime
    result.message = result.success
      ? `✅ Backup berhasil: ${result.newFilesBackedUp} file baru, ${result.modifiedFilesBackedUp} file diperbarui`
      : `⚠️ Backup selesai dengan ${result.errors.length} error`
    
    console.log('========================================')
    console.log('📊 BACKUP SUMMARY')
    console.log(`   Total checked: ${result.totalChecked}`)
    console.log(`   New files backed up: ${result.newFilesBackedUp}`)
    console.log(`   Modified files backed up: ${result.modifiedFilesBackedUp}`)
    console.log(`   Skipped (unchanged): ${result.skippedFiles}`)
    console.log(`   Errors: ${result.errors.length}`)
    console.log(`   Duration: ${duration}ms`)
    console.log('========================================')
    
    // Log to database
    await db.syncLog.create({
      data: {
        operation: 'auto_backup',
        filename: 'batch',
        status: result.success ? 'success' : 'error',
        message: result.message,
        details: JSON.stringify({
          totalChecked: result.totalChecked,
          newFilesBackedUp: result.newFilesBackedUp,
          modifiedFilesBackedUp: result.modifiedFilesBackedUp,
          skippedFiles: result.skippedFiles,
          errors: result.errors.length,
          duration,
        })
      }
    })
    
    return result
    
  } catch (error) {
    console.error('❌ Auto backup failed:', error)
    result.success = false
    result.message = `❌ Backup gagal: ${error instanceof Error ? error.message : 'Unknown error'}`
    result.errors.push({
      filename: 'system',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return result
  }
}

/**
 * Backup a single file to Google Drive
 */
async function backupSingleFile(fileChange: FileChangeInfo): Promise<{
  success: boolean
  error?: string
  driveFileId?: string
}> {
  try {
    // Download from R2
    const { buffer, contentType } = await downloadFromR2(fileChange.key)
    const checksum = calculateChecksum(buffer)
    
    // Check if we have an existing sync record
    const existingRecord = await db.fileSync.findFirst({
      where: { r2Key: fileChange.key }
    })
    
    // Upload to Google Drive
    const driveResult = await retry(() => 
      uploadFileToDriveFolder(buffer, fileChange.filename, contentType)
    )
    
    // Update or create sync record
    if (existingRecord) {
      await db.fileSync.update({
        where: { id: existingRecord.id },
        data: {
          driveFileId: driveResult.id,
          checksum,
          source: 'both',
          syncStatus: 'synced',
          driveModifiedAt: new Date(),
          r2ModifiedAt: fileChange.newModified,
          lastSyncedAt: new Date(),
          fileSize: buffer.length,
        }
      })
    } else {
      await db.fileSync.create({
        data: {
          filename: fileChange.filename,
          mimeType: contentType,
          fileSize: buffer.length,
          driveFileId: driveResult.id,
          r2Key: fileChange.key,
          checksum,
          source: 'both',
          syncStatus: 'synced',
          driveModifiedAt: new Date(),
          r2ModifiedAt: fileChange.newModified,
          lastSyncedAt: new Date(),
        }
      })
    }
    
    // Log the operation
    await db.syncLog.create({
      data: {
        operation: 'backup_r2_to_drive',
        filename: fileChange.filename,
        status: 'success',
        message: `${fileChange.changeType === 'new' ? 'New file' : 'Modified file'} backed up to Drive (${driveResult.id})`,
        details: JSON.stringify({
          changeType: fileChange.changeType,
          oldSize: fileChange.oldSize,
          newSize: fileChange.newSize,
          driveFileId: driveResult.id,
        })
      }
    })
    
    return { success: true, driveFileId: driveResult.id }
    
  } catch (error) {
    console.error(`❌ Failed to backup ${fileChange.filename}:`, error)
    
    // Log error
    await db.syncLog.create({
      data: {
        operation: 'backup_r2_to_drive',
        filename: fileChange.filename,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get backup status and last backup info
 */
export async function getBackupStatus(): Promise<{
  lastBackup: Date | null
  totalFiles: number
  syncedFiles: number
  pendingFiles: number
  errorFiles: number
  nextScheduledBackup?: Date
}> {
  // Get last backup log
  const lastBackupLog = await db.syncLog.findFirst({
    where: { operation: 'auto_backup' },
    orderBy: { createdAt: 'desc' }
  })
  
  // Get file counts
  const [totalFiles, syncedFiles, pendingFiles, errorFiles] = await Promise.all([
    db.fileSync.count(),
    db.fileSync.count({ where: { syncStatus: 'synced' } }),
    db.fileSync.count({ where: { syncStatus: 'pending' } }),
    db.fileSync.count({ where: { syncStatus: 'error' } }),
  ])
  
  return {
    lastBackup: lastBackupLog?.createdAt || null,
    totalFiles,
    syncedFiles,
    pendingFiles,
    errorFiles,
  }
}

/**
 * Quick check if any files need backup (without doing the backup)
 */
export async function checkIfBackupNeeded(): Promise<{
  needsBackup: boolean
  newFilesCount: number
  modifiedFilesCount: number
  unchangedFilesCount: number
  details: FileChangeInfo[]
}> {
  try {
    const changes = await detectChangesInR2()
    
    const newFiles = changes.filter(c => c.changeType === 'new')
    const modifiedFiles = changes.filter(c => c.changeType === 'modified')
    const unchangedFiles = changes.filter(c => c.changeType === 'unchanged')
    
    return {
      needsBackup: newFiles.length > 0 || modifiedFiles.length > 0,
      newFilesCount: newFiles.length,
      modifiedFilesCount: modifiedFiles.length,
      unchangedFilesCount: unchangedFiles.length,
      details: changes,
    }
  } catch (error) {
    console.error('Failed to check backup status:', error)
    return {
      needsBackup: false,
      newFilesCount: 0,
      modifiedFilesCount: 0,
      unchangedFilesCount: 0,
      details: [],
    }
  }
}
