const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const id = 'cmmiu1naf0001eyqsqc2xpokm';
        const flow = await prisma.sopFlowchart.findUnique({
            where: { sopId: id }
        });

        if (flow) {
            console.log('--- SAVED EDGES ---');
            const data = JSON.parse(flow.flowchartJson);
            const edges = data.edges || [];
            console.log(`Total edges: ${edges.length}`);
            edges.forEach(e => {
                console.log(`ID: ${e.id} | Source: ${e.source} | Target: ${e.target} | Label: ${e.label} | SourceHandle: ${e.sourceHandle}`);
            });

            console.log('\n--- SAVED NODES ---');
            const nodes = data.nodes || [];
            console.log(`Total nodes: ${nodes.length}`);
            // Check if flow-node-3 and flow-node-2 exist
            const node2 = nodes.find(n => n.id === 'flow-node-2');
            const node3 = nodes.find(n => n.id === 'flow-node-3');
            console.log('Node 2 exists:', !!node2);
            console.log('Node 3 exists:', !!node3);

        } else {
            console.log('No flowchart record found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
