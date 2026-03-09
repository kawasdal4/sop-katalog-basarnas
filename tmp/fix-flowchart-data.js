const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const id = 'cmmiu1naf0001eyqsqc2xpokm';

        // Backup
        const flow = await prisma.sopFlowchart.findUnique({
            where: { sopId: id }
        });

        if (flow) {
            console.log('Backing up flowchart...');
            const backupPath = 'tmp/flowchart-backup.json';
            const fs = require('fs');
            fs.writeFileSync(backupPath, JSON.stringify(flow, null, 2));
            console.log('Backup saved to', backupPath);

            // Delete to force regeneration
            await prisma.sopFlowchart.delete({
                where: { sopId: id }
            });
            console.log('SopFlowchart record deleted. Refresh the page to see regenerated edges.');
        } else {
            console.log('No flowchart record to delete.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
