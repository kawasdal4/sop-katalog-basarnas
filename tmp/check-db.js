const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const id = 'cmmhqt7jn0049eyls1szzcg7f';
    const flowchart = await prisma.sopFlowchart.findUnique({ where: { sopId: id } });
    if (flowchart) {
        const parsed = JSON.parse(flowchart.flowchartJson);
        const edges = parsed.edges || [];
        console.log(`--- FLOWCHART JSON (${edges.length} edges) ---`);
        edges.forEach(e => {
            console.log(`[${e.id}] src=${e.sourceHandle} tgt=${e.targetHandle}`);
        });
    }

    const pembuatan = await prisma.sopPembuatan.findUnique({ where: { id } });
    if (pembuatan && pembuatan.connectorPaths) {
        const parsed = JSON.parse(pembuatan.connectorPaths);
        console.log(`\n--- CONNECTOR PATHS JSON (${parsed.length} edges) ---`);
        parsed.forEach(e => {
            console.log(`[${e.id}] src=${e.sourceHandle} tgt=${e.targetHandle}`);
        });
    }
}

main().finally(() => prisma.$disconnect());
