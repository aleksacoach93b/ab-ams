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

    console.log(`📊 Generating player analytics CSV for ${days} days (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`)

    // Get saved daily analytics data
    const dailyAnalytics = await prisma.dailyPlayerAnalytics.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: [
        { date: 'asc' },
        { playerName: 'asc' }
      ]
    })

    // Get daily player notes for the date range
    const dailyNotes = await prisma.dailyPlayerNotes.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: [
        { date: 'asc' },
        { playerName: 'asc' }
      ]
    })

    // Get live data for today (if not yet saved)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayAnalytics = await prisma.dailyPlayerAnalytics.findMany({
      where: {
        date: today
      }
    })

    // If no data for today, get live player data
    let liveTodayData: any[] = []
    if (todayAnalytics.length === 0) {
      const players = await prisma.player.findMany({
        select: {
          id: true,
          name: true,
          availabilityStatus: true,
          userId: true
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

      // Create availability status entries for today
      liveTodayData = players.map(player => ({
        date: today,
        playerId: player.id,
        playerName: player.name,
        activity: statusMap[player.availabilityStatus] || player.availabilityStatus || 'Unknown',
        count: 1,
        availabilityStatus: statusMap[player.availabilityStatus] || player.availabilityStatus || 'Unknown'
      }))
    }

    // Map status values to labels for saved data as well
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

    // Get all players to access their match day tags
    const allPlayers = await prisma.player.findMany({
      select: {
        id: true,
        name: true,
        matchDayTag: true
      }
    })

    // Create a map of players by ID for quick lookup
    const playersMap = new Map()
    allPlayers.forEach(player => {
      playersMap.set(player.id, player)
    })

    // Process saved data to use labels instead of values
    const processedDailyAnalytics = dailyAnalytics.map(item => ({
      ...item,
      activity: statusMap[item.activity] || item.activity
    }))

    // Create a map of notes by date and player
    const notesMap = new Map()
    dailyNotes.forEach(note => {
      const key = `${note.date.toISOString().split('T')[0]}_${note.playerId}`
      notesMap.set(key, {
        reason: note.reason || '',
        notes: note.notes || ''
      })
    })

    // Combine saved and live data
    const allData = [...processedDailyAnalytics, ...liveTodayData]

    // Generate CSV content
    let csvContent = 'Date,Player Name,Activity,Count,Availability Status,Match Day Tag,Reason,Notes\n'
    
    allData.forEach(item => {
      const dateStr = item.date.toISOString().split('T')[0]
      const availabilityStatus = item.activity || 'Unknown'
      const key = `${dateStr}_${item.playerId}`
      const noteData = notesMap.get(key) || { reason: '', notes: '' }
      const player = playersMap.get(item.playerId)
      const matchDayTag = player?.matchDayTag || 'N/A'
      
      csvContent += `${dateStr},"${item.playerName}",${availabilityStatus},${item.count},${availabilityStatus},"${matchDayTag}","${noteData.reason}","${noteData.notes}"\n`
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