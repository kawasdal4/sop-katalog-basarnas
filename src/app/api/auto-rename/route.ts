/**
 * Auto-Rename API
 * 
 * Automatically renames files in R2 to match their judul (title)
 * Called at login time to ensure consistency between file names and titles
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renameR2Object, isR2Configured } from '@/lib/r2-storage'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface RenameResult {
  id: string
  judul: string
  oldFileName: string
  newFileName: string
  renamed: boolean
  error?: string
}

/**
 * POST /api/auto-rename
 * 
 * Check all files and rename those whose names don't match their titles
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
        fileName: true,
        filePath: true,
        fileType: true
      }
    })

    console.log(`🔄 [Auto-Rename] Checking ${sopFiles.length} files...`)

    const results: RenameResult[] = []
    let renamedCount = 0
    let errorCount = 0

    for (const sop of sopFiles) {
      try {
        // Generate expected filename from judul
        const sanitizeFileName = (name: string) =>
          name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)

        // Get file extension
        const fileExt = sop.fileName.split('.').pop()?.toLowerCase() || 'pdf'

        // Expected filename
        const expectedFileName = `${sanitizeFileName(sop.judul)}.${fileExt}`

        // Check if rename is needed
        if (sop.fileName !== expectedFileName) {
          console.log(`📝 [Auto-Rename] Rename needed:`)
          console.log(`   ID: ${sop.id}`)
          console.log(`   Judul: ${sop.judul}`)
          console.log(`   Old: ${sop.fileName}`)
          console.log(`   New: ${expectedFileName}`)

          // Generate new R2 key
          const oldKey = sop.filePath
          const newKey = oldKey.replace(/[^/]+$/, expectedFileName)

          // Rename in R2
          if (oldKey !== newKey) {
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
                renamed: true
              })

              renamedCount++
              console.log(`   ✅ Renamed successfully`)
            } else {
              results.push({
                id: sop.id,
                judul: sop.judul,
                oldFileName: sop.fileName,
                newFileName: expectedFileName,
                renamed: false,
                error: renameResult.error || 'R2 rename failed'
              })

              errorCount++
              console.log(`   ❌ Rename failed: ${renameResult.error}`)
            }
          } else {
            // File path already matches (only fileName in DB needs update)
            await db.sopFile.update({
              where: { id: sop.id },
              data: { fileName: expectedFileName }
            })

            results.push({
              id: sop.id,
              judul: sop.judul,
              oldFileName: sop.fileName,
              newFileName: expectedFileName,
              renamed: true
            })

            renamedCount++
            console.log(`   ✅ Database updated (R2 key already correct)`)
          }
        } else {
          // No rename needed
          results.push({
            id: sop.id,
            judul: sop.judul,
            oldFileName: sop.fileName,
            newFileName: sop.fileName,
            renamed: false
          })
        }
      } catch (err) {
        console.error(`   ❌ Error processing file ${sop.id}:`, err)
        results.push({
          id: sop.id,
          judul: sop.judul,
          oldFileName: sop.fileName,
          newFileName: sop.fileName,
          renamed: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
        errorCount++
      }
    }

    const duration = Date.now() - startTime
    console.log(`\n✅ [Auto-Rename] Complete in ${duration}ms`)
    console.log(`   Total: ${sopFiles.length}, Renamed: ${renamedCount}, Errors: ${errorCount}\n`)

    return NextResponse.json({
      success: true,
      message: `Auto-rename complete: ${renamedCount} files renamed, ${errorCount} errors`,
      total: sopFiles.length,
      renamed: renamedCount,
      errors: errorCount,
      results: results.filter(r => r.renamed || r.error)
    })

  } catch (error) {
    console.error('[Auto-Rename] Error:', error)
    return NextResponse.json({
      error: 'Gagal menjalankan auto-rename',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
