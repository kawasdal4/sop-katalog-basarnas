import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    const secret = request.headers.get('x-migration-secret')
    if (secret !== 'BASARNAS-MIGRATE-2026') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing ID' })

    try {
        const inPembuatan = await db.sopPembuatan.findUnique({ where: { id } })
        const inFile = await db.sopFile.findUnique({ where: { id } })
        return NextResponse.json({
            id,
            foundInPembuatan: !!inPembuatan,
            foundInFile: !!inFile,
            pembuatanData: inPembuatan ? { judul: inPembuatan.judul, nomorSop: inPembuatan.nomorSop } : null
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
