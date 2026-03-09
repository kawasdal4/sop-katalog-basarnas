import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sopId } = await params
        console.log(`🔍 Checking status for SOP ID: ${sopId}`)

        // Find job in database
        const job = await db.exportJob.findUnique({
            where: { sopId }
        })

        console.log(`🔍 Job found in DB for ${sopId}: ${job ? 'Yes' : 'No'}`)

        if (!job) {
            return NextResponse.json(
                { status: 'not_found' },
                {
                    status: 404,
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                }
            )
        }

        return NextResponse.json({
            status: job.status,
            result: job.result ? JSON.parse(job.result) : undefined,
            error: job.error
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })

    } catch (error) {
        console.error('Status check error:', error)
        return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
    }
}
