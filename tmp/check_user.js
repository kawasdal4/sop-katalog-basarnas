const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'foetainment@gmail.com' }
    });
    console.log('Password for foetainment@gmail.com:', user ? user.password : 'USER NOT FOUND');
}
main().catch(console.error).finally(() => prisma.$disconnect());
