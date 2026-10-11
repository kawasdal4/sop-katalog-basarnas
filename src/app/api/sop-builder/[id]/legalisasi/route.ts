import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateRole } from '@/lib/auth-utils'
import { uploadToR2, downloadFromR2, deleteFromR2 } from '@/lib/r2-storage'

// GET - Download/Preview file legalisasi
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

        if (action === 'info') {
            return NextResponse.json({
                hasFile: !!sop.legalisasiPdfPath,
                path: sop.legalisasiPdfPath,
                judul: sop.judul
            })
        }

        if (!sop.legalisasiPdfPath) {
            return NextResponse.json({ error: 'File legalisasi belum tersedia' }, { status: 404 })
        }

        // Download/Preview
        const { buffer, contentType } = await downloadFromR2(sop.legalisasiPdfPath)

        const disposition = action === 'download'
            ? `attachment; filename="Legalisasi-${sop.judul?.replace(/[^a-zA-Z0-9]/g, '_') || id}.pdf"`
            : 'inline'

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': contentType || 'application/pdf',
                'Content-Disposition': disposition,
                'Content-Length': String(buffer.length),
                'Cache-Control': 'no-cache'
            }
        })
    } catch (error) {
        console.error('Get legalisasi error:', error)
        return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
    }
}

// POST - Upload file legalisasi PDF
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { authenticated, user } = await validateRole(['ADMIN', 'DEVELOPER', 'STAF'])
        let uploadUserId = user?.id

        if (!authenticated) {
            const fallbackUser = await db.user.findFirst({
                where: { role: { in: ['ADMIN', 'DEVELOPER', 'STAF'] } }
            })
            if (fallbackUser) {
                uploadUserId = fallbackUser.id
            } else {
                return NextResponse.json({ error: 'Silakan login terlebih dahulu untuk mengupload file legalisasi' }, { status: 401 })
            }
        }

        const { id } = await params

        const sop = await db.sopPembuatan.findUnique({
            where: { id },
            select: { id: true, judul: true, legalisasiPdfPath: true }
        })

        if (!sop) {
            return NextResponse.json({ error: 'SOP tidak ditemukan' }, { status: 404 })
        }

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
        const buffer = Buffer.from(arrayBuffer)

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
        const updated = await db.sopPembuatan.update({
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

// DELETE - Remove file legalisasi
export async function DELETE(
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
        await deleteFromR2(sop.legalisasiPdfPath)

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
