const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (user) console.log(user.id);
    await prisma.$disconnect();
}

main();
