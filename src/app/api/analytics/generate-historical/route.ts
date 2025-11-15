import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function POST(request: NextRequest) {
  try {
    if (!LOCAL_DEV_MODE) {
      return NextResponse.json(
        { message: 'This endpoint is only available in LOCAL_DEV_MODE' },
        { status: 400 }
      )
    }

    console.log('🔄 Generating historical analytics from dailyPlayerNotes...')

    const state = await readState()

    // Map status values to labels
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

    if (!state.dailyPlayerAnalytics) {
      state.dailyPlayerAnalytics = []
    }

    // Create a map of existing analytics by date and player
    const existingAnalyticsMap = new Map<string, any>()
    state.dailyPlayerAnalytics.forEach((a: any) => {
      const key = `${a.date}_${a.playerId}`
      existingAnalyticsMap.set(key, a)
    })

    let created = 0
    let updated = 0

    // Generate analytics from all dailyPlayerNotes
    state.dailyPlayerNotes.forEach((note: any) => {
      const dateStr = typeof note.date === 'string' && note.date.includes('T') 
        ? note.date.split('T')[0] 
        : typeof note.date === 'string' 
          ? note.date 
          : new Date(note.date).toISOString().split('T')[0]
      const key = `${dateStr}_${note.playerId}`
      const statusLabel = statusMap[note.status] || note.status || 'Unknown'

      if (existingAnalyticsMap.has(key)) {
        // Update existing analytics
        const existing = existingAnalyticsMap.get(key)
        const index = state.dailyPlayerAnalytics.findIndex((a: any) => a.id === existing.id)
        if (index !== -1) {
          state.dailyPlayerAnalytics[index] = {
            ...state.dailyPlayerAnalytics[index],
            activity: statusLabel,
            playerName: note.playerName,
            count: 1,
            updatedAt: new Date().toISOString()
          }
          updated++
        }
      } else {
        // Create new analytics entry
        const newAnalytics = {
          id: `daily-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: dateStr,
          playerId: note.playerId,
          playerName: note.playerName,
          activity: statusLabel,
          count: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        state.dailyPlayerAnalytics.push(newAnalytics)
        created++
      }
    })

    await writeState(state)

    console.log(`✅ Generated ${created} new analytics entries and updated ${updated} existing entries`)

    return NextResponse.json({
      message: 'Historical analytics generated successfully',
      created,
      updated,
      total: state.dailyPlayerAnalytics.length
    })

  } catch (error) {
    console.error('❌ Error generating historical analytics:', error)
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

