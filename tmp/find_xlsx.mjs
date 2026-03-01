import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const sops = await prisma.sopFile.findMany({
        where: {
            fileName: {
                endsWith: '.xlsx'
            }
        },
        take: 1
    });
    console.log(sops.map(s => ({ id: s.id, judul: s.judul })));
}
run();
