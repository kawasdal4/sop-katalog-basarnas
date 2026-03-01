import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export async function POST() {
    try {
        const cookieStore = await cookies()
        const userId = cookieStore.get('userId')?.value

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Update the lastArsipVisitAt for the user
        await db.user.update({
            where: { id: userId },
            data: { lastArsipVisitAt: new Date() }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Visit arsip error:', error)
        return NextResponse.json({
            error: 'Terjadi kesalahan merekam waktu kunjungan',
        }, { status: 500 })
    }
}
