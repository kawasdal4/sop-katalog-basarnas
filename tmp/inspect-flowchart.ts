import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function inspect() {
    const sopId = 'cmmhqt7jn0049eyls1szzcg7f'; // ID from the browser URL

    const flowchart = await prisma.sopFlowchart.findUnique({
        where: { sopId },
    });

    if (!flowchart) {
        console.log("No flowchart found for this SOP.");
        return;
    }

    const json = JSON.parse(flowchart.flowchartJson);
    const edges = json.edges || [];
    const nodes = json.nodes || [];

    let output = "=== EDGES ===\n";
    output += JSON.stringify(edges, null, 2) + "\n";

    output += "\n=== RELEVANT NODES ===\n";
    output += JSON.stringify(nodes.filter((n: any) => n.id === '5' || n.id === '4'), null, 2) + "\n";

    fs.writeFileSync('tmp/flowchart_out.json', output, 'utf8');
    console.log("Written to tmp/flowchart_out.json");
}

inspect()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
