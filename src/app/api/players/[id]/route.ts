import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { NotificationService } from '@/lib/notificationService'
import { readState, writeState, syncPlayerUserEmail } from '@/lib/localDevStore'

const LOCAL_DEV_MODE = process.env.LOCAL_DEV_MODE === 'true' || !process.env.DATABASE_URL

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { message: 'Player ID is required' },
        { status: 400 }
      )
    }

    // Local dev mode: return data from state
    if (LOCAL_DEV_MODE) {
      const state = await readState()
      
      // Find player in state.players (by ID)
      const statePlayer = state.players.find(p => p.id === id)
      
      if (!statePlayer) {
        return NextResponse.json(
          { message: 'Player not found' },
          { status: 404 }
        )
      }
      
      // Find associated user account
      const playerUser = state.playerUsers.find(u => u.playerId === id)
      
      const nameParts = statePlayer.name.split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      const now = new Date().toISOString()
      
      return NextResponse.json({
        id: statePlayer.id,
        firstName,
        lastName,
        name: statePlayer.name,
        email: statePlayer.email,
        position: statePlayer.position || '',
        status: statePlayer.status || 'FULLY_AVAILABLE',
        availabilityStatus: statePlayer.status || 'FULLY_AVAILABLE',
        matchDayTag: state.playerTags[id] ?? null,
        teamId: 'team-sepsi',
        imageUrl: state.playerAvatars[id] ?? null,
        phone: '',
        dateOfBirth: null,
        nationality: '',
        height: null,
        weight: null,
        preferredFoot: '',
        jerseyNumber: null,
        medicalInfo: null,
        emergencyContact: null,
        team: { id: 'team-sepsi', name: 'Sepsi OSK' },
        user: playerUser ? { 
          id: playerUser.id, 
          email: playerUser.email 
        } : { id: `local-user-${id}`, email: statePlayer.email },
        createdAt: now,
        updatedAt: now
      })
    }

    const player = await prisma.players.findUnique({
      where: { id },
      include: {
        users: true
      }
    })

    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    // Fetch team separately if teamId exists
    let team = null
    if (player.teamId) {
      try {
        const teamData = await prisma.teams.findUnique({
          where: { id: player.teamId }
        })
        if (teamData) {
          team = { id: teamData.id, name: teamData.name }
        }
      } catch (teamError) {
        console.error('Error fetching team:', teamError)
        // Continue without team data
      }
    }

    // Transform player data to match frontend expectations
    const fullName = `${player.firstName} ${player.lastName}`.trim()
    
    return NextResponse.json({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      name: fullName,
      email: player.users?.email || player.email || '',
      position: player.position || '',
      status: player.status,
      availabilityStatus: player.status,
      teamId: player.teamId,
      imageUrl: player.avatar || null,
      avatar: player.avatar || null,
      phone: player.phone || '',
      dateOfBirth: player.dateOfBirth,
      nationality: player.nationality || '',
      height: player.height,
      weight: player.weight,
      preferredFoot: player.preferredFoot || '',
      jerseyNumber: player.jerseyNumber,
      medicalInfo: player.medicalNotes || null,
      emergencyContact: player.emergencyContact || null,
      team: team,
      user: player.users,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt
    })
  } catch (error) {
    console.error('Error fetching player:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { message: 'Player ID is required' },
        { status: 400 }
      )
    }

    const {
      name,
      email,
      password,
      phone,
      dateOfBirth,
      position,
      jerseyNumber,
      status
    } = body

    // Local dev mode: update state file
    if (LOCAL_DEV_MODE) {
      try {
        const state = await readState()
        const now = new Date().toISOString()
        
        // Find player in state
        const playerIndexInState = state.players.findIndex(p => p.id === id)
        
        if (playerIndexInState === -1) {
          return NextResponse.json(
            { message: 'Player not found' },
            { status: 404 }
          )
        }
        
        // Get existing player data to preserve fields
        const existingPlayer = state.players[playerIndexInState]
        
        // Sync player user email and password if changed
        if (email || password) {
          try {
            await syncPlayerUserEmail(id, email || existingPlayer.email || '', name || existingPlayer.name || '', password)
          } catch (syncError) {
            console.error('Error syncing player user email/password:', syncError)
            // Continue even if sync fails
          }
        }
        
        // Find associated playerUser
        const playerUser = state.playerUsers.find(u => u.playerId === id)
        
        // Update player data in state.players
        const updatedPlayer = {
          ...existingPlayer,
          id,
          name: name || existingPlayer.name || '',
          email: email || existingPlayer.email || '',
          position: position !== undefined ? position : existingPlayer.position || '',
          status: status || existingPlayer.status || 'FULLY_AVAILABLE',
          phone: phone !== undefined ? phone : existingPlayer.phone,
          dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : existingPlayer.dateOfBirth,
          height: body.height !== undefined ? body.height : existingPlayer.height,
          weight: body.weight !== undefined ? body.weight : existingPlayer.weight,
          jerseyNumber: jerseyNumber !== undefined ? (jerseyNumber ? parseInt(jerseyNumber) : null) : existingPlayer.jerseyNumber
        }
        
        state.players[playerIndexInState] = updatedPlayer
        await writeState(state)
        
        return NextResponse.json({
          id,
          name: updatedPlayer.name,
          email: updatedPlayer.email,
          phone: updatedPlayer.phone || '',
          dateOfBirth: updatedPlayer.dateOfBirth || null,
          position: updatedPlayer.position || '',
          jerseyNumber: updatedPlayer.jerseyNumber || null,
          height: updatedPlayer.height || null,
          weight: updatedPlayer.weight || null,
          status: updatedPlayer.status || 'FULLY_AVAILABLE',
          availabilityStatus: updatedPlayer.status || 'FULLY_AVAILABLE',
          imageUrl: state.playerAvatars[id] || null,
          teamId: 'team-sepsi',
          team: { id: 'team-sepsi', name: 'Sepsi OSK' },
          user: playerUser ? { 
            id: playerUser.id, 
            email: playerUser.email 
          } : { id: `local-user-${id}`, email: updatedPlayer.email },
          createdAt: existingPlayer.createdAt || now,
          updatedAt: now
        })
      } catch (error) {
        console.error('Error updating player in LOCAL_DEV_MODE:', error)
        return NextResponse.json(
          { message: 'Failed to update player', error: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        )
      }
    }

    // First, get the player to find the associated user
    const existingPlayer = await prisma.players.findUnique({
      where: { id },
      include: { users: true }
    })

    if (!existingPlayer) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    // Update user password if provided
    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return NextResponse.json(
          { message: 'Password must be at least 6 characters long' },
          { status: 400 }
        )
      }

      await prisma.users.update({
        where: { id: existingPlayer.userId },
        data: {
          password: await hashPassword(password),
          updatedAt: new Date()
        }
      })
    }

    // Parse name into firstName and lastName if provided
    let firstName = existingPlayer.firstName
    let lastName = existingPlayer.lastName
    
    if (name) {
      const nameParts = name.split(' ')
      firstName = nameParts[0] || firstName
      lastName = nameParts.slice(1).join(' ') || lastName
    }

    // Update player data
    const player = await prisma.players.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email: email || existingPlayer.email || null,
        phone: phone || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        position: position || null,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
        status: status || existingPlayer.status,
        updatedAt: new Date()
      },
      include: {
        users: true
      }
    })

    // Fetch team separately if teamId exists
    let team = null
    if (player.teamId) {
      try {
        const teamData = await prisma.teams.findUnique({
          where: { id: player.teamId }
        })
        if (teamData) {
          team = { id: teamData.id, name: teamData.name }
        }
      } catch (teamError) {
        console.error('Error fetching team:', teamError)
        // Continue without team data
      }
    }

    // Transform response to match frontend expectations
    const fullName = `${player.firstName} ${player.lastName}`.trim()
    const transformedPlayer = {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      name: fullName,
      email: player.users?.email || player.email || '',
      position: player.position || '',
      status: player.status,
      availabilityStatus: player.status,
      teamId: player.teamId,
      imageUrl: player.avatar || null,
      avatar: player.avatar || null,
      phone: player.phone || '',
      dateOfBirth: player.dateOfBirth,
      nationality: player.nationality || '',
      height: player.height,
      weight: player.weight,
      preferredFoot: player.preferredFoot || '',
      jerseyNumber: player.jerseyNumber,
      medicalInfo: player.medicalNotes || null,
      emergencyContact: player.emergencyContact || null,
      team: team,
      user: player.users,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt
    }

    // Create notification if status changed
    if (status && status !== existingPlayer.status) {
      try {
        await NotificationService.notifyPlayerStatusChanged(
          id,
          fullName,
          status
        )
      } catch (notificationError) {
        console.error('Error creating player status notification:', notificationError)
        // Don't fail the update if notification fails
      }
    }

    return NextResponse.json(transformedPlayer)
  } catch (error) {
    console.error('Error updating player:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playerId } = await params

    console.log('🗑️ Attempting to delete player:', playerId)

    if (!playerId) {
      console.log('❌ No player ID provided')
      return NextResponse.json(
        { message: 'Player ID is required' },
        { status: 400 }
      )
    }

    // Local dev mode: delete from state
    if (LOCAL_DEV_MODE) {
      try {
        const state = await readState()
        
        // Remove player from state.players
        state.players = state.players.filter(p => p.id !== playerId)
        
        // Remove player user from state.playerUsers
        if (state.playerUsers) {
          state.playerUsers = state.playerUsers.filter(u => u.playerId !== playerId)
        }
        
        // Remove player avatar
        if (state.playerAvatars) {
          delete state.playerAvatars[playerId]
        }
        
        // Remove player media files
        if (state.playerMediaFiles) {
          delete state.playerMediaFiles[playerId]
        }
        
        // Remove player notes
        if (state.playerNotes) {
          delete state.playerNotes[playerId]
        }
        
        // Remove player tag
        if (state.playerTags) {
          delete state.playerTags[playerId]
        }
        
        // Remove player from events (remove from participants)
        if (state.events) {
          state.events = state.events.map(event => ({
            ...event,
            participants: event.participants.filter(p => p.playerId !== playerId)
          }))
        }
        
        // Remove player report folders for this player
        if (state.playerReportFolders) {
          // Delete all folders for this player (folders are stored by parentId, so we need to find all)
          const folderKeys = Object.keys(state.playerReportFolders)
          for (const key of folderKeys) {
            state.playerReportFolders[key] = state.playerReportFolders[key].filter(
              folder => folder.createdBy !== playerId
            )
          }
        }
        
        await writeState(state)
        
        console.log('🎉 Successfully deleted player from local state:', playerId)
        
        return NextResponse.json(
          { message: 'Player deleted successfully' },
          { status: 200 }
        )
      } catch (error) {
        console.error('💥 Error deleting player in LOCAL_DEV_MODE:', error)
        return NextResponse.json(
          { 
            message: 'Failed to delete player', 
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }

    // First check if player exists using Prisma
    const player = await prisma.players.findUnique({
      where: { id: playerId },
      include: { users: true }
    })

    if (!player) {
      console.log('❌ Player not found:', playerId)
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    console.log('✅ Found player:', player.name, 'User ID:', player.userId)

    // Delete related records first (due to foreign key constraints)
    try {
      // Delete player media files
      await prisma.player_media.deleteMany({
        where: { playerId }
      })
      console.log('✅ Deleted player media files')

      // Delete player notes
      await prisma.player_notes.deleteMany({
        where: { playerId }
      })
      console.log('✅ Deleted player notes')

      // Delete event participants
      await prisma.event_participants.deleteMany({
        where: { playerId }
      })
      console.log('✅ Deleted event participants')
    } catch (relatedError) {
      console.log('⚠️ Warning: Some related records could not be deleted:', relatedError)
      // Continue with player deletion even if some related records fail
    }

    // Delete the player record
    await prisma.players.delete({
      where: { id: playerId }
    })
    console.log('✅ Deleted player record')

    // Delete the associated user record if it exists
    if (player.userId) {
      await prisma.users.delete({
        where: { id: player.userId }
      })
      console.log('✅ Deleted user record')
    }

    console.log('🎉 Successfully deleted player:', playerId)

    return NextResponse.json(
      { message: 'Player deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('💥 Error deleting player:', error)
    console.error('💥 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json(
      { 
        message: 'Failed to delete player', 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No details available'
      },
      { status: 500 }
    )
  }
}
