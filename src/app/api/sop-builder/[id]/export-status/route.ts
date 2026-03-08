import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const activeJobs = ((globalThis as any).__sopExportJobs ??= new Map<string, {
    status: 'processing' | 'completed' | 'failed',
    result?: any,
    error?: string
}>())

export function getJob(id: string) {
    return activeJobs.get(id)
}

export function createJob(id: string) {
    activeJobs.set(id, { status: 'processing' })
    return id
}

export function updateJob(id: string, data: any) {
    const job = activeJobs.get(id)
    if (job) {
        Object.assign(job, data)
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sopId } = await params
        const job = activeJobs.get(sopId)

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

        return NextResponse.json(job, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })

    } catch (error) {
        return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
    }
}
