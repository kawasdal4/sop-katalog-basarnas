import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`) as any[]
    console.log('TABLES:', tables.map(t => t.name).join(', '))
    for (const t of tables) {
        if (t.name === 'SopFlowchart') {
            const cols = await prisma.$queryRawUnsafe(`PRAGMA table_info("SopFlowchart");`) as any[]
            console.log('SOPFLOWCHART_COLS:', cols.map(c => c.name).join(', '))
        }
    }
}
main().finally(() => prisma.$disconnect())
