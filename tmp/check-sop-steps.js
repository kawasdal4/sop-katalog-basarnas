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
            console.log('--- Steps ---');
            sop.langkahLangkah.forEach(s => {
                console.log(`Step ${s.order}: ${s.aktivitas.substring(0, 50)}...`);
                console.log(`  Type: ${s.stepType || 'N/A'}`);
                console.log(`  Yes -> Step ${s.nextStepYes}`);
                console.log(`  No  -> Step ${s.nextStepNo}`);
            });
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
