import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🏥 Health check started')
    
    // Test basic database connection
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Test simple query
    const userCount = await prisma.user.count()
    console.log(`📊 Users count: ${userCount}`)
    
    const eventCount = await prisma.event.count()
    console.log(`📅 Events count: ${eventCount}`)
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        userCount,
        eventCount
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        jwtSecret: process.env.JWT_SECRET ? 'Set' : 'Not set'
      }
    })
    
  } catch (error) {
    console.error('❌ Health check failed:', error)
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        jwtSecret: process.env.JWT_SECRET ? 'Set' : 'Not set'
      }
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
