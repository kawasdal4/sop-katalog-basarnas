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

        // Check if table exists by querying count
        const count = await db.exportJob.count()
        const lastJobs = await db.exportJob.findMany({
            take: 5,
            orderBy: { updatedAt: 'desc' }
        })

        const sops = await db.sopPembuatan.findMany({
            take: 5,
            select: { id: true, judul: true, nomorSop: true },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            tableExists: true,
            jobCount: count,
            recentJobs: lastJobs,
            sopCheck: checkSopId ? { id: checkSopId, found: !!sopExists } : null,
            availableSops: sops
        })
    } catch (error: any) {
        return NextResponse.json({
            tableExists: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
