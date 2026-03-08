import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateRole } from '@/lib/auth-utils';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
    try {
        const { authenticated } = await validateRole(['ADMIN', 'DEVELOPER', 'STAF']);
        if (!authenticated) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { sop_id, nodes, edges } = body;

        if (!sop_id) {
            return NextResponse.json({ error: 'Missing sop_id' }, { status: 400 });
        }

        const flowchartJson = JSON.stringify({
            nodes: Array.isArray(nodes) ? nodes : [],
            edges: Array.isArray(edges) ? edges : [],
        })

        let flowchartSaved = false
        let flowchartId = ''
        try {
            const savedFlowchart = await db.sopFlowchart.upsert({
                where: { sopId: sop_id },
                update: { flowchartJson },
                create: {
                    sopId: sop_id,
                    flowchartJson,
                },
            })
            flowchartSaved = true
            flowchartId = savedFlowchart.id
        } catch (upsertError: any) {
            console.error('[API SAVE] Flowchart upsert error:', upsertError);
            const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:')
            const now = new Date()
            if (isSqlite) {
                const updatedCount = await db.$executeRawUnsafe(
                    `UPDATE "SopFlowchart" SET "flowchartJson" = ?, "updatedAt" = ? WHERE "sopId" = ?`,
                    flowchartJson,
                    now,
                    sop_id
                )
                if (!updatedCount) {
                    flowchartId = randomUUID()
                    await db.$executeRawUnsafe(
                        `INSERT INTO "SopFlowchart" ("id", "sopId", "flowchartJson", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)`,
                        flowchartId,
                        sop_id,
                        flowchartJson,
                        now,
                        now
                    )
                }
            } else {
                const updatedCount = await db.$executeRawUnsafe(
                    `UPDATE "SopFlowchart" SET "flowchartJson" = $1, "updatedAt" = $2 WHERE "sopId" = $3`,
                    flowchartJson,
                    now,
                    sop_id
                )
                if (!updatedCount) {
                    flowchartId = randomUUID()
                    await db.$executeRawUnsafe(
                        `INSERT INTO "SopFlowchart" ("id", "sopId", "flowchartJson", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5)`,
                        flowchartId,
                        sop_id,
                        flowchartJson,
                        now,
                        now
                    )
                }
            }
            flowchartSaved = true
        }

        let updatedSop: any = null
        try {
            updatedSop = await db.sopPembuatan.update({
                where: { id: sop_id },
                data: {
                    connectorPaths: JSON.stringify(edges),
                    updatedAt: new Date()
                },
                include: {
                    sopFlowchart: true
                }
            })
        } catch (updateErr: any) {
            console.error('[API SAVE] Prisma update error:', updateErr);
            const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:')
            try {
                if (isSqlite) {
                    await db.$executeRawUnsafe(
                        `UPDATE "SopPembuatan" SET "connectorPaths" = ?, "updatedAt" = ? WHERE "id" = ?`,
                        JSON.stringify(edges),
                        new Date(),
                        sop_id
                    )
                } else {
                    await db.$executeRawUnsafe(
                        `UPDATE "SopPembuatan" SET "connectorPaths" = $1, "updatedAt" = $2 WHERE "id" = $3`,
                        JSON.stringify(edges),
                        new Date(),
                        sop_id
                    )
                }
                updatedSop = await db.sopPembuatan.findUnique({
                    where: { id: sop_id },
                    include: { sopFlowchart: true }
                })
            } catch (rawErr: any) {
                console.error('[API SAVE] Raw update error:', rawErr);
            }
        }

        return NextResponse.json({ success: true, data: updatedSop, flowchartSaved, flowchartId });
    } catch (error: any) {
        console.error('Error saving flowchart:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
