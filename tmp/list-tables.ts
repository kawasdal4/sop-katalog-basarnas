import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table';`)
    console.log('Tables in database:')
    console.log(JSON.stringify(tables, null, 2))
    
    // Check if SopFlowchart exists and its columns
    try {
      const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info("SopFlowchart");`)
      console.log('\nColumns in SopFlowchart:')
      console.log(JSON.stringify(columns, null, 2))
    } catch (e) {
      console.log('\nSopFlowchart table does not exist or error querying columns.')
    }
  } catch (error) {
    console.error('Error listing tables:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
