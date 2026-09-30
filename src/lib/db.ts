import { PrismaClient } from '@prisma/client'
import { hydrateEnv } from './env'

hydrateEnv()

// Credentials are NEVER hardcoded — the connection string lives in .env as
// DATABASE_URL (see README). Fail loudly when it is missing or misconfigured
// so mis deployments surface immediately instead of silently hitting SQLite.
if (
  !process.env.DATABASE_URL ||
  !process.env.DATABASE_URL.startsWith('postgresql://')
) {
  throw new Error(
    'DATABASE_URL is missing or not a postgres:// URL. Set it in .env ' +
      '(Neon connection string) — see README.md → Deploy.'
  )
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
