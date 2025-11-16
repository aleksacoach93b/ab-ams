import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET(request: NextRequest) {
  try {
    // Get date range from query parameters (default to last 30 days)
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    console.log(`📊 Generating event analytics CSV for ${days} days (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`)

    // Local dev mode: use localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Get saved daily analytics data from localDevStore
      const savedAnalytics = (state.dailyEventAnalytics || []).filter((item: any) => {
        const itemDate = new Date(item.date)
        return itemDate >= startDate && itemDate <= endDate
      }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

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

      // Get all saved analytics dates
      const savedDates = savedAnalytics.map((item: any) => new Date(item.date).toISOString().split('T')[0])
      
      // Generate all dates in range
      const allDates: string[] = []
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        allDates.push(currentDate.toISOString().split('T')[0])
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Find missing dates (dates without saved data)
      const missingDates = allDates.filter(date => !savedDates.includes(date))
      
      console.log(`📊 [LOCAL_DEV] Found ${missingDates.length} missing dates:`, missingDates)

      // Get live events data for missing dates
      let liveData: any[] = []
      for (const missingDate of missingDates) {
        const dateStart = new Date(missingDate + 'T00:00:00')
        const dateEnd = new Date(missingDate + 'T23:59:59')
        
        // Get events from localDevStore for this date
        const dayEvents = (state.events || []).filter((event: any) => {
          const eventDate = new Date(event.date)
          return eventDate >= dateStart && eventDate <= dateEnd
        })

        console.log(`📊 [LOCAL_DEV] Found ${dayEvents.length} events for ${missingDate}`)

        // Create separate rows for each event
        dayEvents.forEach((event: any) => {
          const typeLabel = eventTypeMap[event.type] || event.type
          
          // Calculate duration
          let duration = 0
          if (event.startTime && event.endTime) {
            const start = new Date(`2000-01-01T${event.startTime}`)
            const end = new Date(`2000-01-01T${event.endTime}`)
            duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
          }
          
          liveData.push({
            date: dateStart,
            eventType: typeLabel,
            eventTitle: event.title || 'Untitled Event',
            startTime: event.startTime || 'N/A',
            endTime: event.endTime || 'N/A',
            duration: duration,
            matchDayTag: event.matchDayTag || 'N/A'
          })
        })
      }

      // Process saved analytics data
      const processedDailyAnalytics = savedAnalytics.map((item: any) => {
        const itemDate = new Date(item.date)
        return {
          date: itemDate,
          eventType: item.eventType || 'Other',
          eventTitle: 'N/A', // Saved data doesn't have individual titles
          startTime: 'N/A',
          endTime: 'N/A',
          duration: item.avgDuration || 0,
          matchDayTag: 'N/A' // Saved data doesn't have individual match day tags
        }
      })

      // Combine saved and live data
      const allData = [...processedDailyAnalytics, ...liveData]

      // Generate CSV content
      let csvContent = 'Date,Event Type,Event Title,Start Time,End Time,Duration (minutes),Match Day Tag\n'

      allData.forEach(item => {
        const dateStr = item.date instanceof Date ? item.date.toISOString().split('T')[0] : new Date(item.date).toISOString().split('T')[0]
        csvContent += `${dateStr},${item.eventType},"${item.eventTitle}",${item.startTime},${item.endTime},${item.duration},"${item.matchDayTag}"\n`
      })

      console.log(`📊 [LOCAL_DEV] Generated CSV with ${allData.length} records`)

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="event-analytics-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Database mode: use Prisma
    // Note: daily_event_analytics model doesn't exist in schema, so we'll use only live events data
    // Get all dates in range
    const allDates: string[] = []
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      allDates.push(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // We'll process all dates as "missing" since we don't have saved analytics
    const missingDates = allDates
    
    console.log(`📊 Processing ${missingDates.length} dates from events data`)
    
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
          startTime: {
            gte: dateStart,
            lte: dateEnd
          }
        },
        include: {
          event_participants: true
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
          const start = new Date(event.startTime)
          const end = new Date(event.endTime)
          duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
        }
        
        // Format startTime and endTime for CSV
        const startTimeStr = event.startTime ? new Date(event.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A'
        const endTimeStr = event.endTime ? new Date(event.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A'
        
        dayData.push({
          date: dateStart,
          eventType: typeLabel,
          eventTitle: event.title || 'Untitled Event',
          startTime: startTimeStr,
          endTime: endTimeStr,
          duration: duration,
          matchDayTag: event.matchDayTag || 'N/A'
        })
      })

      liveData.push(...dayData)
    }

    // Since we don't have saved daily analytics, use only live data
    const allData = liveData

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
