import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const sop = await prisma.sopFile.findFirst({
        where: {
            isPublicSubmission: true,
            fileName: { endsWith: '.pdf' },
            filePath: null
        },
        orderBy: {
            uploadedAt: 'desc'
        }
    });

    if (!sop) {
        console.log("No such SOP found");
        return;
    }

    console.log(`Testing SOP: ${sop.id} (filePath: ${sop.filePath})`);
    try {
        const res = await fetch(`http://localhost:3000/api/file?action=preview&id=${sop.id}`);

        console.log('Status:', res.status);
        console.log('Content-Type:', res.headers.get('content-type'));

        const text = await res.text();
        console.log(`Text length: ${text.length}`);
        console.log('Raw text:', JSON.stringify(text));

    } catch (e) {
        console.error(e);
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
