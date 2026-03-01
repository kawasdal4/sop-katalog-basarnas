import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const sops = await prisma.sopFile.findMany({
        where: {
            isPublicSubmission: true,
            fileName: { endsWith: '.pdf' }
        },
        orderBy: {
            uploadedAt: 'desc'
        },
        take: 10
    });

    const nullPathSops = sops.filter(s => s.filePath === null);

    if (nullPathSops.length === 0) {
        console.log("No null filePath SOPs found");
        return;
    }

    const sop = nullPathSops[0];
    console.log(`Testing SOP: ${sop.id}`);
    console.log(`Judul: ${sop.judul}`);
    console.log('filePath is exactly:', sop.filePath);
    console.log(`Uploaded at: ${sop.uploadedAt}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
