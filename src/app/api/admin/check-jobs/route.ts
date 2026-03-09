import { NextResponse } from 'next/server'
// Deployment Anchor: 2026-03-09-v2
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const sopId = searchParams.get('sopId')

    if (secret !== 'BASARNAS-CHECK-2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const jobs = await (db as any).exportJob.findMany({
            take: 20,
            orderBy: { updatedAt: 'desc' },
            where: sopId ? { sopId } : undefined
        })

        const sops = await db.sopPembuatan.findMany({
            take: 5,
            orderBy: { updatedAt: 'desc' },
            select: { id: true, judul: true, updatedAt: true }
        })

        return NextResponse.json({
            jobs,
            sops,
            env: {
                node: process.version,
                platform: process.platform,
                vercel: process.env.VERCEL
            }
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
