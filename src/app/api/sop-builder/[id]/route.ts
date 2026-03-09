import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateRole } from '@/lib/auth-utils'
import { getStepSnapshot, mergeStepsWithSnapshot, upsertStepSnapshot } from '@/lib/sop-flowchart-snapshot'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { authenticated, user } = await validateRole(['ADMIN', 'DEVELOPER', 'STAF'])
        if (!authenticated) {
            return NextResponse.json({ error: 'Unauthorized Session' }, { status: 401 })
        }

        const { id } = await params

        const sop = await db.sopPembuatan.findUnique({
            where: { id },
            include: {
                langkahLangkah: {
                    orderBy: { order: 'asc' }
                },
                author: { select: { name: true, email: true } },
                sopFlowchart: true
            }
        })

        if (!sop) {
            return NextResponse.json({ error: `SOP tidak ditemukan dengan ID: ${id}` }, { status: 404 })
        }

        const snapshot = await getStepSnapshot(id)
        if (Array.isArray(snapshot) && snapshot.length > 0) {
            sop.langkahLangkah = mergeStepsWithSnapshot(sop.langkahLangkah || [], snapshot)
        }

        return NextResponse.json({ data: sop })
    } catch (error: any) {
        console.error('Fetch detail SOP Builder error:', error)
        return NextResponse.json({
            error: 'Terjadi kesalahan',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { authenticated, user } = await validateRole(['ADMIN', 'DEVELOPER', 'STAF'])
        if (!authenticated) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        let {
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
            connectorPaths,
            langkahLangkah
        } = body


        const existingSop = await db.sopPembuatan.findUnique({ where: { id } })
        if (!existingSop) {
            return NextResponse.json({ error: 'SOP tidak ditemukan' }, { status: 404 })
        }

        // Check if nomorSop is being changed to something that already exists
        if (nomorSop && nomorSop !== existingSop.nomorSop) {
            const duplicateSop = await db.sopPembuatan.findUnique({
                where: { nomorSop }
            })
            if (duplicateSop) {
                // If the user is admin/developer, we might want to allow override or auto-suffix
                // For now, just append a random suffix to make it unique automatically if it's a draft
                // This improves UX during heavy testing/editing
                if (existingSop.status === 'DRAFT') {
                    const suffix = Math.floor(Math.random() * 1000);
                    nomorSop = `${nomorSop} (COPY-${suffix})`;
                } else {
                    return NextResponse.json({
                        error: `Nomor SOP "${nomorSop}" sudah digunakan oleh SOP lain. Silakan gunakan nomor lain.`
                    }, { status: 400 })
                }
            }
        }

        const safeStringify = (val: any) => {
            if (val === undefined || val === null) return val;
            if (typeof val === 'string') return val;
            return JSON.stringify(val);
        };
        const hasSopField = (field: string) => Object.prototype.hasOwnProperty.call(existingSop, field)
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

        // Gunakan transaction untuk update dan replace langkah
        const updatedSop = await db.$transaction(async (tx) => {
            const updateData: any = {
                nomorSop: nomorSop || existingSop.nomorSop,
                judul: judul || existingSop.judul,
                unitKerja: unitKerja || existingSop.unitKerja,
                tanggalEfektif: tanggalEfektif ? new Date(tanggalEfektif) : existingSop.tanggalEfektif,
                revisi: revisi || existingSop.revisi,
                updatedAt: new Date(),
            };

            if (hasSopField('dasarHukum')) {
                updateData.dasarHukum = dasarHukum !== undefined ? safeStringify(dasarHukum) : (existingSop as any).dasarHukum
            }
            if (hasSopField('kualifikasiPelaksana')) {
                updateData.kualifikasiPelaksana = kualifikasiPelaksana !== undefined ? safeStringify(kualifikasiPelaksana) : (existingSop as any).kualifikasiPelaksana
            }
            if (hasSopField('peralatanPerlengkapan')) {
                updateData.peralatanPerlengkapan = peralatanPerlengkapan !== undefined ? safeStringify(peralatanPerlengkapan) : (existingSop as any).peralatanPerlengkapan
            }
            if (hasSopField('peringatan')) {
                updateData.peringatan = peringatan !== undefined ? safeStringify(peringatan) : (existingSop as any).peringatan
            }
            if (hasSopField('pencatatanPendataan')) {
                updateData.pencatatanPendataan = pencatatanPendataan !== undefined ? safeStringify(pencatatanPendataan) : (existingSop as any).pencatatanPendataan
            }
            if (hasSopField('keterkaitan')) {
                updateData.keterkaitan = keterkaitan !== undefined ? safeStringify(keterkaitan) : (existingSop as any).keterkaitan
            }
            if (hasSopField('disahkanOleh')) {
                updateData.disahkanOleh = disahkanOleh !== undefined ? disahkanOleh : (existingSop as any).disahkanOleh
            }

            if (pelaksanaLanes !== undefined && hasSopField('pelaksanaLanes')) {
                updateData.pelaksanaLanes = safeStringify(pelaksanaLanes)
            }

            if (connectorPaths !== undefined && hasSopField('connectorPaths')) {
                updateData.connectorPaths = safeStringify(connectorPaths)
            }

            // Only update steps if they are explicitly provided
            if (langkahLangkah && Array.isArray(langkahLangkah)) {
                // Fetch existing snapshot to preserve logical metadata during form save
                const snapshot = await getStepSnapshot(id);
                const mergedLangkah = mergeStepsWithSnapshot(langkahLangkah, snapshot);

                // Delete old steps
                await tx.sopLangkah.deleteMany({
                    where: { sopPembuatanId: id }
                });

                // Add to create relational data
                updateData.langkahLangkah = {
                    create: mergedLangkah.map((step: any, index: number) => {
                        const data: any = {
                            order: index + 1,
                            aktivitas: step.aktivitas,
                            pelaksana: step.pelaksana,
                        }
                        if (step.stepType !== undefined && step.stepType !== null) data.stepType = step.stepType // Ensure stepType is saved
                        if (step.nextStepYes !== undefined && step.nextStepYes !== null) data.nextStepYes = parseInt(step.nextStepYes)
                        if (step.nextStepNo !== undefined && step.nextStepNo !== null) data.nextStepNo = parseInt(step.nextStepNo)
                        if (step.mutuBakuKelengkapan !== undefined) data.mutuBakuKelengkapan = step.mutuBakuKelengkapan
                        if (step.mutuBakuWaktu !== undefined) data.mutuBakuWaktu = step.mutuBakuWaktu
                        if (step.mutuBakuOutput !== undefined) data.mutuBakuOutput = step.mutuBakuOutput
                        if (step.keterangan !== undefined) data.keterangan = step.keterangan
                        return data
                    })
                };
            }

            // Update SOP
            let result: any
            for (let i = 0; i < 10; i++) {
                try {
                    result = await tx.sopPembuatan.update({
                        where: { id },
                        data: updateData,
                        include: {
                            langkahLangkah: {
                                orderBy: { order: 'asc' }
                            },
                            sopFlowchart: true
                        }
                    });
                    break
                } catch (error) {
                    const unknownArg = getUnknownArg(error)
                    if (!unknownArg || !removeUnknownArg(updateData, unknownArg)) {
                        throw error
                    }
                }
            }

            if (!result) {
                throw new Error('Gagal mengupdate SOP: argumen tidak kompatibel dengan schema aktif')
            }


            return result;
        })

        if (Array.isArray(langkahLangkah)) {
            await upsertStepSnapshot(id, langkahLangkah)
            const snapshot = await getStepSnapshot(id)
            if (Array.isArray(snapshot) && snapshot.length > 0) {
                updatedSop.langkahLangkah = mergeStepsWithSnapshot(updatedSop.langkahLangkah || [], snapshot)
            }
        }

        return NextResponse.json({ success: true, data: updatedSop })
    } catch (error) {
        console.error('Update SOP Builder error:', error)
        return NextResponse.json({
            error: 'Terjadi kesalahan saat mengupdate SOP',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { authenticated, role } = await validateRole(['ADMIN', 'DEVELOPER', 'STAF'])
        if (!authenticated) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const existingSop = await db.sopPembuatan.findUnique({ where: { id } })
        if (!existingSop) {
            return NextResponse.json({ error: 'SOP tidak ditemukan' }, { status: 404 })
        }

        await db.sopPembuatan.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete SOP Builder error:', error)
        return NextResponse.json({ error: 'Terjadi kesalahan saat menghapus SOP' }, { status: 500 })
    }
}
