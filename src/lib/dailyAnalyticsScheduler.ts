import { prisma } from './prisma'

export class DailyAnalyticsScheduler {
  private static instance: DailyAnalyticsScheduler
  private isRunning = false

  private constructor() {}

  public static getInstance(): DailyAnalyticsScheduler {
    if (!DailyAnalyticsScheduler.instance) {
      DailyAnalyticsScheduler.instance = new DailyAnalyticsScheduler()
    }
    return DailyAnalyticsScheduler.instance
  }

  public start() {
    if (this.isRunning) {
      console.log('Daily analytics scheduler is already running')
      return
    }

    this.isRunning = true
    console.log('Starting daily analytics scheduler...')

    // Calculate time until next midnight
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0) // Next midnight
    const timeUntilMidnight = midnight.getTime() - now.getTime()

    // Schedule first run at midnight
    setTimeout(() => {
      this.runDailyAnalytics()
      // Then run every 24 hours
      setInterval(() => {
        this.runDailyAnalytics()
      }, 24 * 60 * 60 * 1000) // 24 hours
    }, timeUntilMidnight)

    console.log(`Next analytics run scheduled for: ${midnight.toISOString()}`)
  }

  public stop() {
    this.isRunning = false
    console.log('Daily analytics scheduler stopped')
  }

  private async runDailyAnalytics() {
    try {
      console.log('Running daily analytics collection...')
      
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Collect event analytics for yesterday
      await this.collectEventAnalytics(yesterday)
      
      // Collect player analytics for yesterday
      await this.collectPlayerAnalytics(yesterday)

      console.log(`Daily analytics collection completed for ${yesterday.toISOString().split('T')[0]}`)
    } catch (error) {
      console.error('Error running daily analytics:', error)
    }
  }

  private async collectEventAnalytics(date: Date) {
    try {
      // Set date to 00:00:00 for that day
      const dateStart = new Date(date)
      dateStart.setHours(0, 0, 0, 0)
      const dateEnd = new Date(dateStart)
      dateEnd.setHours(23, 59, 59, 999)
      
      // Fetch events for the specified date using startTime (events don't have date field)
      const events = await prisma.events.findMany({
        where: {
          startTime: {
            gte: dateStart,
            lte: dateEnd
          }
        }
      })

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

      // Group events by type label
      const eventGroups: { [eventTypeLabel: string]: any[] } = {}
      
      events.forEach(event => {
        const typeLabel = eventTypeMap[event.type] || event.type
        if (!eventGroups[typeLabel]) {
          eventGroups[typeLabel] = []
        }
        eventGroups[typeLabel].push(event)
      })

      // Calculate and store analytics for each event type
      for (const [eventTypeLabel, eventsOfType] of Object.entries(eventGroups)) {
        const totalDuration = eventsOfType.reduce((sum, event) => {
          if (event.startTime && event.endTime) {
            const start = new Date(event.startTime)
            const end = new Date(event.endTime)
            return sum + (end.getTime() - start.getTime()) / (1000 * 60) // minutes
          }
          return sum
        }, 0)

        const avgDuration = eventsOfType.length > 0 ? Math.round(totalDuration / eventsOfType.length) : 0

        // Collect event titles for this type
        const eventTitles = eventsOfType.map(event => event.title).join('; ')

        // Upsert daily event analytics - use dateStart (00:00:00) to ensure consistency
        // Once saved at 00:00, this data cannot be changed (no update, only create if doesn't exist)
        const existing = await prisma.daily_event_analytics.findUnique({
          where: {
            date_eventType: {
              date: dateStart,
              eventType: eventTypeLabel
            }
          }
        })

        if (!existing) {
          // Only create if doesn't exist - once saved at 00:00, it cannot be changed
          await prisma.daily_event_analytics.create({
            data: {
              date: dateStart,
              eventType: eventTypeLabel,
              count: eventsOfType.length,
              totalDuration: Math.round(totalDuration),
              avgDuration,
              eventTitles: eventTitles || null
            }
          })
          console.log(`✅ Created event analytics for ${eventTypeLabel} on ${dateStart.toISOString().split('T')[0]}`)
        } else {
          console.log(`⚠️ Event analytics already exists for ${eventTypeLabel} on ${dateStart.toISOString().split('T')[0]} - skipping (data locked at 00:00)`)
        }
      }

      console.log(`Event analytics collected for ${eventGroups.length} event types on ${date.toISOString().split('T')[0]}`)
    } catch (error) {
      console.error('Error collecting event analytics:', error)
    }
  }

  private async collectPlayerAnalytics(date: Date) {
    try {
      // Fetch all players to collect their availability status
      const players = await prisma.players.findMany({
        orderBy: {
          name: 'asc'
        }
      })

      // Map status values to labels (same as in dropdown)
      const statusMap: { [key: string]: string } = {
        'FULLY_AVAILABLE': 'Fully Available',
        'PARTIAL_TRAINING': 'Partially Available - Training',
        'PARTIAL_TEAM_INDIVIDUAL': 'Partially Available - Team + Individual',
        'REHAB_INDIVIDUAL': 'Rehabilitation - Individual',
        'NOT_AVAILABLE_INJURY': 'Unavailable - Injury',
        'PARTIAL_ILLNESS': 'Partially Available - Illness',
        'NOT_AVAILABLE_ILLNESS': 'Unavailable - Illness',
        'INDIVIDUAL_WORK': 'Individual Work',
        'RECOVERY': 'Recovery',
        'NOT_AVAILABLE_OTHER': 'Unavailable - Other',
        'DAY_OFF': 'Day Off',
        'NATIONAL_TEAM': 'National Team',
        'PHYSIO_THERAPY': 'Physio Therapy',
        'ACTIVE': 'Active',
        'INJURED': 'Injured',
        'SUSPENDED': 'Suspended',
        'INACTIVE': 'Inactive',
        'RETIRED': 'Retired'
      }

      // Store availability status for each player for this date
      // Set date to 00:00:00 for that day to ensure consistency
      const dateStart = new Date(date)
      dateStart.setHours(0, 0, 0, 0)
      
      for (const player of players) {
        const statusLabel = statusMap[player.availabilityStatus] || player.availabilityStatus || 'Unknown'
        const matchDayTag = player.matchDayTag || null
        
        // Upsert daily player analytics - use dateStart (00:00:00) to ensure consistency
        // Once saved at 00:00, this data cannot be changed (no update, only create if doesn't exist)
        const existing = await prisma.daily_player_analytics.findUnique({
          where: {
            date_playerId: {
              date: dateStart,
              playerId: player.id
            }
          }
        })

        if (!existing) {
          // Only create if doesn't exist - once saved at 00:00, it cannot be changed
          await prisma.daily_player_analytics.create({
            data: {
              date: dateStart,
              playerId: player.id,
              status: statusLabel,
              matchDayTag: matchDayTag,
              notes: null
            }
          })
          console.log(`✅ Created player analytics for ${player.name || player.id} on ${dateStart.toISOString().split('T')[0]} with matchDayTag: ${matchDayTag || 'N/A'}`)
        } else {
          console.log(`⚠️ Player analytics already exists for ${player.name || player.id} on ${dateStart.toISOString().split('T')[0]} - skipping (data locked at 00:00)`)
        }
      }

      console.log(`Player availability analytics collected for ${players.length} players on ${date.toISOString().split('T')[0]}`)
    } catch (error) {
      console.error('Error collecting player analytics:', error)
    }
  }

  // Manual trigger for testing
  public async triggerManualCollection(date?: Date) {
    const targetDate = date || new Date()
    targetDate.setHours(0, 0, 0, 0)
    
    console.log(`Manually triggering analytics collection for ${targetDate.toISOString().split('T')[0]}`)
    
    await this.collectEventAnalytics(targetDate)
    await this.collectPlayerAnalytics(targetDate)
    
    console.log('Manual analytics collection completed')
  }
}

// Export singleton instance
export const dailyAnalyticsScheduler = DailyAnalyticsScheduler.getInstance()
