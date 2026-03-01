import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function run() {
    const sops = await prisma.sopFile.findMany({
        where: {
            fileName: { endsWith: '.pdf' },
            isPublicSubmission: true
        },
        take: 5
    });

    if (sops.length === 0) {
        console.log("No public PDFs found");
        return;
    }

    for (const sop of sops) {
        console.log(`\nTesting SOP: ${sop.id} (${sop.fileName})`);
        try {
            const res = await fetch(`http://localhost:3000/api/file?action=preview&id=${sop.id}`);

            console.log('Status:', res.status);
            console.log('Content-Type:', res.headers.get('content-type'));

            const text = await res.text();
            console.log(`Text length: ${text.length}`);

            if (text.length === 0) {
                console.log('WARNING: RESPONSE IS COMPLETELY EMPTY ("")');
            } else if (text.startsWith('{')) {
                console.log('Response is JSON:', text.substring(0, 100));
            } else {
                console.log('Response is something else (probably PDF binary). Starts with:', text.substring(0, 20).replace(/\n/g, '\\n'));
            }
        } catch (e) {
            console.error(e);
        }
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
