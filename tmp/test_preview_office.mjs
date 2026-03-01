import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const sops = await prisma.sopFile.findMany({
        where: { fileName: { endsWith: '.xlsx' } },
        take: 1
    });
    if (sops.length === 0) return console.log('No excel files');

    const id = sops[0].id;
    console.log('Testing ID:', id);

    const res = await fetch('http://localhost:3000/api/preview-office', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: id })
    });

    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('Body length:', text.length);
    console.log('Body preview:', text.substring(0, 100));
}
run();
