import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get date range from query parameters (default to last 30 days)
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    console.log(`📊 Generating event analytics CSV for ${days} days (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`)

    // Get saved daily analytics data
    const dailyAnalytics = await prisma.dailyEventAnalytics.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Always get live data for today and any missing days
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Get all saved analytics data
    const savedDates = dailyAnalytics.map(item => item.date.toISOString().split('T')[0])
    
    // Generate all dates in range
    const allDates: string[] = []
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      allDates.push(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Find missing dates (dates without saved data)
    const missingDates = allDates.filter(date => !savedDates.includes(date))
    
    console.log(`📊 Found ${missingDates.length} missing dates:`, missingDates)
    
    // Map event type values to labels (same as in dropdown)
    const eventTypeMap: { [key: string]: string } = {
      'TRAINING': 'Training',
      'MATCH': 'Match',
      'MEETING': 'Meeting',
      'MEDICAL': 'Medical',
      'RECOVERY': 'Recovery',
      'MEAL': 'Meal',
      'REST': 'Rest',
      'LB_GYM': 'LB Gym',
      'UB_GYM': 'UB Gym',
      'PRE_ACTIVATION': 'Pre-Activation',
      'REHAB': 'Rehab',
      'STAFF_MEETING': 'Staff Meeting',
      'VIDEO_ANALYSIS': 'Video Analysis',
      'DAY_OFF': 'Day Off',
      'TRAVEL': 'Travel',
      'OTHER': 'Other'
    }

    // Get live events data for missing dates
    let liveData: any[] = []
    for (const missingDate of missingDates) {
      const dateStart = new Date(missingDate + 'T00:00:00')
      const dateEnd = new Date(missingDate + 'T23:59:59')
      
      const dayEvents = await prisma.events.findMany({
        where: {
          date: {
            gte: dateStart,
            lte: dateEnd
          }
        },
        include: {
          participants: true
        }
      })

      console.log(`📊 Found ${dayEvents.length} events for ${missingDate}`)

      // Process events data for this day
      const eventTypes = dayEvents.reduce((acc, event) => {
        const type = event.type || 'OTHER'
        const typeLabel = eventTypeMap[type] || type
        if (!acc[typeLabel]) {
          acc[typeLabel] = {
            count: 0,
            totalDuration: 0,
            events: []
          }
        }
        acc[typeLabel].count += 1
        acc[typeLabel].events.push(event)
        
        // Calculate duration
        if (event.startTime && event.endTime) {
          const start = new Date(`2000-01-01T${event.startTime}`)
          const end = new Date(`2000-01-01T${event.endTime}`)
          const duration = (end.getTime() - start.getTime()) / (1000 * 60)
          acc[typeLabel].totalDuration += duration
        }
        
        return acc
      }, {} as Record<string, any>)

      // Create separate rows for each event instead of grouping by type
      const dayData: any[] = []
      dayEvents.forEach(event => {
        const typeLabel = eventTypeMap[event.type] || event.type
        
        // Calculate duration
        let duration = 0
        if (event.startTime && event.endTime) {
          const start = new Date(`2000-01-01T${event.startTime}`)
          const end = new Date(`2000-01-01T${event.endTime}`)
          duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
        }
        
        dayData.push({
          date: dateStart,
          eventType: typeLabel,
          eventTitle: event.title || 'Untitled Event',
          startTime: event.startTime || 'N/A',
          endTime: event.endTime || 'N/A',
          duration: duration,
          matchDayTag: event.matchDayTag || 'N/A'
        })
      })

      liveData.push(...dayData)
    }

    // Map event type values to labels for saved data as well
    const processedDailyAnalytics = dailyAnalytics.map(item => ({
      ...item,
      eventType: eventTypeMap[item.eventType] || item.eventType,
      eventTitle: 'N/A', // Saved data doesn't have individual titles
      startTime: 'N/A',
      endTime: 'N/A',
      duration: item.avgDuration || 0,
      matchDayTag: 'N/A' // Saved data doesn't have individual match day tags
    }))

    // Combine saved and live data
    const allData = [...processedDailyAnalytics, ...liveData]

    // Generate CSV content
    let csvContent = 'Date,Event Type,Event Title,Start Time,End Time,Duration (minutes),Match Day Tag\n'

    allData.forEach(item => {
      const dateStr = item.date.toISOString().split('T')[0]
      csvContent += `${dateStr},${item.eventType},"${item.eventTitle}",${item.startTime},${item.endTime},${item.duration},"${item.matchDayTag}"\n`
    })

    console.log(`📊 Generated CSV with ${allData.length} records`)

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="event-analytics-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Error generating event analytics CSV:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
