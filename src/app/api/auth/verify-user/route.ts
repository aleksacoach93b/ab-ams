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

    console.log('🔍 [VERIFY-USER] Checking user:', userId)

    if (!userId) {
      console.log('🚫 [VERIFY-USER] No userId provided')
      return NextResponse.json(
        { exists: false, isActive: false },
        { status: 400 }
      )
    }

    // Skip check for fallback users
    if (userId === 'local-admin' || userId === 'coach_user_001') {
      console.log('⚠️ [VERIFY-USER] Fallback user, returning true:', userId)
      return NextResponse.json(
        { exists: true, isActive: true },
        { status: 200 }
      )
    }

    const user = await prisma.users.findUnique({
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

    console.log('✅ [VERIFY-USER] User verified:', userId)
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

