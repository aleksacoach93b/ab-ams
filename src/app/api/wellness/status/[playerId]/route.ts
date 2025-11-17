import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readState } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

async function getWellnessSettings() {
  if (LOCAL_DEV_MODE) {
    const state = await readState()
    return state.wellnessSettings || {
      csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
      surveyId: 'cmg6klyig0004l704u1kd78zb',
      baseUrl: 'https://wellness-monitor-tan.vercel.app'
    }
  }
  // Production mode - would use database
  return {
    csvUrl: 'https://wellness-monitor-tan.vercel.app/api/surveys/cmg6klyig0004l704u1kd78zb/export/csv',
    surveyId: 'cmg6klyig0004l704u1kd78zb',
    baseUrl: 'https://wellness-monitor-tan.vercel.app'
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params

    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Get player info - need name and email for matching
    let playerName: string
    let playerEmail: string | null = null
    
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      const player = state.players.find((p: any) => p.id === playerId)
      if (!player) {
        return NextResponse.json({ message: 'Player not found' }, { status: 404 })
      }
      playerName = player.name
      playerEmail = player.email || null
    } else {
      const player = await prisma.players.findUnique({
        where: { id: playerId },
        include: {
          users: {
            select: {
              email: true
            }
          }
        }
      })
      if (!player) {
        return NextResponse.json({ message: 'Player not found' }, { status: 404 })
      }
      // Construct name from firstName + lastName
      playerName = `${player.firstName} ${player.lastName}`.trim()
      playerEmail = player.users?.email || player.email || null
    }
    
    console.log(`🔍 [WELLNESS] Checking for player: ${playerName} (${playerEmail})`)

    try {
      // Get wellness settings (CSV URL)
      const wellnessSettings = await getWellnessSettings()
      const csvUrl = wellnessSettings.csvUrl
      
      console.log(`🔍 [WELLNESS] Fetching CSV from: ${csvUrl}`)
      
      // Fetch CSV data from external wellness app
      const response = await fetch(csvUrl)
      
      if (!response.ok) {
        console.error('Failed to fetch wellness CSV data:', response.status)
        // Fallback - if LOCAL_DEV_MODE, return false; otherwise check database
        if (LOCAL_DEV_MODE) {
          return NextResponse.json({ 
            completed: false,
            date: today,
            playerId: playerId,
            source: 'local_dev_fallback'
          })
        }
        // Fallback to local database check
        const wellnessCompletion = await prisma.wellnessCompletion.findUnique({
          where: {
            date_playerId: {
              date: today,
              playerId: playerId,
            },
          },
        })
        return NextResponse.json({ 
          completed: !!wellnessCompletion?.completed,
          date: today,
          playerId: playerId,
          source: 'local_fallback'
        })
      }

      const csvText = await response.text()
      const lines = csvText.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        return NextResponse.json({ 
          completed: false,
          date: today,
          playerId: playerId,
          source: 'csv_empty'
        })
      }

      // Parse CSV header - handle quoted strings properly
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''))
      const playerNameIndex = headers.findIndex(h => h === 'playerName' || h.toLowerCase() === 'playername')
      const playerEmailIndex = headers.findIndex(h => h === 'playerEmail' || h.toLowerCase() === 'playeremail')
      const submittedAtIndex = headers.findIndex(h => h === 'submittedAt' || h.toLowerCase() === 'submittedat')
      
      console.log(`🔍 [WELLNESS] CSV headers:`, headers)
      console.log(`🔍 [WELLNESS] Indices - name: ${playerNameIndex}, email: ${playerEmailIndex}, submittedAt: ${submittedAtIndex}`)
      
      if (submittedAtIndex === -1) {
        console.error('❌ CSV headers missing submittedAt', headers)
        return NextResponse.json({ 
          completed: false,
          date: today,
          playerId: playerId,
          source: 'csv_invalid',
          error: 'Missing submittedAt column'
        })
      }

      // Check if player has completed survey today
      let completedToday = false
      let matchedRow: any = null
      
      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i])
        if (row.length < headers.length) continue

        const rowPlayerName = playerNameIndex >= 0 ? row[playerNameIndex]?.replace(/^"|"$/g, '').trim() : null
        const rowPlayerEmail = playerEmailIndex >= 0 ? row[playerEmailIndex]?.replace(/^"|"$/g, '').trim() : null
        const submittedAt = row[submittedAtIndex]?.replace(/^"|"$/g, '').trim()

        if (!submittedAt) continue

        // Match by email first (more reliable), then by name
        let isMatch = false
        if (playerEmail && rowPlayerEmail) {
          isMatch = rowPlayerEmail.toLowerCase() === playerEmail.toLowerCase()
          if (isMatch) {
            console.log(`✅ [WELLNESS] Matched by email: ${rowPlayerEmail}`)
          }
        }
        
        // If no email match, try name match
        if (!isMatch && rowPlayerName && playerName) {
          isMatch = rowPlayerName.toLowerCase() === playerName.toLowerCase()
          if (isMatch) {
            console.log(`✅ [WELLNESS] Matched by name: ${rowPlayerName}`)
          }
        }

        if (isMatch) {
          // Parse date from submittedAt (format: "10/1/2025, 12:09:31 PM" or ISO format)
          try {
            let surveyDate: string
            
            // Try parsing as "MM/DD/YYYY, HH:MM:SS AM/PM" format
            if (submittedAt.includes(',')) {
              const datePart = submittedAt.split(',')[0].trim() // "10/1/2025"
              const [month, day, year] = datePart.split('/')
              surveyDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            } else {
              // Try parsing as ISO format
              const date = new Date(submittedAt)
              surveyDate = date.toISOString().split('T')[0]
            }
            
            console.log(`📅 [WELLNESS] Survey date: ${surveyDate}, Today: ${today}`)
            
            // Check if survey was completed today
            if (surveyDate === today) {
              completedToday = true
              matchedRow = { playerName: rowPlayerName, playerEmail: rowPlayerEmail, submittedAt, surveyDate }
              console.log(`✅ [WELLNESS] Player ${playerName} (${playerEmail}) completed wellness survey today (${surveyDate})`)
              break
            } else {
              console.log(`⚠️ [WELLNESS] Survey found but not for today. Survey date: ${surveyDate}, Today: ${today}`)
            }
          } catch (error) {
            console.error('❌ [WELLNESS] Error parsing date:', submittedAt, error)
            continue
          }
        }
      }
      
      if (!completedToday && matchedRow) {
        console.log(`⚠️ [WELLNESS] Player matched but survey not for today:`, matchedRow)
      } else if (!completedToday) {
        console.log(`❌ [WELLNESS] No matching survey found for player ${playerName} (${playerEmail}) today`)
      }

      return NextResponse.json({ 
        completed: completedToday,
        date: today,
        playerId: playerId,
        playerName: playerName,
        source: 'csv_live'
      })

    } catch (csvError) {
      console.error('Error fetching wellness CSV:', csvError)
      // Fallback - if LOCAL_DEV_MODE, return false; otherwise check database
      if (LOCAL_DEV_MODE) {
        return NextResponse.json({ 
          completed: false,
          date: today,
          playerId: playerId,
          source: 'local_dev_error_fallback'
        })
      }
      // Fallback to local database check
      const wellnessCompletion = await prisma.wellnessCompletion.findUnique({
        where: {
          date_playerId: {
            date: today,
            playerId: playerId,
          },
        },
      })
      return NextResponse.json({ 
        completed: !!wellnessCompletion?.completed,
        date: today,
        playerId: playerId,
        source: 'local_fallback'
      })
    }
  } catch (error) {
    console.error('Error checking wellness status:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params

    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Mark wellness survey as completed for today
    const wellnessCompletion = await prisma.wellnessCompletion.upsert({
      where: {
        date_playerId: {
          date: today,
          playerId: playerId,
        },
      },
      update: {
        completed: true,
        completedAt: new Date(),
      },
      create: {
        playerId: playerId,
        date: today,
        completed: true,
        completedAt: new Date(),
      },
    })

    return NextResponse.json(wellnessCompletion)
  } catch (error) {
    console.error('Error marking wellness as completed:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}