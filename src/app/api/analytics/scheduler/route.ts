import { NextRequest, NextResponse } from 'next/server'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function POST(request: NextRequest) {
  try {
    if (LOCAL_DEV_MODE) {
      return NextResponse.json({ 
        message: 'Analytics scheduler skipped in LOCAL_DEV_MODE',
        mode: 'local_dev'
      })
    }

    const { dailyAnalyticsScheduler } = await import('@/lib/dailyAnalyticsScheduler')
    
    const body = await request.json().catch(() => ({}))
    const { action } = body

    if (action === 'start') {
      dailyAnalyticsScheduler.start()
      return NextResponse.json({ message: 'Analytics scheduler started' })
    } else if (action === 'stop') {
      dailyAnalyticsScheduler.stop()
      return NextResponse.json({ message: 'Analytics scheduler stopped' })
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in analytics scheduler API:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
