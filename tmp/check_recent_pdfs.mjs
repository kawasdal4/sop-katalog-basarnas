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
        take: 3
    });

    console.log("=== Recent Public PDFs ===");
    sops.forEach(sop => {
        console.log(`ID: ${sop.id}`);
        console.log(`Judul: ${sop.judul}`);
        console.log(`filePath: ${sop.filePath}`);
        console.log(`driveFileId: ${sop.driveFileId}`);
        console.log('---');
    });
}

run().catch(console.error).finally(() => prisma.$disconnect());
