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
      // Fetch events for the specified date
      const events = await prisma.event.findMany({
        where: {
          date: {
            gte: date,
            lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) // Next day
          }
        },
        include: {
          participants: true
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
          const start = new Date(`2000-01-01T${event.startTime}`)
          const end = new Date(`2000-01-01T${event.endTime}`)
          return sum + (end.getTime() - start.getTime()) / (1000 * 60) // minutes
        }, 0)

        const avgDuration = Math.round(totalDuration / eventsOfType.length)

        // Collect event titles for this type
        const eventTitles = eventsOfType.map(event => event.title).join('; ')

        // Upsert daily event analytics
        await prisma.dailyEventAnalytics.upsert({
          where: {
            date_eventType: {
              date: date,
              eventType: eventTypeLabel
            }
          },
          update: {
            count: eventsOfType.length,
            totalDuration: Math.round(totalDuration),
            avgDuration,
            updatedAt: new Date()
          },
          create: {
            date,
            eventType: eventTypeLabel,
            count: eventsOfType.length,
            totalDuration: Math.round(totalDuration),
            avgDuration
          }
        })
      }

      console.log(`Event analytics collected for ${eventGroups.length} event types on ${date.toISOString().split('T')[0]}`)
    } catch (error) {
      console.error('Error collecting event analytics:', error)
    }
  }

  private async collectPlayerAnalytics(date: Date) {
    try {
      // Fetch all players to collect their availability status
      const players = await prisma.player.findMany({
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
      for (const player of players) {
        const statusLabel = statusMap[player.availabilityStatus] || player.availabilityStatus || 'Unknown'
        
        await prisma.dailyPlayerAnalytics.upsert({
          where: {
            date_playerId_activity: {
              date: date,
              playerId: player.id,
              activity: statusLabel
            }
          },
          update: {
            playerName: player.name,
            count: 1, // Always 1 for availability status
            updatedAt: new Date()
          },
          create: {
            date,
            playerId: player.id,
            playerName: player.name,
            activity: statusLabel,
            count: 1
          }
        })
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
