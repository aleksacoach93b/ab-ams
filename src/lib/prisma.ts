import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

// Create Prisma client with connection pooling
const createPrismaClient = () => {
  const databaseUrl = process.env.DATABASE_URL
  const directUrl = process.env.DIRECT_URL
  
  // If no DATABASE_URL, allow creating a client without explicit datasource override
  if (!databaseUrl) {
    console.warn('🔗 DATABASE_URL is missing. Prisma client will be created without datasource override (queries will fail if used).')
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
    })
  }

  // For Supabase: Use DIRECT_URL for runtime queries to avoid prepared statement conflicts
  // The pooler (port 6543) doesn't support prepared statements properly
  // DIRECT_URL (port 5432) supports prepared statements and is better for Prisma
  let runtimeUrl = directUrl || databaseUrl
  
  // If using pooler URL, add pgbouncer parameter to disable prepared statements
  // Increase connection limit for high concurrency (50+ users)
  if (runtimeUrl && runtimeUrl.includes('pooler.supabase.com')) {
    runtimeUrl = runtimeUrl.includes('?') 
      ? `${runtimeUrl}&pgbouncer=true&connection_limit=20&pool_timeout=15`
      : `${runtimeUrl}?pgbouncer=true&connection_limit=20&pool_timeout=15`
  }
  
  console.log('🔗 Database URL configured:', '✅ Set')
  console.log('🔗 Using DIRECT_URL for runtime queries (avoids prepared statement conflicts)')
  
  return new PrismaClient({
    datasources: {
      db: {
        url: runtimeUrl
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Optimize for high concurrency (50+ users)
    // Connection pool settings for better performance
    __internal: {
      engine: {
        connectTimeout: 10000, // 10 seconds
        queryTimeout: 30000, // 30 seconds
      }
    } as any
  })
}

export const prisma = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}
