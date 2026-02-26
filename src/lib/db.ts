import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
    errorFormat: 'pretty',
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Test database connection on startup
if (process.env.NODE_ENV === 'production') {
  db.$connect()
    .then(() => console.log('✅ Database connected successfully'))
    .catch((err) => console.error('❌ Database connection error:', err))
}
