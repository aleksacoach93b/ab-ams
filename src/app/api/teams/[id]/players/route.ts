import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/teams/[id]/players - Assign players to a team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Player assignment request received for team:', params.id)
    
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const { playerIds } = body

    if (!playerIds || !Array.isArray(playerIds)) {
      console.log('❌ Validation failed: playerIds array is required')
      return NextResponse.json(
        { message: 'Player IDs array is required' },
        { status: 400 }
      )
    }

    console.log('📅 Assigning players to team:', {
      teamId: params.id,
      playerIds
    })

    // Update players to assign them to the team
    const updatedPlayers = await prisma.player.updateMany({
      where: {
        id: {
          in: playerIds
        }
      },
      data: {
        teamId: params.id
      }
    })

    console.log('✅ Players assigned successfully:', updatedPlayers.count)

    return NextResponse.json({
      message: `${updatedPlayers.count} players assigned to team`,
      updatedCount: updatedPlayers.count
    })
  } catch (error) {
    console.error('❌ Error assigning players to team:', error)
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json(
      { 
        message: 'Failed to assign players to team', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/teams/[id]/players - Remove players from a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Player removal request received for team:', params.id)
    
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const { playerIds } = body

    if (!playerIds || !Array.isArray(playerIds)) {
      console.log('❌ Validation failed: playerIds array is required')
      return NextResponse.json(
        { message: 'Player IDs array is required' },
        { status: 400 }
      )
    }

    console.log('📅 Removing players from team:', {
      teamId: params.id,
      playerIds
    })

    // Remove players from the team by setting teamId to null
    const updatedPlayers = await prisma.player.updateMany({
      where: {
        id: {
          in: playerIds
        },
        teamId: params.id
      },
      data: {
        teamId: null
      }
    })

    console.log('✅ Players removed successfully:', updatedPlayers.count)

    return NextResponse.json({
      message: `${updatedPlayers.count} players removed from team`,
      updatedCount: updatedPlayers.count
    })
  } catch (error) {
    console.error('❌ Error removing players from team:', error)
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json(
      { 
        message: 'Failed to remove players from team', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
