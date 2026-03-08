const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            take: 5
        });

        console.log('User Sample:');
        users.forEach(u => {
            console.log(`- ${u.name}: profilePhoto = ${u.profilePhoto}, Keys: ${Object.keys(u).join(', ')}`);
        });

        // Check with raw query
        const rawUsers = await prisma.$queryRawUnsafe('SELECT * FROM User LIMIT 5');
        console.log('\nRaw Query Sample (Keys):');
        rawUsers.forEach(u => {
            console.log(`- ${u.name}: profilePhoto = ${u.profilePhoto}, Keys: ${Object.keys(u).join(', ')}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
