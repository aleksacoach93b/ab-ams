import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setMatchDayTag, setMatchDayTagsBulk } from '@/lib/localDevStore';
const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerIds, matchDayTag } = body;

    if (!playerIds || !Array.isArray(playerIds)) {
      return NextResponse.json({ message: 'Player IDs array is required' }, { status: 400 });
    }

    if (LOCAL_DEV_MODE) {
      await setMatchDayTagsBulk(playerIds, matchDayTag === '' ? null : matchDayTag)
      return NextResponse.json({ message: 'Match day tags updated (local mode)', updatedCount: (playerIds || []).length }, { status: 200 });
    }

    // Update match day tags for all specified players
    const updatedPlayers = await prisma.players.updateMany({
      where: {
        id: {
          in: playerIds
        }
      },
      data: {
        matchDayTag: matchDayTag === '' ? null : matchDayTag
      }
    });

    console.log(`✅ Updated match day tags for ${updatedPlayers.count} players`);

    // Automatically save matchDayTag to daily analytics for today when it changes
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    try {
      // Get all players that were updated to get their current matchDayTag
      const players = await prisma.players.findMany({
        where: {
          id: { in: playerIds }
        },
        select: {
          id: true,
          matchDayTag: true
        }
      })

      // Save matchDayTag to daily analytics for today for each player
      for (const player of players) {
        // Check if analytics already exists for today
        const existingAnalytics = await prisma.daily_player_analytics.findUnique({
          where: {
            date_playerId: {
              date: today,
              playerId: player.id
            }
          }
        })

        if (existingAnalytics) {
          // Update matchDayTag if analytics already exists (today's data can still be updated)
          // CRITICAL: Only update if it's today - historical data is immutable
          const analyticsDate = new Date(existingAnalytics.date)
          analyticsDate.setHours(0, 0, 0, 0)
          const todayDate = new Date(today)
          todayDate.setHours(0, 0, 0, 0)
          
          if (analyticsDate.getTime() === todayDate.getTime()) {
            // Only update if it's today's data
            try {
              await prisma.daily_player_analytics.update({
                where: {
                  date_playerId: {
                    date: today,
                    playerId: player.id
                  }
                },
                data: {
                  matchDayTag: player.matchDayTag || null
                }
              })
              console.log(`✅ Updated matchDayTag in analytics for player ${player.id} for today: ${player.matchDayTag || 'N/A'}`)
            } catch (updateError: any) {
              // If matchDayTag column doesn't exist, try to create analytics entry with it
              if (updateError.message?.includes('matchDayTag') || updateError.code === 'P2021') {
                console.warn('⚠️ matchDayTag column may not exist, skipping update')
              } else {
                throw updateError
              }
            }
          } else {
            console.log(`⚠️ Cannot update matchDayTag for ${analyticsDate.toISOString().split('T')[0]} - historical data is immutable`)
          }
        } else {
          // Create new analytics entry for today with matchDayTag
          // Get player's current status for the analytics entry
          const playerFull = await prisma.players.findUnique({
            where: { id: player.id },
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
          const statusLabel = statusMap[playerFull?.status || playerFull?.availabilityStatus || ''] || 'Fully Available'
          
          await prisma.daily_player_analytics.create({
            data: {
              date: today,
              playerId: player.id,
              status: statusLabel,
              matchDayTag: player.matchDayTag || null,
              notes: null
            }
          })
          console.log(`✅ Created analytics with matchDayTag for player ${player.id} for today`)
        }
      }
    } catch (analyticsError) {
      console.error('Error saving matchDayTag to analytics:', analyticsError)
      // Don't fail the matchDayTag update if analytics save fails
    }

    return NextResponse.json({ 
      message: 'Match day tags updated successfully', 
      updatedCount: updatedPlayers.count 
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating match day tags:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, matchDayTag } = body;

    if (LOCAL_DEV_MODE) {
      if (!playerId) {
        return NextResponse.json({ message: 'Player ID is required' }, { status: 400 });
      }
      await setMatchDayTag(playerId, matchDayTag === '' ? null : matchDayTag)
      return NextResponse.json({
        message: 'Match day tag updated successfully (local mode)',
        player: {
          id: playerId,
          name: 'Local Player',
          matchDayTag: matchDayTag === '' ? null : matchDayTag
        }
      }, { status: 200 });
    }

    if (!playerId) {
      return NextResponse.json({ message: 'Player ID is required' }, { status: 400 });
    }

    // Update match day tag for single player
    const updatedPlayer = await prisma.players.update({
      where: { id: playerId },
      data: { matchDayTag: matchDayTag === '' ? null : matchDayTag }
    });

    console.log(`✅ Updated match day tag for player ${updatedPlayer.name}`);

    // Automatically save matchDayTag to daily analytics for today when it changes
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    try {
      // Check if analytics already exists for today
      const existingAnalytics = await prisma.daily_player_analytics.findUnique({
        where: {
          date_playerId: {
            date: today,
            playerId: playerId
          }
        }
      })

      if (existingAnalytics) {
        // Update matchDayTag if analytics already exists (today's data can still be updated)
        // CRITICAL: Only update if it's today - historical data is immutable
        const analyticsDate = new Date(existingAnalytics.date)
        analyticsDate.setHours(0, 0, 0, 0)
        const todayDate = new Date(today)
        todayDate.setHours(0, 0, 0, 0)
        
        if (analyticsDate.getTime() === todayDate.getTime()) {
          // Only update if it's today's data
          try {
            await prisma.daily_player_analytics.update({
              where: {
                date_playerId: {
                  date: today,
                  playerId: playerId
                }
              },
              data: {
                matchDayTag: updatedPlayer.matchDayTag || null
              }
            })
            console.log(`✅ Updated matchDayTag in analytics for player ${playerId} for today: ${updatedPlayer.matchDayTag || 'N/A'}`)
          } catch (updateError: any) {
            // If matchDayTag column doesn't exist, try to create analytics entry with it
            if (updateError.message?.includes('matchDayTag') || updateError.code === 'P2021') {
              console.warn('⚠️ matchDayTag column may not exist, skipping update')
            } else {
              throw updateError
            }
          }
        } else {
          console.log(`⚠️ Cannot update matchDayTag for ${analyticsDate.toISOString().split('T')[0]} - historical data is immutable`)
        }
      } else {
        // Create new analytics entry for today with matchDayTag
        // Get player's current status for the analytics entry
        const playerFull = await prisma.players.findUnique({
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
        const statusLabel = statusMap[playerFull?.status || playerFull?.availabilityStatus || ''] || 'Fully Available'
        
        await prisma.daily_player_analytics.create({
          data: {
            date: today,
            playerId: playerId,
            status: statusLabel,
            matchDayTag: updatedPlayer.matchDayTag || null,
            notes: null
          }
        })
        console.log(`✅ Created analytics with matchDayTag for player ${playerId} for today`)
      }
    } catch (analyticsError) {
      console.error('Error saving matchDayTag to analytics:', analyticsError)
      // Don't fail the matchDayTag update if analytics save fails
    }

    return NextResponse.json({ 
      message: 'Match day tag updated successfully', 
      player: updatedPlayer 
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating match day tag:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
