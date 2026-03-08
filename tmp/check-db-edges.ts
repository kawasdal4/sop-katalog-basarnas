import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    try {
        const flowcharts = await prisma.sopFlowchart.findMany();
        if (flowcharts.length === 0) {
            console.log("No flowcharts found.");
            return;
        }

        const flowchart = flowcharts[0];
        let out = `Analyzing SopFlowchart ${flowchart.id}...\n`;

        const data = JSON.parse(flowchart.flowchartJson);
        const edges = data.edges || [];

        out += `Found ${edges.length} valid edges stored in flowchartJson:\n`;
        for (const edge of edges) {
            out += `- ID: ${edge.id}\n`;
            out += `  SRC: ${edge.source} (${edge.sourceHandle})\n`;
            out += `  TGT: ${edge.target} (${edge.targetHandle})\n`;
            out += `  LBL: ${edge.label}\n`;
            out += `  HANDMADE: ${edge.data?.isHandmade}\n\n`;
        }

        fs.writeFileSync('tmp/db_edges_utf8.txt', out, 'utf-8');
        console.log("Wrote to tmp/db_edges_utf8.txt");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
