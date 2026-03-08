import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { downloadFromR2, isR2Configured } from '@/lib/r2-storage'
import path from 'path'
import { access, readFile } from 'fs/promises'

export const dynamic = 'force-dynamic'

// Content types for different file types
const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
}

/**
 * Sanitize filename by removing invalid characters
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

/**
 * GET /api/download?id={sopId}&path={r2Path}
 * 
 * Download file from R2 (Primary Storage) with custom filename
 * Supports both database ID and direct R2 Path.
 */
export async function GET(request: NextRequest) {
  try {
    const sopId = request.nextUrl.searchParams.get('id')
    const pathParam = request.nextUrl.searchParams.get('path')

    if (!sopId && !pathParam) {
      return NextResponse.json({ error: 'ID atau Path SOP diperlukan' }, { status: 400 })
    }

    let fileKey = ''
    let fileName = ''
    let judul = ''
    let tahun = ''
    let skipUpdateCount = false
    let recordId = sopId

    if (sopId) {
      // 1. Try to get from sopFile (Standard SOPs)
      const sopRecord = await db.sopFile.findUnique({
        where: { id: sopId }
      })

      if (sopRecord) {
        fileKey = sopRecord.filePath
        fileName = sopRecord.fileName
        judul = sopRecord.judul
        tahun = sopRecord.tahun?.toString() || ''
      } else {
        // 2. Try to get from sopPembuatan (SOP Builder drafts/finals)
        console.log(`🔍 [Download] Searching in sopPembuatan for ID: ${sopId}`)
        const sopPembuatan = await (db as any).sopPembuatan.findUnique({
          where: { id: sopId }
        })

        if (sopPembuatan) {
          fileKey = sopPembuatan.combinedPdfPath
          fileName = `sop-${sopPembuatan.judul}.pdf`
          judul = sopPembuatan.judul
          tahun = new Date().getFullYear().toString()
          skipUpdateCount = true
        }
      }

      if (!fileKey) {
        return NextResponse.json({ error: 'File tidak ditemukan atau belum tersedia' }, { status: 404 })
      }
    } else if (pathParam) {
      fileKey = decodeURIComponent(pathParam)
      // Infer filename from path
      const parts = fileKey.split('/')
      fileName = parts[parts.length - 1]
      judul = fileName.replace(/\.[^/.]+$/, "")
      tahun = new Date().getFullYear().toString()
      skipUpdateCount = true
      recordId = null
    }

    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json({ error: 'R2 storage tidak terkonfigurasi' }, { status: 500 })
    }

    // Extract file extension
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'pdf'

    // Generate custom filename from judul and tahun
    // Format: {judul} - {tahun}.{extension}
    const customFileName = `${sanitizeFileName(judul)} - ${tahun}.${fileExt}`

    console.log(`📥 [Download] Request: ${judul}`)
    console.log(`📁 [Download] R2 key: ${fileKey}`)

    // Get content type
    const contentType = CONTENT_TYPES[fileExt] || 'application/octet-stream'

    // Encode filename for Content-Disposition header (RFC 5987)
    const encodedFileName = encodeURIComponent(customFileName)

    const sendDownloadResponse = (fileBuffer: Buffer) => {
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${customFileName}"; filename*=UTF-8''${encodedFileName}`,
          'Content-Length': fileBuffer.length.toString(),
        },
      })
    }

    const r2AccountId = process.env.R2_ACCOUNT_ID || ''
    const isDummyR2 = process.env.NODE_ENV !== 'production' && (r2AccountId === 'dummy-account-id' || r2AccountId.startsWith('dummy-'))

    let fileBuffer: Buffer | null = null

    if (isDummyR2) {
      const keyBaseName = fileKey.split('/').pop() || ''
      const fallbackRoots = ['uploads', 'upload', 'store', path.join('store', 'uploads')]
      const candidates = fallbackRoots.flatMap((root) => {
        const base = path.join(process.cwd(), root)
        return [
          path.join(base, fileName),
          keyBaseName ? path.join(base, keyBaseName) : '',
          path.join(base, fileKey.replace(/\//g, path.sep)),
        ]
      }).filter(Boolean)

      if (path.isAbsolute(fileKey)) {
        candidates.push(fileKey)
      }

      for (const candidate of [...new Set(candidates)]) {
        try {
          await access(candidate)
          fileBuffer = await readFile(candidate)
          console.log(`✅ [Download] Sending ${fileBuffer.length} bytes from local fallback: ${candidate}`)
          break
        } catch {
        }
      }

      if (!fileBuffer) {
        return NextResponse.json({
          error: 'Download tidak tersedia pada mode storage dummy',
          details: 'File tidak ditemukan di fallback lokal. Pastikan file ada di folder uploads/ atau upload ulang file.',
        }, { status: 503 })
      }
    } else {
      const result = await downloadFromR2(fileKey)
      fileBuffer = result.buffer
      console.log(`✅ [Download] Sending ${fileBuffer.length} bytes from R2`)
    }

    // Increment download count (only for standard sopFile)
    if (sopId && !skipUpdateCount) {
      try {
        await db.sopFile.update({
          where: { id: sopId },
          data: { downloadCount: { increment: 1 } }
        }).catch(() => { }) // Ignore if not in sopFile
      } catch (err) {
        console.warn('⚠️ Gagal update download count')
      }
    }

    // Create log
    try {
      const cookieStore = await import('next/headers').then(m => m.cookies())
      const userId = (await cookieStore).get('userId')?.value
      if (userId) {
        await db.log.create({
          data: {
            userId,
            aktivitas: 'DOWNLOAD',
            deskripsi: `Download: ${judul}`,
            fileId: recordId || 'path-direct'
          }
        })
      }
    } catch {
      // Ignore log errors
    }

    // Return file with custom filename
    return sendDownloadResponse(fileBuffer)

  } catch (error) {
    console.error('[Download API] Error:', error)
    return NextResponse.json({
      error: 'Gagal mengunduh file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
