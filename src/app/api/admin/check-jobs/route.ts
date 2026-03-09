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
        const { searchParams } = new URL(request.url)
        const checkSopId = searchParams.get('sopId')

        let sopExists = null
        if (checkSopId) {
            sopExists = await db.sopPembuatan.findUnique({ where: { id: checkSopId } })
        }

        const lastJob = await db.exportJob.findFirst({
            where: { sopId: checkSopId || undefined },
            orderBy: { updatedAt: 'desc' }
        })

        const sop = checkSopId ? await db.sopPembuatan.findUnique({
            where: { id: checkSopId },
            select: { id: true, judul: true }
        }) : null

        return NextResponse.json({
            sopCheck: { id: checkSopId, found: !!sop, data: sop },
            latestJob: lastJob,
            env: {
                node: process.version,
                platform: process.platform,
                arch: process.arch,
                vercel: process.env.VERCEL,
                node_env: process.env.NODE_ENV
            }
        })
    } catch (error: any) {
        return NextResponse.json({
            tableExists: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
