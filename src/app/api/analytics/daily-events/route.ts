import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    // Get date range from request body
    const body = await request.json()
    const { startDate, endDate } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ message: 'Start date and end date are required' }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    console.log(`📊 Fetching daily event analytics from ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`)

    // Get saved daily analytics data
    const dailyAnalytics = await prisma.dailyEventAnalytics.findMany({
      where: {
        date: {
          gte: start,
          lte: end
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Get live data for today (if not yet saved)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayAnalytics = await prisma.dailyEventAnalytics.findMany({
      where: {
        date: today
      }
    })

    // If no data for today, get live events data
    let liveTodayData: any[] = []
    if (todayAnalytics.length === 0 && today >= start && today <= end) {
      const todayEvents = await prisma.event.findMany({
        where: {
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        },
        include: {
          participants: true
        }
      })

      // Process live events data
      const eventTypes = todayEvents.reduce((acc, event) => {
        const type = event.type || 'OTHER'
        if (!acc[type]) {
          acc[type] = {
            count: 0,
            totalDuration: 0,
            events: []
          }
        }
        acc[type].count += 1
        acc[type].events.push(event)
        
        // Calculate duration
        if (event.startTime && event.endTime) {
          const start = new Date(`2000-01-01T${event.startTime}`)
          const end = new Date(`2000-01-01T${event.endTime}`)
          const duration = (end.getTime() - start.getTime()) / (1000 * 60)
          acc[type].totalDuration += duration
        }
        
        return acc
      }, {} as Record<string, any>)

      liveTodayData = Object.entries(eventTypes).map(([type, data]) => ({
        date: today,
        eventType: type,
        count: data.count,
        totalDuration: data.totalDuration,
        avgDuration: Math.round(data.totalDuration / data.count)
      }))
    }

    // Combine saved and live data
    const allData = [...dailyAnalytics, ...liveTodayData]

    console.log(`📊 Returning ${allData.length} analytics records`)

    return NextResponse.json(allData)

  } catch (error) {
    console.error('Error fetching daily event analytics:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
