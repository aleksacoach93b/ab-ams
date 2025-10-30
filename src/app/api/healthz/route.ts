import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Minimal raw ping to avoid old model names
    await prisma.$queryRaw`SELECT 1` as unknown

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


