import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

// Create Prisma client with connection pooling
const createPrismaClient = () => {
  const databaseUrl = process.env.DATABASE_URL
  
  // Add connection pooling parameters for Supabase
  const urlWithPooling = databaseUrl?.includes('?') 
    ? `${databaseUrl}&pgbouncer=true&connection_limit=1`
    : `${databaseUrl}?pgbouncer=true&connection_limit=1`
  
  console.log('🔗 Database URL configured:', urlWithPooling ? '✅ Set' : '❌ Missing')
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: urlWithPooling
      }
    }
  })
}

export const prisma = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}
