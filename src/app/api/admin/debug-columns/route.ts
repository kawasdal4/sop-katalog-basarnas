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
        // Check User table columns
        const userColumns = await (db as any).$queryRawUnsafe(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'User'
        `)

        // Check SopPembuatan table columns
        const sopColumns = await (db as any).$queryRawUnsafe(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'SopPembuatan'
        `)

        return NextResponse.json({
            userColumns,
            sopColumns
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
