const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const id = 'cmmiu1naf0001eyqsqc2xpokm';
        const sop = await prisma.sopPembuatan.findUnique({
            where: { id },
            include: {
                langkahLangkah: {
                    orderBy: { order: 'asc' }
                }
            }
        });

        if (sop) {
            console.log('SOP FOUND:', sop.judul);
            console.log('--- Steps Details ---');
            sop.langkahLangkah.forEach(s => {
                console.log(`Step ${s.order}: ${s.aktivitas}`);
                console.log(`  Type: ${s.stepType}`);
                console.log(`  Yes: ${s.nextStepYes} (${typeof s.nextStepYes})`);
                console.log(`  No: ${s.nextStepNo} (${typeof s.nextStepNo})`);
                console.log(`  Order: ${s.order} (${typeof s.order})`);
            });

            // Also check SopFlowchart record
            const flow = await prisma.sopFlowchart.findUnique({
                where: { sopId: id }
            });
            if (flow) {
                console.log('--- Flowchart Record ---');
                const json = JSON.parse(flow.flowchartJson);
                console.log('Saved Edges count:', json.edges?.length);
                if (json.edges) {
                    json.edges.forEach(e => {
                        console.log(`Edge: ${e.id} | Label: ${e.label} | Source: ${e.source} | Target: ${e.target}`);
                    });
                }
            }
        } else {
            console.log('SOP NOT FOUND');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
