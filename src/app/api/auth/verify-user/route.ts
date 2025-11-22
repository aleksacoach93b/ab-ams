import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 5 // 5 seconds timeout for high concurrency

/**
 * Internal API endpoint to verify if user exists and is active
 * Used by middleware (Edge Runtime compatible)
 * Optimized for high concurrency (50+ users)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    // Skip logging in production for performance (only log errors)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [VERIFY-USER] Checking user:', userId)
    }

    if (!userId) {
      return NextResponse.json(
        { exists: false, isActive: false },
        { status: 400 }
      )
    }

    // Skip check for fallback users
    if (userId === 'local-admin' || userId === 'coach_user_001') {
      return NextResponse.json(
        { exists: true, isActive: true },
        { status: 200 }
      )
    }

    // Use findUnique with timeout protection for high concurrency
    const user = await Promise.race([
      prisma.users.findUnique({
        where: { id: userId },
        select: { id: true, isActive: true }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 4000)
      )
    ]) as { id: string; isActive: boolean } | null

    if (!user) {
      return NextResponse.json(
        { exists: false, isActive: false },
        { status: 200 }
      )
    }

    if (!user.isActive) {
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
    // On error, return false but don't log in production for performance
    if (process.env.NODE_ENV === 'development') {
      console.error('🚫 [VERIFY-USER] Error:', error)
    }
    // Return false on error - middleware will handle gracefully
    return NextResponse.json(
      { exists: false, isActive: false },
      { status: 500 }
    )
  }
}

