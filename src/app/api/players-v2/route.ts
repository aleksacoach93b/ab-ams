import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const players = await prisma.players.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
      },
      take: 10
    })
    return NextResponse.json({ players })
  } catch (error) {
    return NextResponse.json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


