import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Only admin and coach can sync wellness data
    if (decoded.role !== 'ADMIN' && decoded.role !== 'COACH') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    // Fetch CSV data from external wellness app
    const csvUrl = 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv'
    const response = await fetch(csvUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV data: ${response.status}`)
    }

    const csvText = await response.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json({ message: 'No data found in CSV' }, { status: 400 })
    }

    // Parse CSV header
    const headers = lines[0].split(',')
    const playerNameIndex = headers.findIndex(h => h === 'playerName')
    const submittedAtIndex = headers.findIndex(h => h === 'submittedAt')
    
    if (playerNameIndex === -1 || submittedAtIndex === -1) {
      return NextResponse.json({ message: 'Invalid CSV format' }, { status: 400 })
    }

    let syncedCount = 0
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',')
      if (row.length < headers.length) continue

      const playerName = row[playerNameIndex]?.replace(/"/g, '').trim()
      const submittedAt = row[submittedAtIndex]?.replace(/"/g, '').trim()

      if (!playerName || !submittedAt) continue

      // Parse date from submittedAt (format: "10/1/2025, 12:09:31 PM")
      let surveyDate: string
      try {
        const datePart = submittedAt.split(',')[0] // "10/1/2025"
        const [month, day, year] = datePart.split('/')
        surveyDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      } catch (error) {
        console.error('Error parsing date:', submittedAt, error)
        continue
      }

      // Find player by name
      const player = await prisma.players.findFirst({
        where: {
          name: {
            contains: playerName
          }
        }
      })

      if (!player) {
        console.log(`Player not found: ${playerName}`)
        continue
      }

      // Mark wellness as completed for this date
      await prisma.wellnessCompletion.upsert({
        where: {
          date_playerId: {
            date: surveyDate,
            playerId: player.id,
          },
        },
        update: {
          completed: true,
          completedAt: new Date(submittedAt),
        },
        create: {
          playerId: player.id,
          date: surveyDate,
          completed: true,
          completedAt: new Date(submittedAt),
        },
      })

      syncedCount++
    }

    return NextResponse.json({
      message: 'Wellness data synced successfully',
      syncedCount,
      totalRows: lines.length - 1,
      date: today
    })

  } catch (error) {
    console.error('Error syncing wellness data:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
