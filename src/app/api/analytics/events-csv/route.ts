import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export const runtime = 'nodejs'
export const maxDuration = 60 // Increase timeout to 60 seconds for large datasets

export async function GET(request: NextRequest) {
  try {
    // Get ALL historical data - no date limit (same as players-csv)
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999) // End of today
    // Start date will be determined from the earliest event data

    console.log(`📊 Generating event analytics CSV for ALL historical data (up to ${endDate.toISOString().split('T')[0]})`)

    // Local dev mode: use localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Find earliest date from saved analytics or use a default
      const savedAnalyticsRaw = state.dailyEventAnalytics || []
      const startDate = savedAnalyticsRaw.length > 0
        ? new Date(Math.min(...savedAnalyticsRaw.map((item: any) => new Date(item.date).getTime())))
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Default to 1 year ago
      startDate.setHours(0, 0, 0, 0)
      
      // Get saved daily analytics data from localDevStore
      const savedAnalytics = savedAnalyticsRaw.filter((item: any) => {
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
    // Use saved daily_event_analytics as PRIMARY source (like players-csv does)
    console.log('📊 Fetching saved daily event analytics from database...')
    
    // Get ALL saved daily event analytics (PRIMARY DATA SOURCE - locked at 00:00)
    // Fallback to empty array if table doesn't exist
    let savedAnalytics: any[] = []
    try {
      savedAnalytics = await prisma.daily_event_analytics.findMany({
        orderBy: [
          { date: 'asc' },
          { eventType: 'asc' }
        ]
      })
      console.log(`📊 Found ${savedAnalytics.length} saved daily event analytics records`)
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.warn('⚠️ daily_event_analytics table does not exist, using live events data only')
        savedAnalytics = []
      } else {
        throw error
      }
    }

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

    // Find the earliest date from saved analytics or events
    let earliestDate: Date
    if (savedAnalytics.length > 0) {
      const allDates = savedAnalytics.map(analytics => analytics.date)
      earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    } else {
      // If no saved analytics, find earliest event date
      const earliestEvent = await prisma.events.findFirst({
        orderBy: { startTime: 'asc' },
        select: { startTime: true }
      })
      earliestDate = earliestEvent?.startTime 
        ? new Date(earliestEvent.startTime)
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Default to 1 year ago
    }
    earliestDate.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Create a map of saved analytics by date and event type (PRIMARY DATA SOURCE)
    const analyticsMap = new Map<string, any>()
    savedAnalytics.forEach(analytics => {
      const dateStr = analytics.date.toISOString().split('T')[0]
      const key = `${dateStr}_${analytics.eventType}`
      analyticsMap.set(key, analytics)
    })

    // Get all dates from earliest to today
    const allDatesInRange: string[] = []
    for (let d = new Date(earliestDate); d <= today; d.setDate(d.getDate() + 1)) {
      allDatesInRange.push(d.toISOString().split('T')[0])
    }

    // Find missing dates (dates without saved analytics)
    // If no saved analytics, all dates are "missing" (will use live data)
    const savedDates = savedAnalytics.length > 0 
      ? new Set(savedAnalytics.map(a => a.date.toISOString().split('T')[0]))
      : new Set<string>()
    const missingDates = allDatesInRange.filter(date => !savedDates.has(date))

    console.log(`📊 Processing ${allDatesInRange.length} dates (${savedAnalytics.length} saved, ${missingDates.length} missing)`)

    // Get live events data for missing dates only (if any)
    let liveData: any[] = []
    if (missingDates.length > 0) {
      console.log(`📊 Fetching live events for ${missingDates.length} missing dates...`)
      
      // Get ALL events at once (single query - much faster)
      // Use raw query to safely get matchDayTag if column exists
      let allEvents: any[] = []
      try {
        allEvents = await prisma.events.findMany({
          orderBy: {
            startTime: 'asc'
          },
          select: {
            id: true,
            title: true,
            type: true,
            startTime: true,
            endTime: true,
            matchDayTag: true
          }
        })
      } catch (error: any) {
        // If matchDayTag column doesn't exist, get events without it
        if (error.message?.includes('matchDayTag') || error.code === 'P2021') {
          console.warn('⚠️ matchDayTag column does not exist in events table, using N/A')
          allEvents = await prisma.events.findMany({
            orderBy: {
              startTime: 'asc'
            },
            select: {
              id: true,
              title: true,
              type: true,
              startTime: true,
              endTime: true
            }
          })
          // Add matchDayTag as null to all events
          allEvents = allEvents.map(event => ({ ...event, matchDayTag: null }))
        } else {
          throw error
        }
      }

      console.log(`📊 Found ${allEvents.length} total events in database`)

      // Process events for missing dates only
      missingDates.forEach(missingDate => {
        const dateStart = new Date(missingDate + 'T00:00:00')
        const dateEnd = new Date(missingDate + 'T23:59:59')
        
        const dayEvents = allEvents.filter(event => {
          if (!event.startTime) return false
          const eventDate = new Date(event.startTime)
          return eventDate >= dateStart && eventDate <= dateEnd
        })

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
          
          liveData.push({
            date: dateStart,
            eventType: typeLabel,
            eventTitle: event.title || 'Untitled Event',
            startTime: startTimeStr,
            endTime: endTimeStr,
            duration: duration,
            matchDayTag: (event as any).matchDayTag || 'N/A'
          })
        })
      })
    }

    // Process saved analytics data (PRIMARY SOURCE)
    const processedSavedAnalytics: any[] = []
    savedAnalytics.forEach(analytics => {
      const analyticsDate = new Date(analytics.date)
      analyticsDate.setHours(0, 0, 0, 0)
      
      // Map event type to label
      const typeLabel = eventTypeMap[analytics.eventType] || analytics.eventType
      
      // If eventTitles exist, split them and create separate rows
      if (analytics.eventTitles) {
        const titles = analytics.eventTitles.split('; ')
        titles.forEach((title: string, index: number) => {
          processedSavedAnalytics.push({
            date: analyticsDate,
            eventType: typeLabel,
            eventTitle: title.trim(),
            startTime: 'N/A', // Saved data doesn't have individual times
            endTime: 'N/A',
            duration: analytics.avgDuration,
            matchDayTag: 'N/A'
          })
        })
      } else {
        // If no titles, create one row with count
        processedSavedAnalytics.push({
          date: analyticsDate,
          eventType: typeLabel,
          eventTitle: `${analytics.count} event(s)`,
          startTime: 'N/A',
          endTime: 'N/A',
          duration: analytics.avgDuration,
          matchDayTag: 'N/A'
        })
      }
    })

    // Combine saved (PRIMARY) and live data
    const allData = [...processedSavedAnalytics, ...liveData]

    // Sort by date
    allData.sort((a, b) => a.date.getTime() - b.date.getTime())

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
