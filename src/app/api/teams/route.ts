import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

// GET /api/teams - Get all teams
export async function GET() {
  try {
    console.log('🔍 Teams fetch request received')
    if (LOCAL_DEV_MODE) {
      return NextResponse.json([
        {
          id: 'team-sepsi',
          name: 'Sepsi OSK',
          logo: null,
          color: '#dc2626',
          description: 'Sepsi OSK Football Team',
          playerCount: 5,
          coachCount: 3,
          availablePlayers: 4,
          unavailablePlayers: 1,
          upcomingMatches: 1,
          wins: 0,
          losses: 0,
          draws: 0,
          players: [
            { id: 'local-player-1', firstName: 'Boris', lastName: 'Cmiljanic', status: 'FULLY_AVAILABLE' },
            { id: 'local-player-2', firstName: 'Mihajlo', lastName: 'Neskovic', status: 'FULLY_AVAILABLE' },
            { id: 'local-player-3', firstName: 'Marko', lastName: 'Markovic', status: 'PHYSIO_THERAPY' },
            { id: 'local-player-4', firstName: 'Tamas', lastName: 'Santa', status: 'FULLY_AVAILABLE' },
            { id: 'local-player-5', firstName: 'Dino', lastName: 'Skorup', status: 'FULLY_AVAILABLE' }
          ],
          coaches: [
            { coach: { id: 'staff-1', firstName: 'Sorin', lastName: 'Colceag' } },
            { coach: { id: 'staff-2', firstName: 'Ovidiu', lastName: 'Burca' } },
            { coach: { id: 'staff-3', firstName: 'Nikola', lastName: 'Stankovic' } }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ])
    }
    
    // Prisma handles connection pooling automatically
    const teams = await prisma.teams.findMany({
      include: {
        players: {
          select: {
            id: true,
            name: true,
            status: true,
            availabilityStatus: true
          }
        },
        staff: {
          select: {
            id: true,
            name: true,
            position: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to match the expected format
    const transformedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      logo: team.imageUrl, // Map imageUrl to logo for frontend compatibility
      color: '#dc2626', // Default color since schema doesn't have color field
      description: team.description || '',
      playerCount: team.players.length,
      coachCount: team.staff.length, // Map staff to coaches for frontend compatibility
      availablePlayers: team.players.filter(p => p.availabilityStatus === 'FULLY_AVAILABLE').length,
      unavailablePlayers: team.players.filter(p => p.availabilityStatus !== 'FULLY_AVAILABLE').length,
      upcomingMatches: 0, // TODO: Calculate from actual events
      wins: 0, // TODO: Calculate from actual match results
      losses: 0, // TODO: Calculate from actual match results
      draws: 0, // TODO: Calculate from actual match results
      players: team.players.map(player => ({
        id: player.id,
        firstName: player.name.split(' ')[0] || '',
        lastName: player.name.split(' ').slice(1).join(' ') || '',
        status: player.status
      })),
      coaches: team.staff.map(staff => ({
        coach: {
          id: staff.id,
          firstName: staff.name.split(' ')[0] || '',
          lastName: staff.name.split(' ').slice(1).join(' ') || ''
        }
      })),
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    }))

    return NextResponse.json(transformedTeams)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Team creation request received')
    
    // Prisma handles connection pooling automatically
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const { name, description, color } = body

    if (!name || !name.trim()) {
      console.log('❌ Validation failed: team name is required')
      return NextResponse.json(
        { message: 'Team name is required' },
        { status: 400 }
      )
    }

    console.log('📅 Creating team with data:', {
      name,
      description,
      color
    })

    const team = await prisma.teams.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: null // No image URL field in schema, but keeping for future use
      }
    })

    console.log('✅ Team created successfully:', team.id)

    return NextResponse.json({
      message: 'Team created successfully',
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        imageUrl: team.imageUrl,
        color: color || '#dc2626', // Include color in response for frontend
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      }
    }, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating team:', error)
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json(
      { 
        message: 'Failed to create team', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
