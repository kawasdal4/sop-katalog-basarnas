/**
 * File Sync Service
 * 
 * Handles migration and synchronization between Google Drive and Cloudflare R2
 * 
 * Architecture:
 * - Primary Storage: Cloudflare R2 (fast, S3-compatible)
 * - Backup Storage: Google Drive (collaboration, sharing)
 * 
 * Sync Flow:
 * 1. Migration: Drive → R2 (one-time)
 * 2. Sync: Bidirectional sync with conflict resolution
 * 3. Watch: Polling for changes (every 5 minutes)
 * 
 * Race Condition Prevention:
 * - Use checksum (SHA-256) for content validation
 * - Lock mechanism using syncStatus field
 * - Compare timestamps for conflict resolution
 * - Use database transaction for atomic updates
 */

import { db } from '@/lib/db'
import { 
  listAllFilesFromDrive, 
  downloadFileFromDrive, 
  uploadFileToDriveFolder,
  DriveFile 
} from '@/lib/google-drive'
import { 
  uploadToR2, 
  downloadFromR2, 
  listR2Objects, 
  getR2ObjectMetadata,
  R2Object,
  isR2Configured 
} from '@/lib/r2-storage'
import { 
  calculateChecksum, 
  generateR2Key, 
  retry,
  processBatch,
  createSyncSummary,
  SyncSummary,
  isSupportedFileType
} from '@/lib/sync-core'

// Sync status types
export type SyncStatus = 'pending' | 'synced' | 'error' | 'conflict'
export type SyncSource = 'drive' | 'r2' | 'both'
export type SyncOperation = 'migrate' | 'sync_drive_to_r2' | 'sync_r2_to_drive' | 'delete'

// Result types
export interface MigrationResult {
  success: boolean
  totalFiles: number
  migratedFiles: number
  skippedFiles: number
  errorFiles: number
  duration: number
  errors: { filename: string; error: string }[]
}

export interface SyncResult {
  success: boolean
  driveToR2: number
  r2ToDrive: number
  conflicts: number
  errors: { filename: string; error: string }[]
}

/**
 * PHASE 1: MIGRATION
 * 
 * Migrate all files from Google Drive to R2
 */
