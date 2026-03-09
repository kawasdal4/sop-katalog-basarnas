import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateRole } from '@/lib/auth-utils'
import { upsertStepSnapshot } from '@/lib/sop-flowchart-snapshot'
import { generateSopNumber } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
    try {
        const { authenticated, user } = await validateRole(['ADMIN', 'DEVELOPER', 'STAF'])
        if (!authenticated) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const skip = (page - 1) * limit

        const [sops, total] = await Promise.all([
            db.sopPembuatan.findMany({
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    author: { select: { name: true, email: true } },
                    _count: { select: { langkahLangkah: true } }
                }
            }),
            db.sopPembuatan.count()
        ])

        return NextResponse.json({
            data: sops,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Fetch SOP Builder error:', error)
        return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { authenticated, authorized, user } = await validateRole(['ADMIN', 'DEVELOPER', 'STAF'])
        if (!authenticated) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            nomorSop,
            judul,
            unitKerja,
            tanggalEfektif,
            revisi,
            dasarHukum,
            kualifikasiPelaksana,
            peralatanPerlengkapan,
            peringatan,
            pencatatanPendataan,
            keterkaitan,
            disahkanOleh,
            pelaksanaLanes,
            langkahLangkah // Array of steps
        } = body

        if (!judul || !unitKerja) {
            return NextResponse.json({ error: 'Judul dan Unit Kerja wajib diisi' }, { status: 400 })
        }

        // Generate Nomor SOP if not provided or empty
        let finalNomorSop = nomorSop
        if (!finalNomorSop) {
            const now = new Date()
            const currentMonth = now.getMonth() + 1
            const currentYear = now.getFullYear()

            let isUnique = false
            let attempts = 0
            while (!isUnique && attempts < 10) {
                // Find the latest SOP in builder to get the next number
                // Since SopPembuatan doesn't have a 'jenis' field, we'll prefix with SOP by default
                const lastSop = await db.sopPembuatan.findFirst({
                    orderBy: { createdAt: 'desc' },
                    select: { nomorSop: true }
                })

                let nextNumber = 1
                if (lastSop && lastSop.nomorSop) {
                    const matches = lastSop.nomorSop.match(/^[A-Z]+-(\d+)/)
                    if (matches) {
                        nextNumber = parseInt(matches[1], 10) + 1 + attempts
                    } else {
                        const count = await db.sopPembuatan.count()
                        nextNumber = count + 1 + attempts
                    }
                }

                finalNomorSop = generateSopNumber('SOP', nextNumber, 'DIT.SIAGA', currentMonth, currentYear)

                const existing = await db.sopPembuatan.findUnique({
                    where: { nomorSop: finalNomorSop }
                })

                if (!existing) {
                    isUnique = true
                }
                attempts++
            }
        } else {
            // Check if nomorSop already exists (for manually entered ones)
            const existingSop = await db.sopPembuatan.findUnique({
                where: { nomorSop: finalNomorSop }
            })

            if (existingSop) {
                return NextResponse.json({
                    error: `Nomor SOP "${finalNomorSop}" sudah digunakan oleh SOP lain. Silakan gunakan nomor lain atau klik tombol Generate.`
                }, { status: 400 })
            }
        }

        const safeStringify = (val: any) => Array.isArray(val) ? JSON.stringify(val) : val
        const normalizeArgName = (value: string) => value
            .replace(/\u001b\[[0-9;]*m/g, '')
            .replace(/[^A-Za-z0-9_]/g, '')
        const getUnknownArg = (error: unknown) => {
            const rawMessage = error instanceof Error ? error.message : String(error)
            const message = rawMessage.replace(/\u001b\[[0-9;]*m/g, '')
            const backtickMatch = message.match(/Unknown argument `([^`]+)`/i)
            if (backtickMatch?.[1]) {
                const normalized = normalizeArgName(backtickMatch[1])
                return normalized || undefined
            }
            const plainMatch = message.match(/Unknown argument\s+([A-Za-z0-9_]+)/i)
            if (plainMatch?.[1]) {
                const normalized = normalizeArgName(plainMatch[1])
                return normalized || undefined
            }
            return undefined
        }
        const removeUnknownArg = (data: any, arg: string) => {
            const normalizedArg = normalizeArgName(arg)
            if (normalizedArg in data) {
                delete data[normalizedArg]
                return true
            }
            const steps = data?.langkahLangkah?.create
            if (Array.isArray(steps)) {
                let removed = false
                for (const step of steps) {
                    if (step && normalizedArg in step) {
                        delete step[normalizedArg]
                        removed = true
                    }
                }
                return removed
            }
            return false
        }
        const mapStep = (step: any, index: number) => {
            const data: any = {
                order: index + 1,
                aktivitas: step.aktivitas,
                pelaksana: step.pelaksana,
            }
            if (step.stepType !== undefined && step.stepType !== null) data.stepType = step.stepType
            if (step.nextStepYes !== undefined && step.nextStepYes !== null) data.nextStepYes = parseInt(step.nextStepYes)
            if (step.nextStepNo !== undefined && step.nextStepNo !== null) data.nextStepNo = parseInt(step.nextStepNo)
            if (step.mutuBakuKelengkapan !== undefined) data.mutuBakuKelengkapan = step.mutuBakuKelengkapan
            if (step.mutuBakuWaktu !== undefined) data.mutuBakuWaktu = step.mutuBakuWaktu
            if (step.mutuBakuOutput !== undefined) data.mutuBakuOutput = step.mutuBakuOutput
            if (step.keterangan !== undefined) data.keterangan = step.keterangan
            return data
        }

        const createData: any = {
            nomorSop: finalNomorSop,
            judul,
            unitKerja,
            tanggalEfektif: tanggalEfektif ? new Date(tanggalEfektif) : null,
            revisi: revisi || '00',
            dasarHukum: safeStringify(dasarHukum),
            kualifikasiPelaksana: safeStringify(kualifikasiPelaksana),
            peralatanPerlengkapan: safeStringify(peralatanPerlengkapan),
            peringatan: safeStringify(peringatan),
            pencatatanPendataan: safeStringify(pencatatanPendataan),
            authorId: user!.id,
            status: 'DRAFT',
            langkahLangkah: {
                create: (langkahLangkah || []).map(mapStep)
            }
        }

        if (keterkaitan !== undefined) {
            createData.keterkaitan = safeStringify(keterkaitan)
        }

        if (disahkanOleh !== undefined) {
            createData.disahkanOleh = disahkanOleh
        }

        if (pelaksanaLanes !== undefined) {
            // Ensure pelaksanaLanes is stringified if it's an array, or kept as is if string
            createData.pelaksanaLanes = Array.isArray(pelaksanaLanes) ? JSON.stringify(pelaksanaLanes) : pelaksanaLanes
        }

        let savedSop
        for (let i = 0; i < 10; i++) {
            try {
                savedSop = await db.sopPembuatan.create({
                    data: createData,
                    include: {
                        langkahLangkah: true
                    }
                })
                break
            } catch (error) {
                const unknownArg = getUnknownArg(error)
                if (!unknownArg || !removeUnknownArg(createData, unknownArg)) {
                    throw error
                }
            }
        }

        if (!savedSop) {
            throw new Error('Gagal menyimpan SOP: argumen tidak kompatibel dengan schema aktif')
        }

        await upsertStepSnapshot(savedSop.id, langkahLangkah || [])

        return NextResponse.json({ success: true, data: savedSop })
    } catch (error) {
        console.error('Create SOP Builder error:', error)
        return NextResponse.json({
            error: 'Terjadi kesalahan saat menyimpan SOP',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
