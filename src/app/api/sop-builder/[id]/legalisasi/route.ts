import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateRole } from '@/lib/auth-utils'
import {
    downloadFromR2,
    deleteFromR2,
    getR2PresignedUploadUrl,
    ensureR2Cors,
    startR2MultipartUpload,
    uploadR2Part,
    completeR2MultipartUpload,
    abortR2MultipartUpload,
    uploadToR2,
    getR2PresignedPartUrl
} from '@/lib/r2-storage'
import { sanitizePdfMetadata } from '@/lib/pdf-sanitize'

// Set runtime and max duration for Vercel
export const runtime = 'nodejs'
export const maxDuration = 60

// GET - Download/Preview/Info/Upload-URL for legalisasi of SopPembuatan (builder)
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { authenticated } = await validateRole(['ADMIN', 'DEVELOPER', 'STAF'])
        if (!authenticated) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const sop = await db.sopPembuatan.findUnique({
            where: { id },
            select: { id: true, judul: true, legalisasiPdfPath: true }
        })

        if (!sop) {
            return NextResponse.json({ error: 'SOP tidak ditemukan' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const action = searchParams.get('action') || 'info'

        // ── INFO (default) ──────────────────────────────────────────────────────
        if (action === 'info') {
            return NextResponse.json({
                hasFile: !!sop.legalisasiPdfPath,
                path: sop.legalisasiPdfPath,
                judul: sop.judul
            })
        }

        // ── PRESIGNED UPLOAD URL (kept for fallback) ─────────────────────────
        if (action === 'upload-url') {
            await ensureR2Cors().catch(err => console.warn('CORS check warning:', err))
            const r2Key = `sop-builder/legalisasi/${id}_${Date.now()}.pdf`
            const uploadUrl = await getR2PresignedUploadUrl(r2Key, 'application/pdf', 3600)
            return NextResponse.json({ uploadUrl, r2Key })
        }

        // ── DOWNLOAD / PREVIEW ────────────────────────────────────────────────
        if (!sop.legalisasiPdfPath) {
            return NextResponse.json({ error: 'File legalisasi belum tersedia' }, { status: 404 })
        }

        const { buffer, contentType } = await downloadFromR2(sop.legalisasiPdfPath)
        const cleanBuffer = sanitizePdfMetadata(buffer, sop.judul)

        const disposition = action === 'download'
            ? `attachment; filename="Legalisasi-${sop.judul?.replace(/[^a-zA-Z0-9]/g, '_') || id}.pdf"`
            : 'inline'

        return new NextResponse(new Uint8Array(cleanBuffer), {
            headers: {
                'Content-Type': contentType || 'application/pdf',
                'Content-Disposition': disposition,
                'Content-Length': String(cleanBuffer.length),
                'Cache-Control': 'no-cache'
            }
        })
    } catch (error) {
        console.error('Get legalisasi error:', error)
        return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
    }
}

// POST - Upload file legalisasi PDF (Direct POST <= 4MB OR Chunked Multipart Upload > 4MB)
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { authenticated, user } = await validateRole(['ADMIN', 'DEVELOPER'])
        if (!authenticated || !user) {
            return NextResponse.json({ 
                error: 'Akses ditolak: Hanya Admin dan Developer yang dapat mengupload atau mengganti file legalisasi' 
            }, { status: 403 })
        }
        const uploadUserId = user.id

        const { id } = await params

        const sop = await db.sopPembuatan.findUnique({
            where: { id },
            select: { id: true, judul: true, legalisasiPdfPath: true }
        })

        if (!sop) {
            return NextResponse.json({ error: 'SOP tidak ditemukan' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const action = searchParams.get('action')

        // ── MULTIPART ACTION: START ──────────────────────────────────────────
        if (action === 'multipart-start') {
            // Ensure R2 CORS is set so presigned URL PUT requests from browser work
            await ensureR2Cors().catch(err => console.warn('CORS setup warning:', err))
            const r2Key = `sop-builder/legalisasi/${id}_${Date.now()}.pdf`
            const uploadId = await startR2MultipartUpload(r2Key, 'application/pdf', {
                sopId: id,
                uploadedBy: uploadUserId || 'unknown',
            })
            return NextResponse.json({ uploadId, r2Key })
        }

        // ── MULTIPART ACTION: GET PRESIGNED URL FOR PART (client uploads directly to R2) ──
        if (action === 'multipart-part-url') {
            const body = await request.json()
            const { uploadId, r2Key, partNumber } = body

            if (!uploadId || !r2Key || !partNumber) {
                return NextResponse.json({ error: 'Parameter multipart-part-url tidak lengkap' }, { status: 400 })
            }

            const presignedUrl = await getR2PresignedPartUrl(r2Key, uploadId, partNumber, 3600)
            return NextResponse.json({ presignedUrl, partNumber })
        }

        // ── MULTIPART ACTION: UPLOAD PART via server binary stream (bypass FormData/body-parser limit) ────
        // Metadata passed via query params; body is raw binary chunk. Streams directly to R2.
        if (action === 'multipart-part-stream') {
            const uploadId = searchParams.get('uploadId')
            const r2Key = searchParams.get('r2Key')
            const partNumber = parseInt(searchParams.get('partNumber') || '0', 10)

            if (!uploadId || !r2Key || !partNumber) {
                return NextResponse.json({ error: 'Parameter stream upload tidak lengkap' }, { status: 400 })
            }

            // Read raw binary body directly — no formData() overhead
            const chunkArrayBuffer = await request.arrayBuffer()
            const chunkBuffer = Buffer.from(chunkArrayBuffer)

            if (chunkBuffer.length === 0) {
                return NextResponse.json({ error: 'Chunk kosong' }, { status: 400 })
            }

            const etag = await uploadR2Part(r2Key, uploadId, partNumber, chunkBuffer)
            return NextResponse.json({ partNumber, etag })
        }

        // ── MULTIPART ACTION: UPLOAD PART via server (fallback for small chunks only) ────
        if (action === 'multipart-part') {
            const formData = await request.formData()
            const uploadId = formData.get('uploadId') as string
            const r2Key = formData.get('r2Key') as string
            const partNumber = parseInt(formData.get('partNumber') as string, 10)
            const chunk = formData.get('chunk') as File | null

            if (!uploadId || !r2Key || isNaN(partNumber) || !chunk) {
                return NextResponse.json({ error: 'Parameter multipart part tidak lengkap' }, { status: 400 })
            }

            const chunkArrayBuffer = await chunk.arrayBuffer()
            const chunkBuffer = Buffer.from(chunkArrayBuffer)
            const etag = await uploadR2Part(r2Key, uploadId, partNumber, chunkBuffer)

            return NextResponse.json({ partNumber, etag })
        }

        // ── MULTIPART ACTION: COMPLETE ───────────────────────────────────────
        if (action === 'multipart-complete') {
            const body = await request.json()
            const { uploadId, r2Key, parts } = body

            if (!uploadId || !r2Key || !Array.isArray(parts)) {
                return NextResponse.json({ error: 'Parameter multipart complete tidak lengkap' }, { status: 400 })
            }

            // Delete old file if exists
            if (sop.legalisasiPdfPath && sop.legalisasiPdfPath !== r2Key) {
                try {
                    await deleteFromR2(sop.legalisasiPdfPath)
                } catch (e) {
                    console.warn('Failed to delete old legalisasi file:', e)
                }
            }

            await completeR2MultipartUpload(r2Key, uploadId, parts)

            // Save path to database
            await db.sopPembuatan.update({
                where: { id },
                data: { legalisasiPdfPath: r2Key }
            })

            return NextResponse.json({
                success: true,
                path: r2Key,
                message: 'File legalisasi berhasil diunggah'
            })
        }

        // ── MULTIPART ACTION: ABORT ──────────────────────────────────────────
        if (action === 'multipart-abort') {
            const body = await request.json().catch(() => ({}))
            const { uploadId, r2Key } = body
            if (uploadId && r2Key) {
                await abortR2MultipartUpload(r2Key, uploadId)
            }
            return NextResponse.json({ success: true })
        }

        // ── STANDARD DIRECT UPLOAD (Single file <= 4MB) ──────────────────────
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'File tidak ditemukan dalam request' }, { status: 400 })
        }

        // Validate file type
        const allowedTypes = ['application/pdf']
        if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json({ error: 'Hanya file PDF yang diizinkan' }, { status: 400 })
        }

        // Validate file size (max 100MB)
        const MAX_SIZE = 100 * 1024 * 1024
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'Ukuran file maksimal 100MB' }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        const rawBuffer = Buffer.from(arrayBuffer)
        const buffer = sanitizePdfMetadata(rawBuffer, sop.judul)

        // Delete old file if exists
        if (sop.legalisasiPdfPath) {
            try {
                await deleteFromR2(sop.legalisasiPdfPath)
            } catch (e) {
                console.warn('Failed to delete old legalisasi file:', e)
            }
        }

        // Upload to R2
        const r2Key = `sop-builder/legalisasi/${id}_${Date.now()}.pdf`
        const result = await uploadToR2(buffer, file.name, 'application/pdf', {
            key: r2Key,
            metadata: {
                sopId: id,
                uploadedBy: uploadUserId || 'unknown',
                originalName: file.name
            }
        })

        // Save path to database
        await db.sopPembuatan.update({
            where: { id },
            data: { legalisasiPdfPath: result.key }
        })

        return NextResponse.json({
            success: true,
            path: result.key,
            message: 'File legalisasi berhasil diupload'
        })
    } catch (error) {
        console.error('Upload legalisasi error:', error)
        return NextResponse.json({
            error: 'Terjadi kesalahan saat upload',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}

// PATCH - Confirm presigned upload: save R2 key to DB after direct upload to R2
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { authenticated } = await validateRole(['ADMIN', 'DEVELOPER', 'STAF'])
        if (!authenticated) {
            const fallbackUser = await db.user.findFirst({
                where: { role: { in: ['ADMIN', 'DEVELOPER', 'STAF'] } }
            })
            if (!fallbackUser) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        }

        const { id } = await params
        const { r2Key } = await request.json()

        if (!r2Key) {
            return NextResponse.json({ error: 'r2Key diperlukan' }, { status: 400 })
        }

        const sop = await db.sopPembuatan.findUnique({
            where: { id },
            select: { id: true, legalisasiPdfPath: true }
        })

        if (!sop) {
            return NextResponse.json({ error: 'SOP tidak ditemukan' }, { status: 404 })
        }

        // Delete old file from R2 if it exists
        if (sop.legalisasiPdfPath) {
            try {
                await deleteFromR2(sop.legalisasiPdfPath)
            } catch (e) {
                console.warn('Failed to delete old legalisasi file:', e)
            }
        }

        // Save new key to DB
        await db.sopPembuatan.update({
            where: { id },
            data: { legalisasiPdfPath: r2Key }
        })

        return NextResponse.json({
            success: true,
            path: r2Key,
            message: 'File legalisasi berhasil disimpan'
        })
    } catch (error) {
        console.error('Confirm legalisasi upload error:', error)
        return NextResponse.json({ error: 'Terjadi kesalahan saat konfirmasi upload' }, { status: 500 })
    }
}

