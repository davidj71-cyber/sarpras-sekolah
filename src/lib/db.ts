import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ── Prisma client configuration untuk serverless (Vercel + Neon) ───────────
// Neon PostgreSQL pakai connection pool yang bisa lambat di cold start.
// Setting log: ['error'] supaya tidak ada query logging overhead di production.
// Di production, Prisma client di-cache di globalThis supaya tidak recreate
// di setiap cold start (hemat ~500ms initialization).
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
  })
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

// Cache di globalThis supaya PrismaClient tidak recreate di setika cold start
// (Vercel serverless reuse instance antar invocation dalam warm window).
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
else if (!globalForPrisma.prisma) globalForPrisma.prisma = db