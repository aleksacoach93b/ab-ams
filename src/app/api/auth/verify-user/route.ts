import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Internal API endpoint to verify if user exists and is active
 * Used by middleware (Edge Runtime compatible)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        { exists: false, isActive: false },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true }
    })

    if (!user) {
      console.log('🚫 [VERIFY-USER] User not found:', userId)
      return NextResponse.json(
        { exists: false, isActive: false },
        { status: 200 }
      )
    }

    if (!user.isActive) {
      console.log('🚫 [VERIFY-USER] User inactive:', userId)
      return NextResponse.json(
        { exists: true, isActive: false },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { exists: true, isActive: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('🚫 [VERIFY-USER] Error:', error)
    return NextResponse.json(
      { exists: false, isActive: false },
      { status: 500 }
    )
  }
}

