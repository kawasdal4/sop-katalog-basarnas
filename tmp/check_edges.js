const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const res = await prisma.sopFlowchart.findUnique({
        where: { sopId: 'cmmhqt7jn0049eyls1szzcg7f' }
    });
    if (!res) return console.log('No flowchart data saved');
    const flow = JSON.parse(res.flowchartJson);
    let out = `Edges saved: ${flow.edges.length}\n`;
    flow.edges.forEach(e => {
        out += `Edge ${e.id} Source: ${e.sourceHandle} Target: ${e.targetHandle}\n`;
    });
    fs.writeFileSync('d:/TEMP/sop-katalog-basarnas/sop-katalog-basarnas/tmp/edges_out_utf8.txt', out, 'utf8');
}

check().catch(console.error).finally(() => prisma.$disconnect());
