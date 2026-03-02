/**
 * Auto-Rename API
 *
 * Automatically renames files in R2 to match their judul (title) and tahun (year)
 * Called at login time to ensure consistency between file names and titles
 *
 * Format: [judul] - [tahun].[extension]
 * Example: SOP Penanganan Bencana - 2024.pdf
 *
 * Handles edge cases:
 * - File already renamed in R2 but database not updated
 * - File in R2 needs to be renamed
 * - File missing from R2
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renameR2Object, isR2Configured, checkR2FileExists } from '@/lib/r2-storage'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface RenameResult {
  id: string
  judul: string
  oldFileName: string
  newFileName: string
  oldFilePath: string
  newFilePath: string
  action: 'renamed' | 'synced' | 'no_change' | 'error'
  error?: string
}

/**
 * POST /api/auto-rename
 *
 * Check all files and rename those whose names don't match the expected format
 * Also syncs database with files that were already renamed in R2
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json({
        error: 'R2 storage tidak terkonfigurasi',
        renamed: 0
      }, { status: 500 })
    }

    // Get all SOP files
    const sopFiles = await db.sopFile.findMany({
      select: {
        id: true,
        judul: true,
        tahun: true,
        fileName: true,
        filePath: true,
        fileType: true
      }
    })

    console.log(`🔄 [Auto-Rename] Checking ${sopFiles.length} files...`)

    const results: RenameResult[] = []
    let renamedCount = 0
    let syncedCount = 0
    let errorCount = 0

    for (const sop of sopFiles) {
      try {
        // Generate expected filename from judul and tahun
        // Format: [judul] - [tahun].[extension]
        const sanitizeFileName = (name: string) =>
          name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)

        // Get file extension
        const fileExt = sop.fileName.split('.').pop()?.toLowerCase() || 'pdf'

        // Expected filename with format: judul - tahun.extension
        const expectedFileName = `${sanitizeFileName(sop.judul)} - ${sop.tahun}.${fileExt}`

        // Check if rename is needed
        if (sop.fileName === expectedFileName) {
          // No rename needed - file already has correct format
          results.push({
            id: sop.id,
            judul: sop.judul,
            oldFileName: sop.fileName,
            newFileName: sop.fileName,
            oldFilePath: sop.filePath,
            newFilePath: sop.filePath,
            action: 'no_change'
          })
          continue
        }

        // Rename is needed
        console.log(`📝 [Auto-Rename] Rename needed:`)
        console.log(`   ID: ${sop.id}`)
        console.log(`   Judul: ${sop.judul}`)
        console.log(`   Tahun: ${sop.tahun}`)
        console.log(`   Old: ${sop.fileName}`)
        console.log(`   New: ${expectedFileName}`)

        // Generate new R2 key (preserve folder structure)
        const oldKey = sop.filePath
        const folderPath = oldKey.substring(0, oldKey.lastIndexOf('/') + 1)
        const newKey = folderPath ? `${folderPath}${expectedFileName}` : expectedFileName

        console.log(`   Old Key: ${oldKey}`)
        console.log(`   New Key: ${newKey}`)

        // STEP 1: Check if NEW file already exists in R2
        // (File was renamed but database wasn't updated)
        const newFileExists = await checkR2FileExists(newKey)

        if (newFileExists) {
          // File already renamed in R2 - just sync database
          console.log(`   ℹ️ NEW file already exists in R2, syncing database...`)

          await db.sopFile.update({
            where: { id: sop.id },
            data: {
              fileName: expectedFileName,
              filePath: newKey
            }
          })

          results.push({
            id: sop.id,
            judul: sop.judul,
            oldFileName: sop.fileName,
            newFileName: expectedFileName,
            oldFilePath: oldKey,
            newFilePath: newKey,
            action: 'synced'
          })

          syncedCount++
          console.log(`   ✅ Database synced (file was already renamed in R2)`)
          continue
        }

        // STEP 2: Check if OLD file exists in R2
        const oldFileExists = await checkR2FileExists(oldKey)

        if (!oldFileExists) {
          // Neither old nor new file exists - this is an error
          console.log(`   ❌ Neither old nor new file found in R2`)

          results.push({
            id: sop.id,
            judul: sop.judul,
            oldFileName: sop.fileName,
            newFileName: expectedFileName,
            oldFilePath: oldKey,
            newFilePath: newKey,
            action: 'error',
            error: 'File tidak ditemukan di R2 (baik format lama maupun baru)'
          })

          errorCount++
          continue
        }

        // STEP 3: Rename file in R2 (OLD exists, NEW doesn't exist)
        console.log(`   🔄 Renaming in R2: ${oldKey} → ${newKey}`)
        const renameResult = await renameR2Object(oldKey, newKey)

        if (renameResult.success) {
          // Update database
          await db.sopFile.update({
            where: { id: sop.id },
            data: {
              fileName: expectedFileName,
              filePath: newKey
            }
          })

          results.push({
            id: sop.id,
            judul: sop.judul,
            oldFileName: sop.fileName,
            newFileName: expectedFileName,
            oldFilePath: oldKey,
            newFilePath: newKey,
            action: 'renamed'
          })

          renamedCount++
          console.log(`   ✅ Renamed successfully`)
        } else {
          results.push({
            id: sop.id,
            judul: sop.judul,
            oldFileName: sop.fileName,
            newFileName: expectedFileName,
            oldFilePath: oldKey,
            newFilePath: newKey,
            action: 'error',
            error: renameResult.error || 'R2 rename failed'
          })

          errorCount++
          console.log(`   ❌ Rename failed: ${renameResult.error}`)
        }

      } catch (err) {
        console.error(`   ❌ Error processing file ${sop.id}:`, err)
        results.push({
          id: sop.id,
          judul: sop.judul,
          oldFileName: sop.fileName,
          newFileName: sop.fileName,
          oldFilePath: sop.filePath,
          newFilePath: sop.filePath,
          action: 'error',
          error: err instanceof Error ? err.message : 'Unknown error'
        })
        errorCount++
      }
    }

    const duration = Date.now() - startTime
    console.log(`\n✅ [Auto-Rename] Complete in ${duration}ms`)
    console.log(`   Total: ${sopFiles.length}`)
    console.log(`   Renamed: ${renamedCount}`)
    console.log(`   Synced (already renamed): ${syncedCount}`)
    console.log(`   Errors: ${errorCount}\n`)

    return NextResponse.json({
      success: true,
      message: `Auto-rename complete: ${renamedCount} renamed, ${syncedCount} synced, ${errorCount} errors`,
      total: sopFiles.length,
      renamed: renamedCount,
      synced: syncedCount,
      errors: errorCount,
      results: results.filter(r => r.action !== 'no_change')
    })

  } catch (error) {
    console.error('[Auto-Rename] Error:', error)
    return NextResponse.json({
      error: 'Gagal menjalankan auto-rename',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
