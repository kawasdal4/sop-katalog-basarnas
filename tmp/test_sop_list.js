const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuery() {
    try {
        console.log('--- Testing basic SopFile count ---');
        const count = await prisma.sopFile.count();
        console.log('Count:', count);

        console.log('\n--- Testing SopFile findMany with all new fields ---');
        const sops = await prisma.sopFile.findMany({
            take: 1,
            include: {
                user: true,
                // Using any cast to bypass potentially stale types
                updatedByUser: true
            }
        });
        console.log('Success! Sample SOP:', sops[0] ? sops[0].judul : 'No data');
    } catch (err) {
        console.error('\n❌ Query failed:');
        console.error(err.message);
        if (err.code) console.error('Error Code:', err.code);
    } finally {
        await prisma.$disconnect();
    }
}

testQuery();
