import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateRole } from '@/lib/auth-utils';

export async function GET(
    req: Request,
    { params }: { params: { sop_id: string } }
) {
    try {
        const { authenticated } = await validateRole(['ADMIN', 'DEVELOPER', 'STAF']);
        if (!authenticated) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sop_id } = await params;

        if (!sop_id) {
            return NextResponse.json({ error: 'Missing sop_id' }, { status: 400 });
        }

        let flowchart: { flowchartJson: string } | null = null
        try {
            const result = await db.sopFlowchart.findUnique({
                where: { sopId: sop_id },
            });
            if (result) {
                flowchart = { flowchartJson: result.flowchartJson }
            }
        } catch {
            const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:')
            if (isSqlite) {
                const raw = await db.$queryRawUnsafe(
                    `SELECT "flowchartJson" FROM "SopFlowchart" WHERE "sopId" = ? LIMIT 1`,
                    sop_id
                ) as Array<{ flowchartJson: string }>
                if (raw?.[0]) {
                    flowchart = raw[0]
                }
            } else {
                const raw = await db.$queryRawUnsafe(
                    `SELECT "flowchartJson" FROM "SopFlowchart" WHERE "sopId" = $1 LIMIT 1`,
                    sop_id
                ) as Array<{ flowchartJson: string }>
                if (raw?.[0]) {
                    flowchart = raw[0]
                }
            }
        }

        if (!flowchart) {
            return NextResponse.json({ nodes: null, edges: null });
        }

        const data = JSON.parse(flowchart.flowchartJson);
        return NextResponse.json({
            nodes: data.nodes,
            edges: data.edges,
        });
    } catch (error: any) {
        console.error('Error fetching flowchart:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
