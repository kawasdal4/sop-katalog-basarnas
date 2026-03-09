import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const maxDuration = 60

// Secret key for direct API access (no session needed)
const MIGRATION_SECRET = 'BASARNAS-MIGRATE-2026'

function toRoman(num: number): string {
    const roman: Record<string, number> = {
        M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90,
        L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1,
    }
    let str = ''
    let n = num
    for (const i in roman) {
        while (n >= roman[i]) { str += i; n -= roman[i] }
    }
    return str
}

function generateSopNumber(prefix: 'SOP' | 'IK' | 'LNY', sequence: number, unit: string, date: Date): string {
    const seqStr = String(sequence).padStart(3, '0')
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const romanMonth = toRoman(month)
    return `${prefix}-${seqStr}/${unit}/${romanMonth}/BSN/${year}`
}

// GET - Check migration status
export async function GET(request: NextRequest) {
    try {
        // Allow access via secret key header OR valid session
        const secretHeader = request.headers.get('x-migration-secret')
        if (secretHeader !== MIGRATION_SECRET) {
            const cookieStore = await cookies()
            const sessionCookie = cookieStore.get('session')
            if (!sessionCookie?.value) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
            const session = JSON.parse(sessionCookie.value)
            if (!['ADMIN', 'DEVELOPER'].includes(session.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        // Sample a few records to show current state
        const sopFiles = await db.sopFile.findMany({ take: 5, orderBy: { uploadedAt: 'asc' }, select: { id: true, nomorSop: true, jenis: true, uploadedAt: true } })
        const sopBuilders = await db.sopPembuatan.findMany({ take: 5, orderBy: { createdAt: 'asc' }, select: { id: true, nomorSop: true, createdAt: true } })

        return NextResponse.json({
            message: 'Migration status check',
            sopFileSample: sopFiles,
            sopBuilderSample: sopBuilders,
            totalSopFile: await db.sopFile.count(),
            totalSopBuilder: await db.sopPembuatan.count(),
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST - Run migration
export async function POST(request: NextRequest) {
    try {
        // Allow access via secret key header OR valid session
        const secretHeader = request.headers.get('x-migration-secret')
        if (secretHeader !== MIGRATION_SECRET) {
            const cookieStore = await cookies()
            const sessionCookie = cookieStore.get('session')
            if (!sessionCookie?.value) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
            const session = JSON.parse(sessionCookie.value)
            if (!['ADMIN', 'DEVELOPER'].includes(session.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        const results: string[] = []

        // 1. Migrate SopFile
        const sopFiles = await db.sopFile.findMany({ orderBy: { uploadedAt: 'asc' } })
        const counts: Record<string, number> = { SOP: 0, IK: 0, LNY: 0 }

        for (const file of sopFiles) {
            const jenis = file.jenis === 'SOP' ? 'SOP' : file.jenis === 'IK' ? 'IK' : 'LNY'
            counts[jenis]++
            const newNomor = generateSopNumber(jenis as any, counts[jenis], 'DIT.SIAGA', file.uploadedAt)
            results.push(`SopFile: ${file.nomorSop || '(kosong)'} -> ${newNomor}`)
            await db.sopFile.update({ where: { id: file.id }, data: { nomorSop: newNomor } })
        }

        // 2. Migrate SopPembuatan
        const sopPembuatans = await db.sopPembuatan.findMany({ orderBy: { createdAt: 'asc' } })
        let builderCount = 0
        for (const sop of sopPembuatans) {
            builderCount++
            const newNomor = generateSopNumber('SOP', builderCount, 'DIT.SIAGA', sop.createdAt)
            results.push(`SopPembuatan: ${sop.nomorSop || '(kosong)'} -> ${newNomor}`)
            await db.sopPembuatan.update({ where: { id: sop.id }, data: { nomorSop: newNomor } })
        }

        return NextResponse.json({
            success: true,
            message: `Migration selesai! ${sopFiles.length} SopFile dan ${sopPembuatans.length} SopPembuatan berhasil dimigrasikan.`,
            results,
        })
    } catch (error: any) {
        console.error('Migration error:', error)
        return NextResponse.json({ error: error.message, details: String(error) }, { status: 500 })
    }
}
