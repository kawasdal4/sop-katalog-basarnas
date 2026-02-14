import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sop.go.id' },
    update: {},
    create: {
      email: 'admin@sop.go.id',
      name: 'Administrator',
      password: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('Created admin:', admin)

  // Create staf user
  const stafPassword = await bcrypt.hash('staf123', 10)
  const staf = await prisma.user.upsert({
    where: { email: 'staf@sop.go.id' },
    update: {},
    create: {
      email: 'staf@sop.go.id',
      name: 'Staff',
      password: stafPassword,
      role: 'STAF',
    },
  })
  console.log('Created staf:', staf)

  // Create counter
  await prisma.counter.upsert({
    where: { id: 'counter' },
    update: {},
    create: { id: 'counter', sopCount: 0, ikCount: 0 },
  })
  console.log('Created counter')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
