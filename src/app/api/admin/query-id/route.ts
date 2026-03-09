import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    const secret = request.headers.get('x-migration-secret')
    if (secret !== 'BASARNAS-MIGRATE-2026') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing ID' })

    try {
        const sop = await db.sopPembuatan.findUnique({
            where: { id },
            include: {
                langkahLangkah: {
                    orderBy: { order: 'asc' }
                },
                author: { select: { name: true, email: true } },
                sopFlowchart: true
            }
        })

        if (!sop) {
            return NextResponse.json({ error: 'SOP not found by findUnique', id })
        }

        const { getStepSnapshot, mergeStepsWithSnapshot } = await import('@/lib/sop-flowchart-snapshot')
        const snapshot = await getStepSnapshot(id)
        if (Array.isArray(snapshot) && snapshot.length > 0) {
            sop.langkahLangkah = mergeStepsWithSnapshot(sop.langkahLangkah || [], snapshot)
        }

        return NextResponse.json({
            id: id,
            sop: sop
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
