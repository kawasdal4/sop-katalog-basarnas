const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDownloadRoute() {
    try {
        console.log('1. Fetching a sample from sopPembuatan...');
        const draft = await prisma.$queryRawUnsafe('SELECT id, judul, combinedPdfPath FROM sopPembuatan WHERE combinedPdfPath IS NOT NULL LIMIT 1');

        if (draft.length === 0) {
            console.log('⚠️ No finalized drafts found in sopPembuatan. Create one first.');
            return;
        }

        const id = draft[0].id;
        console.log(`Found draft: ${draft[0].judul} (ID: ${id})`);

        console.log('2. Simulating download request to /api/download?id=' + id);
        const res = await fetch(`http://localhost:3000/api/download?id=${id}`);

        console.log(`Status: ${res.status}`);
        if (res.ok) {
            const contentType = res.headers.get('content-type');
            const disposition = res.headers.get('content-disposition');
            console.log(`✅ Success! [${contentType}] ${disposition}`);
            const buffer = await res.arrayBuffer();
            console.log(`Received ${buffer.byteLength} bytes.`);
        } else {
            const err = await res.json();
            console.error('❌ Failed:', err);
        }

    } catch (err) {
        console.error('❌ Error testing download:', err);
    } finally {
        await prisma.$disconnect();
    }
}

testDownloadRoute();
