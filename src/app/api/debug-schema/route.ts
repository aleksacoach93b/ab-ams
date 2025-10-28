import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get a sample player to see their current status
    const samplePlayer = await prisma.players.findFirst({
      include: {
        user: true,
        team: true
      }
    })

    // Try to get the enum values from the database
    const enumQuery = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"PlayerStatus")) as status_value
    `

    return NextResponse.json({
      message: 'Database schema debug info',
      samplePlayer: samplePlayer ? {
        id: samplePlayer.id,
        name: `${samplePlayer.firstName} ${samplePlayer.lastName}`,
        status: samplePlayer.status
      } : null,
      enumValues: enumQuery,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error checking database schema:', error)
    return NextResponse.json({
      message: 'Error checking database schema',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
