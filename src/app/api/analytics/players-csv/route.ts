import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET(request: NextRequest) {
  try {
    // Get all historical data - no date limit
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999) // End of today
    // Start date will be determined from the earliest note/analytics data

    console.log(`📊 Generating player analytics CSV for ALL historical data (up to ${endDate.toISOString().split('T')[0]})`)

    // Local dev mode: use localDevStore
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Get ALL saved daily analytics data from localDevStore (no date limit) - PRIMARY DATA SOURCE
      const savedAnalytics = (state.dailyPlayerAnalytics || []).sort((a: any, b: any) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
        if (dateDiff !== 0) return dateDiff
        return (a.playerName || '').localeCompare(b.playerName || '')
      })

      // Get ALL daily player notes (no date limit) - for reason and notes only
      const dailyNotes = (state.dailyPlayerNotes || []).sort((a: any, b: any) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
        if (dateDiff !== 0) return dateDiff
        return (a.playerName || '').localeCompare(b.playerName || '')
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

      // Get all players to access their match day tags and current status
      const playersMap = new Map()
      state.players.forEach((player: any) => {
        playersMap.set(player.id, player)
      })

      // Find the earliest date from analytics (PRIMARY SOURCE)
      const allDates = savedAnalytics.map((a: any) => new Date(a.date))
      const earliestDate = allDates.length > 0 
        ? new Date(Math.min(...allDates.map(d => d.getTime())))
        : new Date() // If no data, start from today
      earliestDate.setHours(0, 0, 0, 0)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Create a map of analytics by date and player (PRIMARY DATA SOURCE)
      const analyticsMap = new Map<string, { activity: string; date: Date }>()
      savedAnalytics.forEach((analytics: any) => {
        const key = `${new Date(analytics.date).toISOString().split('T')[0]}_${analytics.playerId}`
        analyticsMap.set(key, {
          activity: analytics.activity || 'Unknown',
          date: new Date(analytics.date)
        })
      })

      // Create a map of notes by date and player (for reason and notes only)
      const notesMap = new Map<string, { reason: string; notes: string | null }>()
      dailyNotes.forEach((note: any) => {
        const key = `${new Date(note.date).toISOString().split('T')[0]}_${note.playerId}`
        const isFullyAvailable = note.status === 'FULLY_AVAILABLE' || note.status === 'Fully Available'
        notesMap.set(key, {
          reason: isFullyAvailable ? '' : (note.reason || ''),
          notes: isFullyAvailable ? null : (note.notes || null)
        })
      })

      // Generate data for all days from earliest date to today
      // For each player, use forward fill: if no analytics for a day, use the last known status
      const allData: any[] = []
      const playerLastStatus = new Map<string, { status: string; date: Date }>()

      // First, process all analytics to build player status history
      savedAnalytics.forEach((analytics: any) => {
        const analyticsDate = new Date(analytics.date)
        analyticsDate.setHours(0, 0, 0, 0)
        const playerId = analytics.playerId
        const statusLabel = analytics.activity || 'Unknown'
        
        // Update last known status for this player
        const lastStatus = playerLastStatus.get(playerId)
        if (!lastStatus || analyticsDate >= lastStatus.date) {
          playerLastStatus.set(playerId, {
            status: statusLabel,
            date: analyticsDate
          })
        }
      })

      // For each player, generate data for all days from earliest date to today
      playersMap.forEach((player: any, playerId: string) => {
        const currentStatus = statusMap[player.status] || statusMap[player.availabilityStatus] || player.status || player.availabilityStatus || 'Fully Available'
        
        // Start from earliest date or player's first analytics date
        let startDate = earliestDate
        const playerAnalytics = savedAnalytics.filter((a: any) => a.playerId === playerId)
        if (playerAnalytics.length > 0) {
          const firstAnalyticsDate = new Date(Math.min(...playerAnalytics.map((a: any) => new Date(a.date).getTime())))
          firstAnalyticsDate.setHours(0, 0, 0, 0)
          startDate = firstAnalyticsDate < earliestDate ? firstAnalyticsDate : earliestDate
        }

        // Generate data for each day
        // Start with current status, but update it as we encounter analytics
        let lastKnownStatus = currentStatus // Default to current status
        let lastKnownReason = '' // Track last known reason for forward fill
        let lastKnownNotes: string | null = null // Track last known notes for forward fill
        
        // If player has no analytics, use current status for all days
        // If player has analytics, start from the first analytics status
        if (playerAnalytics.length > 0) {
          const sortedPlayerAnalytics = playerAnalytics.sort((a: any, b: any) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime()
          })
          const firstAnalytics = sortedPlayerAnalytics[0]
          lastKnownStatus = firstAnalytics.activity || 'Fully Available'
        }
        
        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          const key = `${dateStr}_${playerId}`
          
          // Check if we have analytics for this day (PRIMARY SOURCE)
          const analytics = analyticsMap.get(key)
          const note = notesMap.get(key)
          const isFullyAvailable = lastKnownStatus === 'Fully Available'
          
          if (analytics) {
            // Use status from analytics and update lastKnownStatus
            lastKnownStatus = analytics.activity || 'Unknown'
            
            // Get reason and notes from notes if available, otherwise use last known
            if (note) {
              // If note exists for this day, use it and update lastKnownReason/Notes
              lastKnownReason = isFullyAvailable ? '' : (note.reason || '')
              lastKnownNotes = isFullyAvailable ? null : (note.notes || null)
            }
            // Otherwise keep lastKnownReason and lastKnownNotes (forward fill)
            
            allData.push({
              date: new Date(d),
              playerId,
              playerName: player.name,
              activity: lastKnownStatus,
              availabilityStatus: lastKnownStatus,
              reason: lastKnownReason,
              notes: lastKnownNotes
            })
          } else {
            // No analytics for this day - use last known status, reason, and notes (forward fill)
            // Check if there's a note for this day, if yes use it, otherwise forward fill
            if (note) {
              // If note exists for this day, use it and update lastKnownReason/Notes
              lastKnownReason = isFullyAvailable ? '' : (note.reason || '')
              lastKnownNotes = isFullyAvailable ? null : (note.notes || null)
            }
            // Otherwise use lastKnownReason and lastKnownNotes (forward fill)
            
            allData.push({
              date: new Date(d),
              playerId,
              playerName: player.name,
              activity: lastKnownStatus,
              availabilityStatus: lastKnownStatus,
              reason: lastKnownReason,
              notes: lastKnownNotes
            })
          }
        }
      })

      // Sort by date and player name
      allData.sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime()
        if (dateDiff !== 0) return dateDiff
        return (a.playerName || '').localeCompare(b.playerName || '')
      })

      // Generate CSV content
      let csvContent = 'Date,Player Name,Availability Status,Match Day Tag,Reason,Notes\n'
      
      allData.forEach(item => {
        const dateStr = item.date instanceof Date ? item.date.toISOString().split('T')[0] : new Date(item.date).toISOString().split('T')[0]
        const availabilityStatus = item.activity || 'Unknown'
        
        // Check if status is FULLY_AVAILABLE
        const isFullyAvailable = availabilityStatus === 'Fully Available'
        
        // If FULLY_AVAILABLE, always use empty reason and notes
        const reason = isFullyAvailable ? '' : (item.reason || '')
        const notes = isFullyAvailable ? '' : (item.notes || '')
        
        const player = playersMap.get(item.playerId)
        const matchDayTag = player?.matchDayTag || state.playerTags?.[item.playerId] || 'N/A'
        
        csvContent += `${dateStr},"${item.playerName}",${availabilityStatus},"${matchDayTag}","${reason}","${notes}"\n`
      })

      console.log(`📊 [LOCAL_DEV] Generated player CSV with ${allData.length} records`)

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="player-analytics-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Database mode: use Prisma
    // Get ALL daily player analytics (no date limit) - PRIMARY DATA SOURCE
    const savedAnalytics = await prisma.daily_player_analytics.findMany({
      orderBy: [
        { date: 'asc' },
        { playerId: 'asc' }
      ]
    })

    // Get ALL player availability records (no date limit) - SECONDARY DATA SOURCE for historical data
    const playerAvailability = await prisma.player_availability.findMany({
      orderBy: [
        { date: 'asc' },
        { playerId: 'asc' }
      ]
    })

    // Get ALL daily player notes (no date limit) - for reason and notes only
    const dailyNotes = await prisma.daily_player_notes.findMany({
      orderBy: [
        { date: 'asc' },
        { playerId: 'asc' }
      ]
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

    // Get all players to access their match day tags and current status
    const allPlayers = await prisma.players.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matchDayTag: true,
        status: true
      }
    })

    // Create a map of players by ID for quick lookup
    const playersMap = new Map()
    allPlayers.forEach(player => {
      playersMap.set(player.id, {
        ...player,
        name: `${player.firstName} ${player.lastName}`.trim(),
        availabilityStatus: player.status
      })
    })

    // Find the earliest date from analytics OR player_availability (use whichever is earlier)
    // If no data, default to 1 year ago (like Events CSV does)
    const analyticsDates = savedAnalytics.map(analytics => analytics.date)
    const availabilityDates = playerAvailability.map(av => av.date)
    const allHistoricalDates = [...analyticsDates, ...availabilityDates]
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let earliestDate: Date
    if (allHistoricalDates.length > 0) {
      earliestDate = new Date(Math.min(...allHistoricalDates.map(d => d.getTime())))
    } else {
      // If no data, default to yesterday (at minimum) to ensure we have at least 2 days of data
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      earliestDate = yesterday
    }
    earliestDate.setHours(0, 0, 0, 0)
    
    // Ensure we always have at least yesterday and today
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (earliestDate > yesterday) {
      earliestDate = yesterday
      earliestDate.setHours(0, 0, 0, 0)
    }
    
    console.log(`📊 Earliest date found: ${earliestDate.toISOString().split('T')[0]}, Today: ${today.toISOString().split('T')[0]}`)
    console.log(`📊 Total days to generate: ${Math.ceil((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1}`)
    console.log(`📊 Found ${savedAnalytics.length} saved analytics and ${playerAvailability.length} player availability records`)

    // Create a map of analytics by date and player (PRIMARY DATA SOURCE - from daily_player_analytics)
    const analyticsMap = new Map<string, { status: string; date: Date }>()
    savedAnalytics.forEach(analytics => {
      const key = `${analytics.date.toISOString().split('T')[0]}_${analytics.playerId}`
      analyticsMap.set(key, {
        status: analytics.status || 'Unknown',
        date: analytics.date
      })
    })

    // Also add player_availability data to analyticsMap (if not already present in daily_player_analytics)
    playerAvailability.forEach(av => {
      const key = `${av.date.toISOString().split('T')[0]}_${av.playerId}`
      // Only add if not already in analyticsMap (daily_player_analytics takes priority)
      if (!analyticsMap.has(key)) {
        const statusLabel = statusMap[av.status] || av.status || 'Unknown'
        analyticsMap.set(key, {
          status: statusLabel,
          date: av.date
        })
      }
    })

    // Create a map of notes by date and player (for reason and notes only)
    const notesMap = new Map<string, { reason: string; notes: string | null }>()
    dailyNotes.forEach(note => {
      const key = `${note.date.toISOString().split('T')[0]}_${note.playerId}`
      notesMap.set(key, {
        reason: note.reason || '',
        notes: note.notes || null
      })
    })

    // Generate data for all days from earliest date to today
    // For each player, use forward fill: if no analytics for a day, use the last known status
    const allData: any[] = []
    const playerLastStatus = new Map<string, { status: string; date: Date }>()

    // First, process all analytics to build player status history (from both sources)
    savedAnalytics.forEach(analytics => {
      const analyticsDate = analytics.date
      analyticsDate.setHours(0, 0, 0, 0)
      const playerId = analytics.playerId
      const statusLabel = statusMap[analytics.status] || analytics.status || 'Unknown'
      
      // Update last known status for this player
      const lastStatus = playerLastStatus.get(playerId)
      if (!lastStatus || analyticsDate >= lastStatus.date) {
        playerLastStatus.set(playerId, {
          status: statusLabel,
          date: analyticsDate
        })
      }
    })

    // Also process player_availability data
    playerAvailability.forEach(av => {
      const avDate = av.date
      avDate.setHours(0, 0, 0, 0)
      const playerId = av.playerId
      const statusLabel = statusMap[av.status] || av.status || 'Unknown'
      
      // Update last known status for this player (only if this date is later or equal)
      const lastStatus = playerLastStatus.get(playerId)
      if (!lastStatus || avDate >= lastStatus.date) {
        playerLastStatus.set(playerId, {
          status: statusLabel,
          date: avDate
        })
      }
    })

    // For each player, generate data for all days from earliest date to today
    allPlayers.forEach(player => {
      const playerId = player.id
      const playerData = playersMap.get(playerId)
      const currentStatus = statusMap[playerData?.availabilityStatus || player.status] || playerData?.availabilityStatus || player.status || 'Fully Available'
      
      // Start from earliest date or player's first analytics/availability date
      let startDate = earliestDate
      const playerAnalytics = savedAnalytics.filter(a => a.playerId === playerId)
      const playerAvailabilityData = playerAvailability.filter(a => a.playerId === playerId)
      
      // Find earliest date from both sources
      const allPlayerDates = [
        ...playerAnalytics.map(a => a.date.getTime()),
        ...playerAvailabilityData.map(a => a.date.getTime())
      ]
      
      if (allPlayerDates.length > 0) {
        const firstPlayerDate = new Date(Math.min(...allPlayerDates))
        firstPlayerDate.setHours(0, 0, 0, 0)
        startDate = firstPlayerDate < earliestDate ? firstPlayerDate : earliestDate
      }

      // Generate data for each day
      // IMPORTANT: Start with NULL status - we'll only use actual historical data, not current status
      // This ensures we use real historical data, not current status which might have changed
      let lastKnownStatus: string | null = null // Start with null - will be set from first analytics
      let lastKnownReason = '' // Track last known reason for forward fill
      let lastKnownNotes: string | null = null // Track last known notes for forward fill
      
      // If player has analytics/availability, start from the first status
      // If no analytics/availability, we'll use current status only as last resort
      if (allPlayerDates.length > 0) {
        // Find first status from either source
        const allPlayerData = [
          ...playerAnalytics.map(a => ({ date: a.date, status: a.status })),
          ...playerAvailabilityData.map(a => ({ date: a.date, status: a.status }))
        ]
        const sortedPlayerData = allPlayerData.sort((a, b) => {
          return a.date.getTime() - b.date.getTime()
        })
        const firstData = sortedPlayerData[0]
        lastKnownStatus = statusMap[firstData.status] || firstData.status || 'Fully Available'
      } else {
        // No historical data - use current status as fallback
        lastKnownStatus = currentStatus
      }
      
      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        const key = `${dateStr}_${playerId}`
        
        // Check if we have analytics for this day (PRIMARY SOURCE)
        const analytics = analyticsMap.get(key)
        const note = notesMap.get(key)
        const isFullyAvailable = lastKnownStatus === 'Fully Available'
        
        if (analytics) {
          // Use status from analytics and update lastKnownStatus
          const statusLabel = statusMap[analytics.status] || analytics.status || 'Unknown'
          lastKnownStatus = statusLabel
          const isFullyAvailableNow = lastKnownStatus === 'Fully Available'
          
          // Get reason and notes from notes if available, otherwise use last known (forward fill)
          if (note) {
            // If note exists for this day, use it and update lastKnownReason/Notes
            lastKnownReason = isFullyAvailableNow ? '' : (note.reason || '')
            lastKnownNotes = isFullyAvailableNow ? null : (note.notes || null)
          }
          // If no note for this day, keep lastKnownReason and lastKnownNotes (forward fill)
          // Only clear if status changed to Fully Available
          if (isFullyAvailableNow && !note) {
            lastKnownReason = ''
            lastKnownNotes = null
          }
          
          allData.push({
            date: new Date(d),
            playerId,
            playerName: playerData?.name || `${player.firstName} ${player.lastName}`.trim(),
            activity: lastKnownStatus,
            availabilityStatus: lastKnownStatus,
            reason: lastKnownReason,
            notes: lastKnownNotes
          })
        } else {
          // No analytics for this day - use last known status, reason, and notes (forward fill)
          // Check if there's a note for this day, if yes use it, otherwise forward fill
          const isFullyAvailableNow = lastKnownStatus === 'Fully Available'
          
          if (note) {
            // If note exists for this day, use it and update lastKnownReason/Notes
            lastKnownReason = isFullyAvailableNow ? '' : (note.reason || '')
            lastKnownNotes = isFullyAvailableNow ? null : (note.notes || null)
          }
          // Otherwise use lastKnownReason and lastKnownNotes (forward fill)
          
          // Only use lastKnownStatus if it's not null (we have historical data)
          // If null, skip this day (shouldn't happen if we have data)
          if (lastKnownStatus !== null) {
            allData.push({
              date: new Date(d),
              playerId,
              playerName: playerData?.name || `${player.firstName} ${player.lastName}`.trim(),
              activity: lastKnownStatus,
              availabilityStatus: lastKnownStatus,
              reason: lastKnownReason,
              notes: lastKnownNotes
            })
          }
        }
      }
    })

    // Sort by date and player name
    allData.sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime()
      if (dateDiff !== 0) return dateDiff
      return (a.playerName || '').localeCompare(b.playerName || '')
    })

    // Generate CSV content
    let csvContent = 'Date,Player Name,Availability Status,Match Day Tag,Reason,Notes\n'
    
    allData.forEach(item => {
      const dateStr = item.date instanceof Date ? item.date.toISOString().split('T')[0] : new Date(item.date).toISOString().split('T')[0]
      const availabilityStatus = item.activity || 'Unknown'
      
      // Check if status is FULLY_AVAILABLE
      const isFullyAvailable = availabilityStatus === 'Fully Available'
      
      // If FULLY_AVAILABLE, always use empty reason and notes
      const reason = isFullyAvailable ? '' : (item.reason || '')
      const notes = isFullyAvailable ? '' : (item.notes || '')
      
      const player = playersMap.get(item.playerId)
      const matchDayTag = player?.matchDayTag || 'N/A'
      
      csvContent += `${dateStr},"${item.playerName}",${availabilityStatus},"${matchDayTag}","${reason}","${notes}"\n`
    })

    console.log(`📊 Generated player CSV with ${allData.length} records`)

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="player-analytics-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Error generating player analytics CSV:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}