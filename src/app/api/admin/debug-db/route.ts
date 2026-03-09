import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== 'BASARNAS-CHECK-2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const sops = await db.sopPembuatan.findMany({
            take: 10,
            select: { id: true, judul: true, nomorSop: true },
            orderBy: { createdAt: 'desc' }
        })

        const jobs = await db.exportJob.findMany({
            take: 10,
            orderBy: { updatedAt: 'desc' }
        })

        return NextResponse.json({
            sops,
            jobs,
            serverTime: new Date().toISOString()
        })
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
