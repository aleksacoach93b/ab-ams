import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

/**
 * API endpoint to fix historical matchDayTag data in daily_player_analytics
 * This script will:
 * 1. Find all events with matchDayTag for each day
 * 2. For each player, find events they participated in on that day
 * 3. If event has matchDayTag, use it to update daily_player_analytics for that player and day
 * 4. Only update if the day is in the past (not today) and if analytics entry exists
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'COACH')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    console.log('🔧 Starting historical matchDayTag fix...')

    // Get all events with matchDayTag
    const eventsWithMatchDayTag = await prisma.events.findMany({
      where: {
        matchDayTag: {
          not: null
        }
      },
      include: {
        event_participants: {
          where: {
            playerId: {
              not: null
            }
          },
          select: {
            playerId: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    console.log(`📊 Found ${eventsWithMatchDayTag.length} events with matchDayTag`)

    let updatedCount = 0
    let skippedCount = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Process each event
    for (const event of eventsWithMatchDayTag) {
      if (!event.matchDayTag || !event.startTime) continue

      const eventDate = new Date(event.startTime)
      eventDate.setHours(0, 0, 0, 0)

      // Skip if event is today or in the future (only fix historical data)
      if (eventDate.getTime() >= today.getTime()) {
        console.log(`⏭️ Skipping event ${event.id} - date is today or future: ${eventDate.toISOString().split('T')[0]}`)
        skippedCount++
        continue
      }

      // Get all players who participated in this event
      const playerIds = event.event_participants
        .map(p => p.playerId)
        .filter((id): id is string => id !== null)

      if (playerIds.length === 0) continue

      console.log(`📅 Processing event ${event.id} on ${eventDate.toISOString().split('T')[0]} with matchDayTag: ${event.matchDayTag} for ${playerIds.length} players`)

      // For each player, update their daily_player_analytics for this date
      for (const playerId of playerIds) {
        try {
          // Check if analytics entry exists for this player and date
          const existingAnalytics = await prisma.daily_player_analytics.findUnique({
            where: {
              date_playerId: {
                date: eventDate,
                playerId: playerId
              }
            }
          })

          if (existingAnalytics) {
            // Only update if matchDayTag is null or different (preserve existing if it was already set)
            // But if it's null, update it with the event's matchDayTag
            if (existingAnalytics.matchDayTag === null || existingAnalytics.matchDayTag === undefined) {
              try {
                await prisma.daily_player_analytics.update({
                  where: {
                    date_playerId: {
                      date: eventDate,
                      playerId: playerId
                    }
                  },
                  data: {
                    matchDayTag: event.matchDayTag
                  }
                })
                updatedCount++
                console.log(`✅ Updated matchDayTag for player ${playerId} on ${eventDate.toISOString().split('T')[0]}: ${event.matchDayTag}`)
              } catch (updateError: any) {
                // If matchDayTag column doesn't exist, skip
                if (updateError.message?.includes('matchDayTag') || updateError.code === 'P2021') {
                  console.warn(`⚠️ matchDayTag column may not exist, skipping update for player ${playerId}`)
                } else {
                  throw updateError
                }
              }
            } else {
              console.log(`⏭️ Skipping player ${playerId} on ${eventDate.toISOString().split('T')[0]} - matchDayTag already set: ${existingAnalytics.matchDayTag}`)
              skippedCount++
            }
          } else {
            // Analytics entry doesn't exist - create it with matchDayTag
            // Get player's status for that day (or use current status as fallback)
            const player = await prisma.players.findUnique({
              where: { id: playerId },
              select: { status: true, availabilityStatus: true }
            })

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
            const statusLabel = statusMap[player?.status || player?.availabilityStatus || ''] || 'Fully Available'

            try {
              await prisma.daily_player_analytics.create({
                data: {
                  date: eventDate,
                  playerId: playerId,
                  status: statusLabel,
                  matchDayTag: event.matchDayTag,
                  notes: null
                }
              })
              updatedCount++
              console.log(`✅ Created analytics with matchDayTag for player ${playerId} on ${eventDate.toISOString().split('T')[0]}: ${event.matchDayTag}`)
            } catch (createError: any) {
              // If matchDayTag column doesn't exist, skip
              if (createError.message?.includes('matchDayTag') || createError.code === 'P2021') {
                console.warn(`⚠️ matchDayTag column may not exist, skipping create for player ${playerId}`)
              } else {
                throw createError
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error processing player ${playerId} for event ${event.id}:`, error)
        }
      }
    }

    console.log(`✅ Historical matchDayTag fix completed: ${updatedCount} updated, ${skippedCount} skipped`)

    return NextResponse.json({
      message: 'Historical matchDayTag fix completed',
      updated: updatedCount,
      skipped: skippedCount
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ Error fixing historical matchDayTag:', error)
    return NextResponse.json({
      message: 'Internal server error',
      error: error.message
    }, { status: 500 })
  }
}

