import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export const runtime = 'nodejs'
export const maxDuration = 60 // Increase timeout to 60 seconds for large datasets

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
      const analyticsMap = new Map<string, { activity: string; matchDayTag: string | null; date: Date }>()
      savedAnalytics.forEach((analytics: any) => {
        const key = `${new Date(analytics.date).toISOString().split('T')[0]}_${analytics.playerId}`
        analyticsMap.set(key, {
          activity: analytics.activity || 'Unknown',
          matchDayTag: analytics.matchDayTag || null,
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
        let lastKnownMatchDayTag: string | null = player.matchDayTag || state.playerTags?.[playerId] || null // Track last known matchDayTag for forward fill
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
          // Initialize matchDayTag from first analytics if available
          if (firstAnalytics.matchDayTag !== null && firstAnalytics.matchDayTag !== undefined) {
            lastKnownMatchDayTag = firstAnalytics.matchDayTag
          }
        }
        
        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          const key = `${dateStr}_${playerId}`
          
          // Check if we have analytics for this day (PRIMARY SOURCE)
          const analytics = analyticsMap.get(key)
          const note = notesMap.get(key)
          const isFullyAvailable = lastKnownStatus === 'Fully Available'
          
          let matchDayTagForThisDay: string | null = null
          
          if (analytics) {
            // Use status from analytics and update lastKnownStatus
            lastKnownStatus = analytics.activity || 'Unknown'
            
            // Use matchDayTag from analytics if available, otherwise forward fill
            if (analytics.matchDayTag !== null && analytics.matchDayTag !== undefined) {
              matchDayTagForThisDay = analytics.matchDayTag
              lastKnownMatchDayTag = analytics.matchDayTag // Update for forward fill
            } else {
              matchDayTagForThisDay = lastKnownMatchDayTag // Forward fill
            }
            
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
              matchDayTag: matchDayTagForThisDay,
              reason: lastKnownReason,
              notes: lastKnownNotes
            })
          } else {
            // No analytics for this day - use last known status, reason, and notes (forward fill)
            matchDayTagForThisDay = lastKnownMatchDayTag // Forward fill matchDayTag
            
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
              matchDayTag: matchDayTagForThisDay,
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
        
        // Use historical matchDayTag from analytics data (with forward fill), not current player.matchDayTag
        const matchDayTag = item.matchDayTag || 'N/A'
        
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
    // Use select to explicitly get only fields that exist
    const savedAnalytics = await prisma.daily_player_analytics.findMany({
      orderBy: [
        { date: 'asc' },
        { playerId: 'asc' }
      ],
      select: {
        id: true,
        playerId: true,
        date: true,
        status: true,
        notes: true,
        createdAt: true
        // matchDayTag will be added via raw query if column exists, or we'll use null
      }
    })
    
    // Try to get matchDayTag separately if column exists
    let matchDayTagMap = new Map<string, string | null>()
    try {
      // Try to get matchDayTag using raw query
      // Use COALESCE to handle NULL values properly
      const analyticsWithMatchDayTag = await prisma.$queryRaw<Array<{ playerId: string; date: Date; matchDayTag: string | null }>>`
        SELECT "playerId", "date", COALESCE("matchDayTag", NULL) as "matchDayTag"
        FROM "daily_player_analytics"
        ORDER BY "date" ASC, "playerId" ASC
      `
      analyticsWithMatchDayTag.forEach(item => {
        const dateStr = new Date(item.date).toISOString().split('T')[0]
        const key = `${dateStr}_${item.playerId}`
        matchDayTagMap.set(key, item.matchDayTag || null)
      })
      console.log(`📊 Found matchDayTag for ${matchDayTagMap.size} analytics records`)
    } catch (matchDayTagError: any) {
      // Column doesn't exist, that's OK - we'll use null for all
      console.log('⚠️ matchDayTag column does not exist, using null for all records')
      console.log('⚠️ Error details:', matchDayTagError.message)
    }

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
    
    // Debug: Log sample analytics data
    if (savedAnalytics.length > 0) {
      const sampleAnalytics = savedAnalytics.slice(0, 5)
      console.log(`📊 Sample analytics data:`, sampleAnalytics.map(a => ({
        date: a.date.toISOString().split('T')[0],
        playerId: a.playerId,
        status: a.status
      })))
    }

    // Create a map of analytics by date and player (PRIMARY DATA SOURCE - from daily_player_analytics)
    const analyticsMap = new Map<string, { status: string; matchDayTag: string | null; date: Date }>()
    savedAnalytics.forEach(analytics => {
      const dateStr = analytics.date.toISOString().split('T')[0]
      const key = `${dateStr}_${analytics.playerId}`
      // Get matchDayTag from separate map if available
      const matchDayTag = matchDayTagMap.get(key) || null
      analyticsMap.set(key, {
        status: analytics.status || 'Unknown',
        matchDayTag: matchDayTag,
        date: analytics.date
      })
    })
    console.log(`📊 Created analyticsMap with ${analyticsMap.size} entries from daily_player_analytics`)

    // Also add player_availability data to analyticsMap (if not already present in daily_player_analytics)
    let addedFromAvailability = 0
    playerAvailability.forEach(av => {
      const dateStr = av.date.toISOString().split('T')[0]
      const key = `${dateStr}_${av.playerId}`
      // Only add if not already in analyticsMap (daily_player_analytics takes priority)
      if (!analyticsMap.has(key)) {
        // player_availability uses PlayerStatus enum, convert to string
        const statusValue = typeof av.status === 'string' ? av.status : String(av.status)
        // Store the raw status from database (matchDayTag will be null for player_availability entries)
        analyticsMap.set(key, {
          status: statusValue || 'Unknown',
          matchDayTag: null, // player_availability doesn't have matchDayTag
          date: av.date
        })
        addedFromAvailability++
      }
    })
    console.log(`📊 Added ${addedFromAvailability} entries from player_availability to analyticsMap`)

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
      
      // ALWAYS start from earliestDate to ensure ALL days are generated for ALL players
      const startDate = earliestDate
      const playerAnalytics = savedAnalytics.filter(a => a.playerId === playerId)
      const playerAvailabilityData = playerAvailability.filter(a => a.playerId === playerId)
      
      // Find earliest date from both sources (for reference only, not for startDate)
      const allPlayerDates = [
        ...playerAnalytics.map(a => a.date.getTime()),
        ...playerAvailabilityData.map(a => a.date.getTime())
      ]

      // Generate data for each day
      // CRITICAL: We MUST iterate through days chronologically and use ONLY saved data for each day
      // Forward fill means: if no data for a day, use the LAST KNOWN status from PREVIOUS days
      // We NEVER use current status to fill historical days - only historical data can fill forward
      // BUT: If player has NO historical data at all, we initialize with current status for forward fill
      // This ensures ALL players and ALL days are always shown
      let lastKnownStatus: string | null = null // Will be set from first historical data we encounter
      let lastKnownMatchDayTag: string | null = null // Track last known matchDayTag for forward fill
      let lastKnownReason = '' // Track last known reason for forward fill
      let lastKnownNotes: string | null = null // Track last known notes for forward fill
      
      // If player has NO historical data at all, initialize with current status and matchDayTag for forward fill
      // This is ONLY used for forward fill, NOT for changing historical data (since there is none)
      if (allPlayerDates.length === 0) {
        const currentStatus = statusMap[playerData?.availabilityStatus || player.status] || playerData?.availabilityStatus || player.status || 'Fully Available'
        lastKnownStatus = currentStatus
        lastKnownMatchDayTag = playerData?.matchDayTag || player.matchDayTag || null
      }
      
      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        const key = `${dateStr}_${playerId}`
        
        // Check if this is today (use live data for today)
        const isToday = d.getTime() === today.getTime()
        
        // Check if we have analytics for this SPECIFIC day (PRIMARY SOURCE)
        const analytics = analyticsMap.get(key)
        const note = notesMap.get(key)
        
        let statusForThisDay: string | null = null
        let matchDayTagForThisDay: string | null = null
        let reasonForThisDay = ''
        let notesForThisDay: string | null = null
        
        if (analytics) {
          // We have saved data for this day - use it (this is immutable historical data)
          statusForThisDay = statusMap[analytics.status] || analytics.status || 'Unknown'
          
          // CRITICAL: For today, use LIVE matchDayTag from players table, not saved analytics
          // For historical days, use saved matchDayTag from analytics
          if (isToday) {
            // Today: Use LIVE data from players table
            matchDayTagForThisDay = playerData?.matchDayTag || player.matchDayTag || null
            console.log(`📊 [TODAY] Using LIVE matchDayTag for player ${playerId}: ${matchDayTagForThisDay || 'N/A'}`)
          } else {
            // Historical day: Use saved matchDayTag from analytics (immutable)
            if (analytics.matchDayTag !== null && analytics.matchDayTag !== undefined) {
              matchDayTagForThisDay = analytics.matchDayTag
              lastKnownMatchDayTag = analytics.matchDayTag // Update for forward fill
            } else {
              // No matchDayTag in analytics for this day - forward fill from previous days
              matchDayTagForThisDay = lastKnownMatchDayTag
            }
          }
          
          // Update lastKnownStatus for forward fill (for future days)
          lastKnownStatus = statusForThisDay
          
          // Get reason and notes for this day
          if (note) {
            // Note exists for this day - use it
            const isFullyAvailable = statusForThisDay === 'Fully Available'
            reasonForThisDay = isFullyAvailable ? '' : (note.reason || '')
            notesForThisDay = isFullyAvailable ? null : (note.notes || null)
            
            // Update lastKnownReason/Notes for forward fill (for future days)
            lastKnownReason = reasonForThisDay
            lastKnownNotes = notesForThisDay
          } else {
            // No note for this day - forward fill from previous days
            if (statusForThisDay === 'Fully Available') {
              // If status is Fully Available, clear reason and notes
              reasonForThisDay = ''
              notesForThisDay = null
              lastKnownReason = ''
              lastKnownNotes = null
            } else {
              // Forward fill reason and notes from previous days
              reasonForThisDay = lastKnownReason
              notesForThisDay = lastKnownNotes
            }
          }
        } else {
          // No saved data for this day - forward fill from previous days
          // Use forward fill if we have lastKnownStatus (either from historical data or initialized)
          if (lastKnownStatus !== null) {
            statusForThisDay = lastKnownStatus
            
            // CRITICAL: For today, use LIVE matchDayTag from players table
            // For historical days, forward fill from previous days
            if (isToday) {
              // Today: Use LIVE data from players table
              matchDayTagForThisDay = playerData?.matchDayTag || player.matchDayTag || null
              console.log(`📊 [TODAY] Using LIVE matchDayTag for player ${playerId} (no analytics): ${matchDayTagForThisDay || 'N/A'}`)
            } else {
              // Historical day: Forward fill from previous days
              matchDayTagForThisDay = lastKnownMatchDayTag
            }
            
            // Check if there's a note for this day (even without analytics)
            if (note) {
              const isFullyAvailable = statusForThisDay === 'Fully Available'
              reasonForThisDay = isFullyAvailable ? '' : (note.reason || '')
              notesForThisDay = isFullyAvailable ? null : (note.notes || null)
              
              // Update lastKnownReason/Notes for forward fill
              lastKnownReason = reasonForThisDay
              lastKnownNotes = notesForThisDay
            } else {
              // Forward fill reason and notes from previous days
              if (statusForThisDay === 'Fully Available') {
                reasonForThisDay = ''
                notesForThisDay = null
                lastKnownReason = ''
                lastKnownNotes = null
              } else {
                reasonForThisDay = lastKnownReason
                notesForThisDay = lastKnownNotes
              }
            }
          } else {
            // This should never happen now, but fallback to Fully Available
            statusForThisDay = 'Fully Available'
            // For today, always use live data; for historical, use null
            matchDayTagForThisDay = isToday 
              ? (playerData?.matchDayTag || player.matchDayTag || null)
              : (lastKnownMatchDayTag || null)
            reasonForThisDay = ''
            notesForThisDay = null
          }
        }
        
        // ALWAYS add data for this day - we never skip days
        allData.push({
          date: new Date(d),
          playerId,
          playerName: playerData?.name || `${player.firstName} ${player.lastName}`.trim(),
          activity: statusForThisDay || 'Fully Available',
          availabilityStatus: statusForThisDay || 'Fully Available',
          matchDayTag: matchDayTagForThisDay,
          reason: reasonForThisDay,
          notes: notesForThisDay
        })
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
      
      // Use historical matchDayTag from analytics data (with forward fill), not current player.matchDayTag
      const matchDayTag = item.matchDayTag || 'N/A'
      
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
    console.error('❌ Error generating player analytics CSV:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    })
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}