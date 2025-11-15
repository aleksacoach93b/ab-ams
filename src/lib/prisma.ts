import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

// Create Prisma client with connection pooling
const createPrismaClient = () => {
  const databaseUrl = process.env.DATABASE_URL
  
  // If no DATABASE_URL, allow creating a client without explicit datasource override
  if (!databaseUrl) {
    console.warn('🔗 DATABASE_URL is missing. Prisma client will be created without datasource override (queries will fail if used).')
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
    })
  }

  // Configure Prisma for connection pooling (important for Supabase and serverless)
  console.log('🔗 Database URL configured:', '✅ Set')
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Disable query engine connection pooling since we're using Supabase pooler
    // Prisma will use the connection string's pooler directly
  })
}

export const prisma = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}
