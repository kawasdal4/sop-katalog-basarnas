/**
 * R2 Files API - List and compare files in R2 vs Database
 * Useful for diagnosing missing files
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { listR2Objects, isR2Configured } from '@/lib/r2-storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!isR2Configured()) {
      return NextResponse.json({ error: 'R2 not configured' }, { status: 500 })
    }

    // Get all files from R2
    const r2Objects = await listR2Objects()
    const r2Keys = new Set(r2Objects.map(obj => obj.key))

    // Get all files from database
    const dbFiles = await db.sopFile.findMany({
      select: {
        id: true,
        judul: true,
        tahun: true,
        fileName: true,
        filePath: true,
        fileType: true,
        uploadedAt: true,
      },
      orderBy: { uploadedAt: 'desc' }
    })

    // Compare
    const missing: typeof dbFiles = []
    const existing: (typeof dbFiles[0] & { r2Size?: number; r2LastModified?: Date })[] = []

    for (const file of dbFiles) {
      if (r2Keys.has(file.filePath)) {
        const r2Obj = r2Objects.find(obj => obj.key === file.filePath)
        existing.push({
          ...file,
          r2Size: r2Obj?.size,
          r2LastModified: r2Obj?.lastModified,
        })
      } else {
        missing.push(file)
      }
    }

    // Files in R2 but not in database
    const dbPaths = new Set(dbFiles.map(f => f.filePath))
    const orphaned = r2Objects.filter(obj => !dbPaths.has(obj.key))

    return NextResponse.json({
      summary: {
        totalInDatabase: dbFiles.length,
        totalInR2: r2Objects.length,
        existingCount: existing.length,
        missingCount: missing.length,
        orphanedCount: orphaned.length,
      },
      missing: missing.map(f => ({
        id: f.id,
        judul: f.judul,
        tahun: f.tahun,
        fileName: f.fileName,
        filePath: f.filePath,
        uploadedAt: f.uploadedAt,
      })),
      orphaned: orphaned.map(o => ({
        key: o.key,
        size: o.size,
        lastModified: o.lastModified,
      })),
      // Limit existing files to prevent huge response
      existingPreview: existing.slice(0, 10).map(f => ({
        id: f.id,
        judul: f.judul,
        fileName: f.fileName,
        filePath: f.filePath,
        r2Size: f.r2Size,
      })),
    })
  } catch (error) {
    console.error('Error listing R2 files:', error)
    return NextResponse.json({
      error: 'Failed to list files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
