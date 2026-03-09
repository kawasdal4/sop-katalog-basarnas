const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const id = 'cmmiu1naf0001eyqsqc2xpokm';
        const sop = await prisma.sopPembuatan.findUnique({
            where: { id },
            include: {
                langkahLangkah: true,
                sopFlowchart: true
            }
        });

        if (sop) {
            console.log('SOP FOUND:');
            console.log('ID:', sop.id);
            console.log('Judul:', sop.judul);
            console.log('Langkah Count:', sop.langkahLangkah.length);
            console.log('Has Flowchart:', !!sop.sopFlowchart);
        } else {
            console.log('SOP NOT FOUND with ID:', id);

            // List some IDs to see what exists
            const sops = await prisma.sopPembuatan.findMany({
                take: 5,
                select: { id: true, judul: true }
            });
            console.log('Existing SOP IDs (first 5):');
            sops.forEach(s => console.log(`- ${s.id}: ${s.judul}`));
        }
    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