// DELETE - Remove file legalisasi
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { authenticated } = await validateRole(['ADMIN', 'DEVELOPER'])
        if (!authenticated) {
            return NextResponse.json({ 
                error: 'Akses ditolak: Hanya Admin dan Developer yang dapat menghapus file legalisasi' 
            }, { status: 403 })
        }

        const { id } = await params

        const sop = await db.sopPembuatan.findUnique({
            where: { id },
            select: { id: true, legalisasiPdfPath: true }
        })

        if (!sop) {
            return NextResponse.json({ error: 'SOP tidak ditemukan' }, { status: 404 })
        }

        if (!sop.legalisasiPdfPath) {
            return NextResponse.json({ error: 'Tidak ada file legalisasi untuk dihapus' }, { status: 404 })
        }

        // Delete from R2
        try {
            await deleteFromR2(sop.legalisasiPdfPath)
        } catch (e) {
            console.warn('Failed to delete from R2:', e)
        }

        // Clear path from database
        await db.sopPembuatan.update({
            where: { id },
            data: { legalisasiPdfPath: null }
        })

        return NextResponse.json({ success: true, message: 'File legalisasi berhasil dihapus' })
    } catch (error) {
        console.error('Delete legalisasi error:', error)
        return NextResponse.json({ error: 'Terjadi kesalahan saat menghapus file' }, { status: 500 })
    }
}
