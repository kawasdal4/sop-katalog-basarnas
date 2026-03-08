const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.$queryRawUnsafe("SELECT id, email, name, profilePhoto FROM User");
        console.log('Users Data:', JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