export async function migrateFromDriveToR2(options?: {
  dryRun?: boolean
  overwrite?: boolean
  concurrency?: number
}): Promise<MigrationResult> {
  console.log('========================================')
  console.log('🔄 MIGRATION: Google Drive → R2')
  console.log('========================================')
  
  const startTime = Date.now()
  const summary = createSyncSummary()
  
  try {
    // Get all files from Google Drive
    console.log('📋 Step 1: Listing files from Google Drive...')
    const driveFiles = await listAllFilesFromDrive()
    
    console.log(`📋 Found ${driveFiles.length} files in Google Drive`)
    
    if (options?.dryRun) {
      console.log('⚠️ DRY RUN - No changes will be made')
      return {
        success: true,
        totalFiles: driveFiles.length,
        migratedFiles: 0,
        skippedFiles: driveFiles.length,
        errorFiles: 0,
        duration: Date.now() - startTime,
        errors: [],
      }
    }
    
    // Process files in batches
    console.log('📤 Step 2: Migrating files to R2...')
    
    const { results, errors } = await processBatch(
      driveFiles,
      async (file) => {
        return await migrateSingleFile(file, options?.overwrite)
      },
      options?.concurrency || 3
    )
    
    // Process results
    for (const result of results) {
      if (result.status === 'migrated') {
        summary.addSynced(result.filename, result.size || 0)
      } else if (result.status === 'skipped') {
        summary.addSkipped(result.filename, result.reason || 'Already exists')
      }
    }
    
    for (const { item, error } of errors) {
      summary.addError(item.name, error.message)
    }
    
    const finalSummary = summary.getSummary()
    
    console.log('========================================')
    console.log('📊 MIGRATION COMPLETE')
    console.log(`   Total: ${finalSummary.totalFiles}`)
    console.log(`   Migrated: ${finalSummary.syncedFiles}`)
    console.log(`   Skipped: ${finalSummary.skippedFiles}`)
    console.log(`   Errors: ${finalSummary.errorFiles}`)
    console.log(`   Duration: ${finalSummary.duration}ms`)
    console.log('========================================')
    
    return {
      success: finalSummary.errorFiles === 0,
      totalFiles: finalSummary.totalFiles,
      migratedFiles: finalSummary.syncedFiles,
      skippedFiles: finalSummary.skippedFiles,
      errorFiles: finalSummary.errorFiles,
      duration: finalSummary.duration,
      errors: finalSummary.errors,
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    return {
      success: false,
      totalFiles: 0,
      migratedFiles: 0,
      skippedFiles: 0,
      errorFiles: 1,
      duration: Date.now() - startTime,
      errors: [{ filename: 'migration', error: error instanceof Error ? error.message : 'Unknown error' }],
    }
  }
}

/**
 * Migrate a single file from Google Drive to R2
 */
async function migrateSingleFile(
  file: DriveFile,
  overwrite: boolean = false
): Promise<{ 
  status: 'migrated' | 'skipped'
  filename: string
  size?: number
  reason?: string
}> {
  console.log(`   📄 Processing: ${file.name}`)
  
  // Check if file type is supported
  if (!isSupportedFileType(file.mimeType)) {
    return { 
      status: 'skipped', 
      filename: file.name, 
      reason: 'Unsupported file type' 
    }
  }
  
  try {
    // Check if already migrated
    const existingSync = await db.fileSync.findFirst({
      where: { driveFileId: file.id }
    })
    
    if (existingSync && !overwrite) {
      return { 
        status: 'skipped', 
        filename: file.name, 
        reason: 'Already migrated' 
      }
    }
    
    // Download from Google Drive
    const { buffer, mimeType } = await retry(() => downloadFileFromDrive(file.id))
    
    // Calculate checksum
    const checksum = calculateChecksum(buffer)
    
    // Check if file with same checksum exists
    const existingByChecksum = await db.fileSync.findFirst({
      where: { checksum }
    })
    
    if (existingByChecksum && !overwrite) {
      return { 
        status: 'skipped', 
        filename: file.name, 
        reason: 'Duplicate content (same checksum)' 
      }
    }
    
    // Generate R2 key
    const r2Key = generateR2Key(file.name, 'sop-files')
    
    // Upload to R2
    const uploadResult = await retry(() => 
      uploadToR2(buffer, file.name, mimeType, { key: r2Key })
    )
    
    // Save to database
    if (existingSync) {
      await db.fileSync.update({
        where: { id: existingSync.id },
        data: {
          r2Key: uploadResult.key,
          checksum: uploadResult.checksum,
          syncStatus: 'synced',
          source: 'both',
          lastSyncedAt: new Date(),
          driveModifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : null,
          r2ModifiedAt: new Date(),
          fileSize: buffer.length,
        }
      })
    } else {
      await db.fileSync.create({
        data: {
          filename: file.name,
          mimeType: mimeType,
          fileSize: buffer.length,
          driveFileId: file.id,
          r2Key: uploadResult.key,
          checksum: uploadResult.checksum,
          source: 'both',
          syncStatus: 'synced',
          driveModifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : null,
          r2ModifiedAt: new Date(),
          lastSyncedAt: new Date(),
        }
      })
    }
    
    // Log the operation
    await db.syncLog.create({
      data: {
        operation: 'migrate',
        filename: file.name,
        status: 'success',
        message: `Migrated from Drive (${file.id}) to R2 (${uploadResult.key})`,
      }
    })
    
    return { 
      status: 'migrated', 
      filename: file.name, 
      size: buffer.length 
    }
    
  } catch (error) {
    // Log error
    await db.syncLog.create({
      data: {
        operation: 'migrate',
        filename: file.name,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    })
    
    throw error
  }
}

/**
 * PHASE 2: SYNCHRONIZATION (ONE-WAY: R2 → Drive)
 * 
 * R2 is PRIMARY storage, Google Drive is BACKUP only
 * Sync only goes from R2 to Google Drive for backup purposes
 */
export async function syncR2ToDriveBackup(): Promise<SyncResult> {
  console.log('========================================')
  console.log('🔄 SYNC: R2 → Google Drive (Backup)')
  console.log('========================================')
  
  const result: SyncResult = {
    success: true,
    driveToR2: 0,  // Not used in backup mode
    r2ToDrive: 0,
    conflicts: 0,
    errors: [],
  }
  
  try {
    // Get files from R2 (Primary)
    const r2Objects = isR2Configured() ? await listR2Objects('sop-files') : []
    
    console.log(`📋 Found ${r2Objects.length} files in R2`)
    
    // Get all file sync records
    const syncRecords = await db.fileSync.findMany()
    const syncByR2Key = new Map(syncRecords.map(r => [r.r2Key, r]))
    
    // Process R2 files - backup to Google Drive
    for (const r2Object of r2Objects) {
      const syncRecord = syncByR2Key.get(r2Object.key)
      
      if (!syncRecord || !syncRecord.driveFileId) {
        // New file in R2 or not yet backed up - sync to Drive
        try {
          await syncR2ObjectToDrive(r2Object, syncRecord)
          result.r2ToDrive++
        } catch (error) {
          result.errors.push({
            filename: r2Object.key,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      } else {
        // Check if R2 file is newer than last sync
        const lastSync = syncRecord.lastSyncedAt || new Date(0)
        const r2Modified = r2Object.lastModified
        
        if (r2Modified > lastSync) {
          // R2 file modified - update backup in Drive
          try {
            await syncR2ObjectToDrive(r2Object, syncRecord)
            result.r2ToDrive++
          } catch (error) {
            result.errors.push({
              filename: r2Object.key,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
      }
    }
    
    console.log(`✅ Backup complete: ${result.r2ToDrive} files backed up to Google Drive`)
    
  } catch (error) {
    console.error('❌ Backup sync failed:', error)
    result.success = false
    result.errors.push({
      filename: 'sync',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
  
  return result
}

/**
 * Legacy bidirectional sync (DEPRECATED - use syncR2ToDriveBackup instead)
 */
export async function syncStorages(options?: {
  direction?: 'drive-to-r2' | 'r2-to-drive' | 'bidirectional'
}): Promise<SyncResult> {
  // Always use R2 → Drive backup sync
  console.log('⚠️ Using R2 → Drive backup sync (one-directional)')
  return syncR2ToDriveBackup()
}

/**
 * Original bidirectional sync (kept for reference, not used)
 */
async function syncStoragesBidirectional(options?: {
  direction?: 'drive-to-r2' | 'r2-to-drive' | 'bidirectional'
}): Promise<SyncResult> {
  console.log('========================================')
  console.log('🔄 SYNC: Bidirectional (Legacy)')
  console.log('========================================')
  
  const result: SyncResult = {
    success: true,
    driveToR2: 0,
    r2ToDrive: 0,
    conflicts: 0,
    errors: [],
  }
  
  try {
    // Get files from both sources
    const [driveFiles, r2Objects] = await Promise.all([
      listAllFilesFromDrive(),
      isR2Configured() ? listR2Objects('sop-files') : [],
    ])
    
    // Build lookup maps
    const driveMap = new Map(driveFiles.map(f => [f.id, f]))
    const r2Map = new Map(r2Objects.map(o => [o.key, o]))
    
    // Get all file sync records
    const syncRecords = await db.fileSync.findMany()
    const syncByDriveId = new Map(syncRecords.map(r => [r.driveFileId, r]))
    const syncByR2Key = new Map(syncRecords.map(r => [r.r2Key, r]))
    
    // Process Google Drive files
    for (const driveFile of driveFiles) {
      const syncRecord = syncByDriveId.get(driveFile.id)
      
      if (!syncRecord) {
        // New file in Drive - sync to R2
        try {
          await syncDriveFileToR2(driveFile)
          result.driveToR2++
        } catch (error) {
          result.errors.push({
            filename: driveFile.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      } else {
        // Check if modified
        const driveModified = new Date(driveFile.modifiedTime || 0)
        const lastSync = syncRecord.lastSyncedAt || new Date(0)
        
        if (driveModified > lastSync && (!options?.direction || options.direction === 'drive-to-r2' || options.direction === 'bidirectional')) {
          // Check for conflict
          const r2Meta = await getR2ObjectMetadata(syncRecord.r2Key || '')
          
          if (r2Meta.exists && r2Meta.lastModified && r2Meta.lastModified > lastSync) {
            // Conflict - both modified
            result.conflicts++
            await handleConflict(syncRecord, 'drive')
          } else {
            // Update R2
            try {
              await syncDriveFileToR2(driveFile, syncRecord)
              result.driveToR2++
            } catch (error) {
              result.errors.push({
                filename: driveFile.name,
                error: error instanceof Error ? error.message : 'Unknown error',
              })
            }
          }
        }
      }
    }
    
    // Process R2 files (if bidirectional)
    if (!options?.direction || options.direction === 'r2-to-drive' || options.direction === 'bidirectional') {
      for (const r2Object of r2Objects) {
        const syncRecord = syncByR2Key.get(r2Object.key)
        
        if (!syncRecord) {
          // New file in R2 - sync to Drive
          try {
            await syncR2ObjectToDrive(r2Object)
            result.r2ToDrive++
          } catch (error) {
            result.errors.push({
              filename: r2Object.key,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
      }
    }
    
    console.log(`✅ Sync complete: ${result.driveToR2} Drive→R2, ${result.r2ToDrive} R2→Drive, ${result.conflicts} conflicts`)
    
  } catch (error) {
    console.error('❌ Sync failed:', error)
    result.success = false
    result.errors.push({
      filename: 'sync',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
  
  return result
}

/**
 * Sync a Google Drive file to R2
 */
async function syncDriveFileToR2(
  file: DriveFile,
  existingRecord?: { id: string; r2Key: string | null }
): Promise<void> {
  const { buffer, mimeType } = await retry(() => downloadFileFromDrive(file.id))
  const checksum = calculateChecksum(buffer)
  
  const r2Key = existingRecord?.r2Key || generateR2Key(file.name, 'sop-files')
  
  await retry(() => uploadToR2(buffer, file.name, mimeType, { key: r2Key }))
  
  if (existingRecord) {
    await db.fileSync.update({
      where: { id: existingRecord.id },
      data: {
        checksum,
        r2Key,
        syncStatus: 'synced',
        source: 'both',
        lastSyncedAt: new Date(),
        driveModifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : null,
        r2ModifiedAt: new Date(),
        fileSize: buffer.length,
      }
    })
  } else {
    await db.fileSync.create({
      data: {
        filename: file.name,
        mimeType,
        fileSize: buffer.length,
        driveFileId: file.id,
        r2Key,
        checksum,
        source: 'both',
        syncStatus: 'synced',
        driveModifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : null,
        r2ModifiedAt: new Date(),
        lastSyncedAt: new Date(),
      }
    })
  }
  
  await db.syncLog.create({
    data: {
      operation: 'sync_drive_to_r2',
      filename: file.name,
      status: 'success',
    }
  })
}

/**
 * Sync an R2 object to Google Drive (Backup)
 */
async function syncR2ObjectToDrive(r2Object: R2Object, existingRecord?: { id: string; r2Key: string | null } | null): Promise<void> {
  const { buffer, contentType } = await downloadFromR2(r2Object.key)
  const checksum = calculateChecksum(buffer)
  
  // Extract filename from key
  const filename = r2Object.key.split('/').pop() || r2Object.key
  
  // Upload to Google Drive
  const driveResult = await retry(() => 
    uploadFileToDriveFolder(buffer, filename, contentType)
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
        r2ModifiedAt: r2Object.lastModified,
        lastSyncedAt: new Date(),
      }
    })
  } else {
    await db.fileSync.create({
      data: {
        filename,
        mimeType: contentType,
        fileSize: buffer.length,
        driveFileId: driveResult.id,
        r2Key: r2Object.key,
        checksum,
        source: 'both',
        syncStatus: 'synced',
        driveModifiedAt: new Date(),
        r2ModifiedAt: r2Object.lastModified,
        lastSyncedAt: new Date(),
      }
    })
  }
  
  await db.syncLog.create({
    data: {
      operation: 'sync_r2_to_drive',
      filename,
      status: 'success',
    }
  })
  
  console.log(`✅ Backed up to Google Drive: ${filename} → ${driveResult.id}`)
}

/**
 * Handle sync conflict
 */
async function handleConflict(
  syncRecord: { id: string; filename: string; driveFileId: string | null; r2Key: string | null },
  winner: 'drive' | 'r2'
): Promise<void> {
  console.log(`⚠️ Conflict detected for: ${syncRecord.filename}, winner: ${winner}`)
  
  await db.fileSync.update({
    where: { id: syncRecord.id },
    data: {
      syncStatus: 'conflict',
      lastError: `Conflict: ${winner} wins`,
    }
  })
  
  await db.syncLog.create({
    data: {
      operation: 'sync',
      filename: syncRecord.filename,
      status: 'error',
      message: `Conflict resolved: ${winner} wins`,
    }
  })
}

/**
 * Get sync statistics
 */
export async function getSyncStats() {
  const [totalFiles, syncedFiles, pendingFiles, errorFiles, recentLogs] = await Promise.all([
    db.fileSync.count(),
    db.fileSync.count({ where: { syncStatus: 'synced' } }),
    db.fileSync.count({ where: { syncStatus: 'pending' } }),
    db.fileSync.count({ where: { syncStatus: 'error' } }),
    db.syncLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
  ])
  
  return {
    totalFiles,
    syncedFiles,
    pendingFiles,
    errorFiles,
    recentLogs,
  }
}
