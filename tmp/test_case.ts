import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
    const result = await prisma.sopFile.findMany({
        where: {
            judul: {
                contains: 'sop',
            }
        }
    })
    console.log(`Found ${result.length} items containing "sop"`)

    const result2 = await prisma.sopFile.findMany({
        where: {
            judul: {
                contains: 'SOP',
            }
        }
    })
    console.log(`Found ${result2.length} items containing "SOP"`)
}

test().catch(console.error).finally(() => prisma.$disconnect())
