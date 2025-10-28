import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { dailyAnalyticsScheduler } from '@/lib/dailyAnalyticsScheduler'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    // Get date from request body (optional, defaults to yesterday)
    const body = await request.json().catch(() => ({}))
    const date = body.date ? new Date(body.date) : new Date()
    date.setHours(0, 0, 0, 0)

    // Trigger manual collection
    await dailyAnalyticsScheduler.triggerManualCollection(date)

    return NextResponse.json({
      message: 'Analytics collection triggered successfully',
      date: date.toISOString().split('T')[0]
    })

  } catch (error) {
    console.error('Error triggering analytics collection:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
