import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    const secret = request.headers.get('x-migration-secret')
    if (secret !== 'BASARNAS-MIGRATE-2026') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing ID' })

    try {
        const users = await db.user.findMany({ select: { id: true, email: true, role: true }, take: 5 })

        return NextResponse.json({
            id: id,
            users: users
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
