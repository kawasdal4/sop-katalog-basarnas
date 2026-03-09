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
        // Check if table exists by querying count
        const count = await db.exportJob.count()
        const lastJobs = await db.exportJob.findMany({
            take: 5,
            orderBy: { updatedAt: 'desc' }
        })

        return NextResponse.json({
            tableExists: true,
            jobCount: count,
            recentJobs: lastJobs
        })
    } catch (error: any) {
        return NextResponse.json({
            tableExists: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
